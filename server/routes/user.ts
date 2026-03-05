import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.ts';
import { verifyAccessToken } from '../../src/lib/auth.ts';
import { normalizePhone, usernameSchema, isValidEgyptianPhone } from '../../src/lib/validations.ts';
import { AuthRequest } from './types';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = Router();

// Middleware to verify JWT
const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token) as { sub: string };
    req.userId = decoded.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get profile
router.get('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        createdAt: true,
        email: true,
        phone: true,
        fullName: true,
        username: true,
        avatarUrl: true,
        riskTolerance: true,
        investmentHorizon: true,
        monthlyBudget: true,
        shariaMode: true,
        islamicMode: true,
        onboardingCompleted: true,
        isFirstLogin: true,
        interestedSectors: true,
        twoFactorEnabled: true,
        language: true,
        theme: true,
        subscriptionPlan: true,
        subscriptionEndsAt: true,
        hearAboutUs: true,
        investorProfile: true,
      }
    });
    
    const responseUser = user && typeof user.interestedSectors === 'string'
      ? {
          ...user,
          interestedSectors: (() => {
            try {
              return JSON.parse(user.interestedSectors as string);
            } catch {
              return [];
            }
          })(),
        }
      : user;
    
    res.json(responseUser);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update profile
router.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      fullName,
      phone: rawPhone,
      username: rawUsername,
      riskTolerance,
      investmentHorizon,
      monthlyBudget,
      shariaMode,
      islamicMode,
      onboardingCompleted,
      interestedSectors,
      twoFactorEnabled,
      language,
      theme,
      notifySignals,
      notifyPortfolio,
      notifyNews,
      hearAboutUs,
      investorProfile,
      isFirstLogin,
    } = req.body;

    const data: Record<string, unknown> = {
      fullName,
      riskTolerance,
      investmentHorizon,
      monthlyBudget,
      shariaMode,
      islamicMode,
      onboardingCompleted,
      isFirstLogin,
      interestedSectors: Array.isArray(interestedSectors) ? JSON.stringify(interestedSectors) : interestedSectors,
      twoFactorEnabled,
      language,
      theme,
      notifySignals,
      notifyPortfolio,
      notifyNews,
      hearAboutUs,
      investorProfile,
    };

    if (rawPhone !== undefined) {
      const trimmed = typeof rawPhone === 'string' ? rawPhone.trim() : '';
      if (!trimmed) {
        data.phone = null;
      } else {
        const digitsOnly = trimmed.replace(/\D/g, '');
        if (!isValidEgyptianPhone(digitsOnly)) {
          return res.status(400).json({
            error: 'invalid_phone',
            message: 'رقم الموبايل غير صحيح',
          });
        }

        const normalized = normalizePhone(digitsOnly);
        const existingPhoneUser = await prisma.user.findFirst({
          where: {
            phone: normalized,
            id: { not: req.userId },
          },
        });
        if (existingPhoneUser) {
          return res.status(400).json({ error: 'Phone number already used' });
        }
        data.phone = normalized;
      }
    }

    if (rawUsername !== undefined) {
      const trimmed = typeof rawUsername === 'string' ? rawUsername.trim() : '';
      if (!trimmed) {
        data.username = null;
      } else {
        const username = usernameSchema.parse(trimmed);

        const current = await prisma.user.findUnique({
          where: { id: req.userId },
          select: {
            username: true,
            lastUsernameChangeAt: true,
            usernameChangeCount: true,
          },
        });

        if (!current) {
          return res.status(404).json({ error: 'User not found' });
        }

        if (current.username !== username) {
          const existing = await prisma.user.findFirst({
            where: { username, id: { not: req.userId } },
          });
          if (existing) {
            return res.status(400).json({ error: 'Username already taken' });
          }

          const now = new Date();
          const changeCount = current.usernameChangeCount ?? 0;

          if (changeCount >= 1 && current.lastUsernameChangeAt) {
            const diffMs = now.getTime() - current.lastUsernameChangeAt.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays < 7) {
              const remaining = 7 - diffDays;
              return res.status(400).json({
                error: `يمكنك تغيير اسم المستخدم مرة أخرى بعد ${remaining} يوم`,
              });
            }
          }

          data.username = username;
          data.lastUsernameChangeAt = now;
          data.usernameChangeCount = (current.usernameChangeCount ?? 0) + 1;
        }
      }
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
    });

    const responseUser = {
      ...user,
      interestedSectors: typeof user.interestedSectors === 'string' ? JSON.parse(user.interestedSectors) : user.interestedSectors,
    };

    res.json(responseUser);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Check username availability for real-time validation
router.get('/username/check', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const raw = (req.query.username ?? '') as string;
    const trimmed = raw.trim();

    if (!trimmed) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const username = usernameSchema.parse(trimmed);

    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { username: true },
    });

    if (currentUser?.username === username) {
      return res.json({ available: true });
    }

    const existing = await prisma.user.findFirst({
      where: {
        username,
        id: { not: req.userId },
      },
    });

    res.json({ available: !existing });
  } catch (err) {
    console.error('Username check error:', err);
    res.status(400).json({ error: 'Invalid username format' });
  }
});

// Profile statistics (analyses, portfolio, watchlist, usage days)
router.get('/profile/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const [user, analysesCount, watchlistCount, portfolioHoldings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      }),
      prisma.analysis.count({ where: { userId } }),
      prisma.watchlist.count({ where: { userId } }),
      prisma.portfolio.findMany({ where: { userId } }),
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = new Date();
    const daysSinceJoined = Math.max(
      1,
      Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const portfolioValue = portfolioHoldings.reduce(
      (sum, holding) => sum + holding.shares * holding.avgPrice,
      0,
    );

    const portfolioCount = portfolioHoldings.length;

    res.json({
      analysesCount,
      watchlistCount,
      portfolioCount,
      portfolioValue,
      daysSinceJoined,
    });
  } catch (err) {
    console.error('Profile stats error:', err);
    res.status(500).json({ error: 'Failed to load profile stats' });
  }
});

// Dynamic achievements based on user activity
router.get('/achievements', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const [
      firstAnalysis,
      analysesCount,
      firstWatchlist,
      watchlistCount,
      firstPortfolio,
      portfolioCount,
      firstGoal,
      goalsCount,
    ] = await Promise.all([
      prisma.analysis.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.analysis.count({ where: { userId } }),
      prisma.watchlist.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.watchlist.count({ where: { userId } }),
      prisma.portfolio.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.portfolio.count({ where: { userId } }),
      prisma.goal.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.goal.count({ where: { userId } }),
    ]);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        createdAt: true,
        subscriptionPlan: true,
        subscriptionEndsAt: true,
      },
    });

    const completedReferrals = await prisma.referral.count({
      where: { referrerId: userId, status: 'completed' },
    });

    const now = new Date();
    const accountAgeDays = user ? Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const achievements = [
      // مستوى البداية
      {
        id: 'first-step',
        level: 'beginner',
        title: 'الخطوة الأولى',
        icon: '🟣',
        description: 'أنشأت حسابك على EGX Pro',
        conditionDescription: 'قم بإنشاء حسابك وابدأ استخدام التطبيق.',
        completed: Boolean(user),
        date: user?.createdAt ?? null,
      },
      {
        id: 'first-analysis',
        level: 'beginner',
        title: 'المحلل الصغير',
        icon: '📈',
        description: 'عملت أول تحليل بالذكاء الاصطناعي.',
        conditionDescription: 'قم بعمل أول تحليل AI لأي سهم.',
        completed: analysesCount > 0,
        date: firstAnalysis?.createdAt ?? null,
      },
      {
        id: 'first-watchlist',
        level: 'beginner',
        title: 'المراقب',
        icon: '👀',
        description: 'أضفت أول سهم إلى قائمة المراقبة.',
        conditionDescription: 'أضف أي سهم إلى قائمة المراقبة الخاصة بك.',
        completed: watchlistCount > 0,
        date: firstWatchlist?.createdAt ?? null,
      },
      {
        id: 'first-portfolio',
        level: 'beginner',
        title: 'المستثمر',
        icon: '💼',
        description: 'أضفت أول سهم إلى محفظتك.',
        conditionDescription: 'أضف أول سهم إلى محفظة استثماراتك.',
        completed: portfolioCount > 0,
        date: firstPortfolio?.createdAt ?? null,
      },
      {
        id: 'first-goal',
        level: 'beginner',
        title: 'الحالم',
        icon: '💡',
        description: 'حددت أول هدف مالي.',
        conditionDescription: 'قم بإضافة هدف مالي واحد على الأقل.',
        completed: goalsCount > 0,
        date: firstGoal?.createdAt ?? null,
      },
      {
        id: 'profile-complete',
        level: 'beginner',
        title: 'المكتمل',
        icon: '✅',
        description: 'أكملت ملفك الشخصي بنسبة 100%.',
        conditionDescription: 'أكمل جميع بيانات البروفايل المطلوبة (الاسم، الهاتف، username، هدف مالي، سهم في الـ Watchlist).',
        completed: false,
        date: null,
      },
      // مستوى النمو
      {
        id: 'active-analyst',
        level: 'growth',
        title: 'محلل نشط',
        icon: '📊',
        description: 'أجريت 10 تحليلات AI.',
        conditionDescription: 'قم بعمل 10 تحليلات AI مختلفة.',
        completed: analysesCount >= 10,
        date: analysesCount >= 10 ? firstAnalysis?.createdAt ?? null : null,
        progress: Math.min(analysesCount, 10),
        target: 10,
      },
      {
        id: 'diversified-portfolio',
        level: 'growth',
        title: 'محفظة متنوعة',
        icon: '📚',
        description: 'عندك 5 أسهم مختلفة في المحفظة.',
        conditionDescription: 'أضف 5 أسهم مختلفة إلى محفظتك.',
        completed: portfolioCount >= 5,
        date: portfolioCount >= 5 ? firstPortfolio?.createdAt ?? null : null,
        progress: Math.min(portfolioCount, 5),
        target: 5,
      },
      {
        id: 'long-watchlist',
        level: 'growth',
        title: 'قائمة طويلة',
        icon: '📝',
        description: 'عندك 10 أسهم في قائمة المراقبة.',
        conditionDescription: 'أضف 10 أسهم مختلفة إلى قائمة المراقبة.',
        completed: watchlistCount >= 10,
        date: watchlistCount >= 10 ? firstWatchlist?.createdAt ?? null : null,
        progress: Math.min(watchlistCount, 10),
        target: 10,
      },
      {
        id: 'pro-planner',
        level: 'growth',
        title: 'مخطط محترف',
        icon: '📆',
        description: 'عندك 3 أهداف مالية نشطة.',
        conditionDescription: 'أضف 3 أهداف مالية أو أكثر.',
        completed: goalsCount >= 3,
        date: goalsCount >= 3 ? firstGoal?.createdAt ?? null : null,
        progress: Math.min(goalsCount, 3),
        target: 3,
      },
      {
        id: 'week-streak',
        level: 'growth',
        title: 'أسبوع متواصل',
        icon: '🗓️',
        description: 'دخلت التطبيق 7 أيام متتالية.',
        conditionDescription: 'قم باستخدام التطبيق 7 أيام متواصلة.',
        completed: false,
        date: null,
        progress: 0,
        target: 7,
      },
      // مستوى الاحتراف
      {
        id: 'expert-analyst',
        level: 'pro',
        title: 'محلل خبير',
        icon: '⭐',
        description: 'أجريت 50 تحليل.',
        conditionDescription: 'قم بعمل 50 تحليل AI.',
        completed: analysesCount >= 50,
        date: analysesCount >= 50 ? firstAnalysis?.createdAt ?? null : null,
        progress: Math.min(analysesCount, 50),
        target: 50,
      },
      {
        id: 'big-portfolio',
        level: 'pro',
        title: 'المحفظة الكبيرة',
        icon: '💰',
        description: 'عندك 10 أسهم في المحفظة.',
        conditionDescription: 'أضف 10 أسهم أو أكثر إلى محفظتك.',
        completed: portfolioCount >= 10,
        date: portfolioCount >= 10 ? firstPortfolio?.createdAt ?? null : null,
        progress: Math.min(portfolioCount, 10),
        target: 10,
      },
      {
        id: 'goal-achieved',
        level: 'pro',
        title: 'هدف محقق',
        icon: '🎯',
        description: 'أتممت هدف مالي واحد على الأقل.',
        conditionDescription: 'قم بوضع علامة إتمام على أي هدف مالي في الأهداف.',
        completed: false,
        date: null,
      },
      {
        id: 'egx-ambassador',
        level: 'pro',
        title: 'سفير EGX Pro',
        icon: '🤝',
        description: 'دعوت 5 أصدقاء بنجاح.',
        conditionDescription: 'استخدم كود الدعوة الخاص بك لدعوة 5 مستخدمين يكملوا تسجيلهم.',
        completed: completedReferrals >= 5,
        date: completedReferrals >= 5 ? now : null,
        progress: Math.min(completedReferrals, 5),
        target: 5,
      },
      {
        id: 'pro-subscriber',
        level: 'pro',
        title: 'مشترك Pro',
        icon: '🔑',
        description: 'اشتركت في خطة Pro أو سنوي.',
        conditionDescription: 'قم بالترقية من الخطة المجانية إلى Pro أو السنوي.',
        completed: user ? user.subscriptionPlan === 'pro' || user.subscriptionPlan === 'annual' : false,
        date: user?.subscriptionEndsAt ?? null,
      },
      {
        id: 'month-active',
        level: 'pro',
        title: 'شهر كامل',
        icon: '📅',
        description: 'استخدمت التطبيق لمدة 30 يوم.',
        conditionDescription: 'استخدم التطبيق بانتظام حتى يصل عدد أيام الاستخدام إلى 30 يوم.',
        completed: accountAgeDays >= 30,
        date: accountAgeDays >= 30 ? now : null,
        progress: Math.min(accountAgeDays, 30),
        target: 30,
      },
      // مستوى الأسطورة
      {
        id: 'legend-analyst',
        level: 'legend',
        title: 'المحلل الأسطوري',
        icon: '🏆',
        description: 'أجريت 100 تحليل.',
        conditionDescription: 'قم بعمل 100 تحليل AI أو أكثر.',
        completed: analysesCount >= 100,
        date: analysesCount >= 100 ? now : null,
        progress: Math.min(analysesCount, 100),
        target: 100,
      },
      {
        id: 'kings-portfolio',
        level: 'legend',
        title: 'محفظة الملوك',
        icon: '👑',
        description: 'عندك 20 سهم في المحفظة.',
        conditionDescription: 'ابنِ محفظة قوية تحتوي على 20 سهم أو أكثر.',
        completed: portfolioCount >= 20,
        date: portfolioCount >= 20 ? now : null,
        progress: Math.min(portfolioCount, 20),
        target: 20,
      },
      {
        id: 'year-account',
        level: 'legend',
        title: 'سنة كاملة',
        icon: '📆',
        description: 'حسابك بقاله سنة كاملة.',
        conditionDescription: 'استخدم التطبيق لمدة سنة أو أكثر.',
        completed: accountAgeDays >= 365,
        date: accountAgeDays >= 365 ? now : null,
        progress: Math.min(accountAgeDays, 365),
        target: 365,
      },
      {
        id: 'mega-referrer',
        level: 'legend',
        title: 'الداعية الكبير',
        icon: '🌍',
        description: 'دعوت 20 شخص بنجاح.',
        conditionDescription: 'ادعُ 20 مستخدم جديد باستخدام كود الدعوة الخاص بك.',
        completed: completedReferrals >= 20,
        date: completedReferrals >= 20 ? now : null,
        progress: Math.min(completedReferrals, 20),
        target: 20,
      },
    ];

    res.json(achievements);
  } catch (err) {
    console.error('Achievements error:', err);
    res.status(500).json({ error: 'Failed to load achievements' });
  }
});

// Referral summary for profile
router.get('/referral', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        freeReferralRewarded: true,
        totalReferrals: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.referralCode) {
      const referralCode = `EGX-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      user = await prisma.user.update({
        where: { id: userId },
        data: { referralCode },
        select: {
          referralCode: true,
          freeReferralRewarded: true,
        },
      });
    }

    const [completedCount, completedReferrals, weeklyJoinedCount] = await Promise.all([
      prisma.referral.count({
        where: { referrerId: userId, status: 'completed' },
      }),
      prisma.referral.findMany({
        where: { referrerId: userId, status: 'completed' },
        orderBy: { createdAt: 'asc' },
        take: 5,
        include: {
          referredUser: {
            select: {
              fullName: true,
              createdAt: true,
            },
          },
        },
      }),
      (async () => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return prisma.referral.count({
          where: {
            referrerId: userId,
            status: 'completed',
            referredUser: {
              createdAt: {
                gte: weekAgo,
              },
            },
          },
        });
      })(),
    ]);

    const friends = completedReferrals.map((ref, index) => ({
      id: ref.referredUserId,
      name: ref.referredUser?.fullName ?? null,
      order: index + 1,
    }));

    res.json({
      code: user.referralCode,
      completedCount,
      goal: 5,
      rewardClaimed: user.freeReferralRewarded,
      totalReferrals: user.totalReferrals ?? completedCount,
      friends,
      weeklyJoinedCount,
    });
  } catch (err) {
    console.error('Referral summary error:', err);
    res.status(500).json({ error: 'Failed to load referral data' });
  }
});

// Redeem referral reward (free Pro month after 5 successful referrals)
router.post('/referral/redeem', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        freeReferralRewarded: true,
        subscriptionPlan: true,
        subscriptionEndsAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.freeReferralRewarded) {
      return res.status(400).json({ error: 'Reward already claimed' });
    }

    const completedCount = await prisma.referral.count({
      where: { referrerId: req.userId!, status: 'completed' },
    });

    if (completedCount < 5) {
      return res.status(400).json({ error: 'Not enough referrals yet' });
    }

    const now = new Date();
    let startsFrom = now;
    if (user.subscriptionEndsAt && user.subscriptionEndsAt > now) {
      startsFrom = user.subscriptionEndsAt;
    }

    const newEndsAt = new Date(startsFrom);
    newEndsAt.setMonth(newEndsAt.getMonth() + 1);

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        subscriptionPlan: 'pro',
        subscriptionEndsAt: newEndsAt,
        freeReferralRewarded: true,
      },
      select: {
        subscriptionPlan: true,
        subscriptionEndsAt: true,
        freeReferralRewarded: true,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('Referral redeem error:', err);
    res.status(500).json({ error: 'Failed to redeem referral reward' });
  }
});

// Apply referral code during onboarding
router.post('/referral/use', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body as { code?: string };
    const trimmed = (code || '').trim().toUpperCase();

    if (!trimmed) {
      return res.status(400).json({ error: 'Referral code is required' });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        referralUsed: true,
      },
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (currentUser.referralUsed) {
      return res.status(400).json({ error: 'Referral code already used' });
    }

    const referrer = await prisma.user.findFirst({
      where: { referralCode: trimmed },
      select: { id: true, fullName: true },
    });

    if (!referrer) {
      return res.status(400).json({ error: 'Invalid referral code' });
    }

    if (referrer.id === currentUser.id) {
      return res.status(400).json({ error: 'You cannot use your own referral code' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: currentUser.id },
        data: {
          referredBy: referrer.id,
          referralUsed: trimmed,
        },
      });

      await tx.referral.create({
        data: {
          referrerId: referrer.id,
          referredUserId: currentUser.id,
          status: 'completed',
        },
      });

      const referrerUser = await tx.user.findUnique({
        where: { id: referrer.id },
        select: {
          totalReferrals: true,
          referralProDaysRemaining: true,
          referralProExpiresAt: true,
        },
      });

      if (!referrerUser) return;

      const now = new Date();
      const previousTotal = referrerUser.totalReferrals ?? 0;
      const totalReferrals = previousTotal + 1;

      let referralProDaysRemaining = referrerUser.referralProDaysRemaining ?? 0;
      let referralProExpiresAt = referrerUser.referralProExpiresAt ?? null;

      // Every 5 completed referrals = +30 days Pro
      if (totalReferrals % 5 === 0) {
        referralProDaysRemaining += 30;

        const baseDate =
          referralProExpiresAt && referralProExpiresAt > now ? referralProExpiresAt : now;
        const extended = new Date(baseDate);
        extended.setDate(extended.getDate() + 30);
        referralProExpiresAt = extended;
      }

      await tx.user.update({
        where: { id: referrer.id },
        data: {
          totalReferrals,
          referralProDaysRemaining,
          referralProExpiresAt,
        },
      });
    });

    res.json({
      success: true,
      referrerName: referrer.fullName || 'صاحب الدعوة',
    });
  } catch (err) {
    console.error('Referral use error:', err);
    res.status(500).json({ error: 'Failed to apply referral code' });
  }
});

// 2FA Setup
router.post('/2fa/setup', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `EGX Pro (${req.userId})`,
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || '');

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
    });
  } catch (err) {
    console.error('2FA setup error:', err);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

// 2FA Verify and Enable
router.post('/2fa/verify', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { token, secret } = req.body;

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
    });

    if (verified) {
      await prisma.user.update({
        where: { id: req.userId },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: secret,
        },
      });
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid token' });
    }
  } catch (err) {
    console.error('2FA verify error:', err);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

// 2FA Disable
router.post('/2fa/disable', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('2FA disable error:', err);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// Security overview (password & 2FA)
router.get('/security', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        lastPasswordChangeAt: true,
        twoFactorEnabled: true,
        createdAt: true,
        lastLoginAt: true,
        lastLoginIp: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      lastPasswordChangeAt: user.lastPasswordChangeAt,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp,
    });
  } catch (err) {
    console.error('Security info error:', err);
    res.status(500).json({ error: 'Failed to load security info' });
  }
});

// Active sessions list
router.get('/sessions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.userId! },
      orderBy: { lastUsedAt: 'desc' },
    });

    res.json(
      sessions.map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt,
        expiresAt: s.expiresAt,
        ip: s.ip,
        userAgent: s.userAgent,
      }))
    );
  } catch (err) {
    console.error('Sessions list error:', err);
    res.status(500).json({ error: 'Failed to load sessions' });
  }
});

// End a specific session
router.delete('/sessions/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.session.deleteMany({
      where: { id, userId: req.userId! },
    });
    res.status(204).send();
  } catch (err) {
    console.error('End session error:', err);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Upload / update avatar (expects base64 data URL string in body.image)
router.post('/avatar', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { image } = req.body as { image?: string };
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Image is required' });
    }

    const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const ext = mimeType.split('/')[1] || 'png';
    const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${req.userId}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/avatars/${filename}`;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { avatarUrl: publicUrl },
      select: {
        id: true,
        avatarUrl: true,
      },
    });

    res.json({ avatarUrl: user.avatarUrl });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Delete account
router.delete('/account', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const deletionDate = new Date(now);
    deletionDate.setDate(deletionDate.getDate() + 30);

    await prisma.user.update({
      where: { id: req.userId },
      data: {
        isDeleted: true,
        deletedAt: now,
        deletionScheduledFor: deletionDate,
      },
    });

    await prisma.session.deleteMany({
      where: { userId: req.userId! },
    });

    res.status(200).json({
      success: true,
      deletedAt: now,
      deletionScheduledFor: deletionDate,
    });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
