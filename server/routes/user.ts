import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.ts';
import { verifyAccessToken } from '../../src/lib/auth.ts';
import { normalizePhone, usernameSchema, isValidEgyptianPhone } from '../../src/lib/validations.ts';
import { AuthRequest } from './types';
import { auditLog } from '../lib/audit.ts';
import { ACHIEVEMENT_DEFS, type AchievementLevel } from '../lib/achievements.ts';
import { getCompletedAchievementIds, addNewlyUnlockedAchievements } from '../lib/achievementCheck.ts';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = Router();

// Middleware to verify JWT and reject deleted accounts
const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token) as { sub: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, isDeleted: true },
    });
    if (!user || user.isDeleted) return res.status(401).json({ error: 'unauthorized' });
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
        userTitle: true,
        lastPasswordChangeAt: true,
        lastUsernameChangeAt: true,
        twoFactorEnabled: true,
        notifySignals: true,
        notifyPortfolio: true,
        notifyNews: true,
        notifyAchievements: true,
        notifyGoals: true,
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
      email: rawEmail,
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
      notifyAchievements,
      notifyGoals,
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
      notifyAchievements,
      notifyGoals,
      hearAboutUs,
      investorProfile,
    };

    if (rawEmail !== undefined) {
      const trimmed = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
      if (!trimmed) {
        data.email = null;
      } else {
        const existing = await prisma.user.findFirst({
          where: { email: trimmed, id: { not: req.userId } },
        });
        if (existing) {
          return res.status(400).json({ error: 'Email already used' });
        }
        data.email = trimmed;
      }
    }

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

    const before = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { phone: true, email: true },
    });

    const completedBefore = await getCompletedAchievementIds(req.userId!);
    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
    });

    if (before && data.phone !== undefined && String(before.phone ?? '') !== String(data.phone ?? '')) {
      await auditLog({ userId: req.userId ?? undefined, action: 'PHONE_CHANGED', req, result: 'success' });
    }
    if (before && data.email !== undefined && String(before.email ?? '') !== String(data.email ?? '')) {
      await auditLog({ userId: req.userId ?? undefined, action: 'EMAIL_CHANGED', req, result: 'success' });
    }

    await addNewlyUnlockedAchievements(req.userId!, completedBefore);

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

// قائمة الإنجازات غير المشاهدة (اسم + وصف) للكروت
router.get('/unseen-achievements', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { unseenAchievements: true },
    });
    const ids = user?.unseenAchievements ?? [];
    const list = ids
      .map((id) => {
        const def = ACHIEVEMENT_DEFS.find((d) => d.id === id);
        if (!def) return null;
        return { id: def.id, title: def.title, shortDescription: def.shortDescription };
      })
      .filter(Boolean);
    res.json(list);
  } catch (err) {
    console.error('Unseen achievements error:', err);
    res.status(500).json({ error: 'Failed to load unseen achievements' });
  }
});

// تعليم الإنجازات كمشاهدة (عند فتح صفحة الإنجازات)
router.post('/mark-achievements-seen', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.userId! },
      data: { unseenAchievements: [] },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Mark achievements seen error:', err);
    res.status(500).json({ error: 'Failed to mark as seen' });
  }
});

// Dynamic achievements — 40 إنجاز من ACHIEVEMENT_DEFS + تحديث userTitle
router.get('/achievements', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const now = new Date();

    const [
      user,
      firstAnalysis,
      analysesCount,
      watchlistCount,
      firstWatchlist,
      portfolioCount,
      firstPortfolio,
      goalsCount,
      firstGoal,
      achievedGoalsCount,
      completedReferrals,
      distinctTickersResult,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          createdAt: true,
          fullName: true,
          phone: true,
          username: true,
          onboardingCompleted: true,
          loginStreak: true,
          totalReferrals: true,
          subscriptionPlan: true,
          subscriptionEndsAt: true,
        },
      }),
      prisma.analysis.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      prisma.analysis.count({ where: { userId } }),
      prisma.watchlist.count({ where: { userId } }),
      prisma.watchlist.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      prisma.portfolio.count({ where: { userId } }),
      prisma.portfolio.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      prisma.goal.count({ where: { userId } }),
      prisma.goal.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      prisma.goal.count({ where: { userId, achievedAt: { not: null } } }),
      prisma.referral.count({ where: { referrerId: userId, status: 'completed' } }),
      prisma.analysis.groupBy({ by: ['ticker'], where: { userId } }),
    ]);

    const accountAgeDays = user ? Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const distinctTickers = distinctTickersResult?.length ?? 0;
    const profileComplete = Boolean(
      user?.fullName?.trim() && user?.phone?.trim() && user?.username?.trim() && goalsCount >= 1 && watchlistCount >= 1
    );

    type Level = 'beginner' | 'growth' | 'pro' | 'legend';
    const completedByLevel: Record<Level, number> = { beginner: 0, growth: 0, pro: 0, legend: 0 };

    const build = (def: (typeof ACHIEVEMENT_DEFS)[0]): {
      id: string;
      level: string;
      title: string;
      shortDescription: string;
      longDescription: string;
      route: string | null;
      completed: boolean;
      date: Date | null;
      progress?: number;
      target?: number;
    } => {
      let completed = false;
      let date: Date | null = null;
      let progress: number | undefined;
      let target: number | undefined;

      switch (def.id) {
        case 'first-step':
          completed = Boolean(user);
          date = user?.createdAt ?? null;
          break;
        case 'know-yourself':
          completed = user?.onboardingCompleted ?? false;
          date = user?.createdAt ?? null;
          break;
        case 'profile-complete':
          completed = profileComplete;
          date = profileComplete ? now : null;
          break;
        case 'first-look':
          completed = analysesCount >= 1;
          date = firstAnalysis?.createdAt ?? null;
          break;
        case 'watcher':
          completed = watchlistCount >= 1;
          date = firstWatchlist?.createdAt ?? null;
          break;
        case 'investor':
          completed = portfolioCount >= 1;
          date = firstPortfolio?.createdAt ?? null;
          break;
        case 'dreamer':
          completed = goalsCount >= 1;
          date = firstGoal?.createdAt ?? null;
          break;
        case 'first-referrer':
          completed = completedReferrals >= 1;
          date = completedReferrals >= 1 ? now : null;
          break;
        case 'subscriber':
          completed = user?.subscriptionPlan === 'pro' || user?.subscriptionPlan === 'annual' || false;
          date = user?.subscriptionEndsAt ?? null;
          break;
        case 'week-with-us':
          target = 7;
          progress = Math.min(user?.loginStreak ?? 0, 7);
          completed = (user?.loginStreak ?? 0) >= 7;
          date = completed ? now : null;
          break;
        case 'active-analyst':
          target = 10;
          progress = Math.min(analysesCount, 10);
          completed = analysesCount >= 10;
          date = completed ? firstAnalysis?.createdAt ?? null : null;
          break;
        case 'wealth-builder':
          target = 5;
          progress = Math.min(portfolioCount, 5);
          completed = portfolioCount >= 5;
          date = completed ? firstPortfolio?.createdAt ?? null : null;
          break;
        case 'long-list':
          target = 10;
          progress = Math.min(watchlistCount, 10);
          completed = watchlistCount >= 10;
          date = completed ? firstWatchlist?.createdAt ?? null : null;
          break;
        case 'planner':
          target = 3;
          progress = Math.min(goalsCount, 3);
          completed = goalsCount >= 3;
          date = completed ? firstGoal?.createdAt ?? null : null;
          break;
        case 'loyal':
          target = 30;
          progress = Math.min(Math.max(user?.loginStreak ?? 0, accountAgeDays), 30);
          completed = (user?.loginStreak ?? 0) >= 30 || accountAgeDays >= 30;
          date = completed ? now : null;
          break;
        case 'network':
          target = 5;
          progress = Math.min(completedReferrals, 5);
          completed = completedReferrals >= 5;
          date = completed ? now : null;
          break;
        case 'diversified':
          target = 3;
          progress = Math.min(portfolioCount, 3);
          completed = portfolioCount >= 3;
          date = completed ? firstPortfolio?.createdAt ?? null : null;
          break;
        case 'decision-maker':
          target = 25;
          progress = Math.min(analysesCount, 25);
          completed = analysesCount >= 25;
          date = completed ? firstAnalysis?.createdAt ?? null : null;
          break;
        case 'first-goal-achieved':
          completed = achievedGoalsCount >= 1;
          date = achievedGoalsCount >= 1 ? now : null;
          break;
        case 'devoted':
          target = 90;
          progress = Math.min(accountAgeDays, 90);
          completed = accountAgeDays >= 90;
          date = completed ? now : null;
          break;
        case 'expert-analyst':
          target = 50;
          progress = Math.min(analysesCount, 50);
          completed = analysesCount >= 50;
          date = completed ? firstAnalysis?.createdAt ?? null : null;
          break;
        case 'diverse-portfolio':
          target = 5;
          progress = Math.min(portfolioCount, 5);
          completed = portfolioCount >= 5;
          date = completed ? firstPortfolio?.createdAt ?? null : null;
          break;
        case 'strategist':
          target = 5;
          progress = Math.min(achievedGoalsCount, 5);
          completed = achievedGoalsCount >= 5;
          date = completed ? now : null;
          break;
        case 'egx-ambassador':
          target = 20;
          progress = Math.min(completedReferrals, 20);
          completed = completedReferrals >= 20;
          date = completed ? now : null;
          break;
        case 'big-portfolio':
          target = 15;
          progress = Math.min(portfolioCount, 15);
          completed = portfolioCount >= 15;
          date = completed ? firstPortfolio?.createdAt ?? null : null;
          break;
        case 'patient':
          target = 180;
          progress = Math.min(accountAgeDays, 180);
          completed = accountAgeDays >= 180;
          date = completed ? now : null;
          break;
        case 'daily-follower':
          target = 100;
          progress = Math.min(Math.max(user?.loginStreak ?? 0, accountAgeDays), 100);
          completed = (user?.loginStreak ?? 0) >= 100 || accountAgeDays >= 100;
          date = completed ? now : null;
          break;
        case 'researcher':
          target = 10;
          progress = Math.min(distinctTickers, 10);
          completed = distinctTickers >= 10;
          date = completed ? firstAnalysis?.createdAt ?? null : null;
          break;
        case 'annual-subscriber':
          completed = user?.subscriptionPlan === 'annual' ?? false;
          date = user?.subscriptionEndsAt ?? null;
          break;
        case 'leader':
          target = 60;
          progress = Math.min(user?.loginStreak ?? 0, 60);
          completed = (user?.loginStreak ?? 0) >= 60;
          date = completed ? now : null;
          break;
        case 'legend-analyst':
          target = 100;
          progress = Math.min(analysesCount, 100);
          completed = analysesCount >= 100;
          date = completed ? now : null;
          break;
        case 'kings-portfolio':
          target = 25;
          progress = Math.min(portfolioCount, 25);
          completed = portfolioCount >= 25;
          date = completed ? firstPortfolio?.createdAt ?? null : null;
          break;
        case 'full-year':
          target = 365;
          progress = Math.min(accountAgeDays, 365);
          completed = accountAgeDays >= 365;
          date = completed ? now : null;
          break;
        case 'mega-referrer':
          target = 50;
          progress = Math.min(completedReferrals, 50);
          completed = completedReferrals >= 50;
          date = completed ? now : null;
          break;
        case 'referral-legend':
          target = 100;
          progress = Math.min(completedReferrals, 100);
          completed = completedReferrals >= 100;
          date = completed ? now : null;
          break;
        case 'community-leader':
          target = 500;
          progress = Math.min(user?.totalReferrals ?? 0, 500);
          completed = (user?.totalReferrals ?? 0) >= 500;
          date = completed ? now : null;
          break;
        case 'the-1000':
          target = 1000;
          progress = Math.min(user?.totalReferrals ?? 0, 1000);
          completed = (user?.totalReferrals ?? 0) >= 1000;
          date = completed ? now : null;
          break;
        case 'overachiever':
          target = 200;
          progress = Math.min(analysesCount, 200);
          completed = analysesCount >= 200;
          date = completed ? now : null;
          break;
        case 'sector-expert':
          target = 10;
          progress = Math.min(distinctTickers, 10);
          completed = distinctTickers >= 10;
          date = completed ? firstAnalysis?.createdAt ?? null : null;
          break;
        case 'legend':
          // يُحدد بعد أول جولة بناء
          break;
        default:
          break;
      }

      if (completed && def.id !== 'legend') completedByLevel[def.level as Level]++;

      return {
        id: def.id,
        level: def.level,
        title: def.title,
        shortDescription: def.shortDescription,
        longDescription: def.longDescription,
        route: def.route,
        completed,
        date,
        ...(target !== undefined && { target }),
        ...(progress !== undefined && { progress }),
      };
    };

    const achievements = ACHIEVEMENT_DEFS.map((def) => build(def));
    const othersCompleted = achievements.filter((a) => a.id !== 'legend' && a.completed).length;
    const legendItem = achievements.find((a) => a.id === 'legend');
    if (legendItem) {
      legendItem.completed = othersCompleted >= 39;
      legendItem.date = legendItem.completed ? now : null;
      legendItem.progress = othersCompleted;
      legendItem.target = 39;
      if (legendItem.completed) completedByLevel.legend++;
    }

    // تحديث userTitle: 10 من المستوى 4 → أسطورة، وإلا 10 من 3 → محترف، وإلا 10 من 2 → مستثمر، وإلا ناشئ
    let newTitle = 'ناشئ';
    if (completedByLevel.legend >= 10) newTitle = 'أسطورة';
    else if (completedByLevel.pro >= 10) newTitle = 'محترف';
    else if (completedByLevel.growth >= 10) newTitle = 'مستثمر';
    else if (completedByLevel.beginner >= 10) newTitle = 'ناشئ';

    await prisma.user.update({
      where: { id: userId },
      data: { userTitle: newTitle },
    });

    res.json(achievements.map((a) => ({ ...a, date: a.date?.toISOString() ?? null })));
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
      await auditLog({ userId: req.userId ?? undefined, action: 'TWO_FA_ENABLED', req, result: 'success' });
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

// Active sessions list (delegates to refresh tokens; use GET /api/auth/sessions for cookie-based list)
router.get('/sessions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const list = await prisma.refreshToken.findMany({
      where: { userId: req.userId!, isRevoked: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(
      list.map((s) => ({
        id: s.id,
        deviceInfo: s.deviceInfo,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        isCurrentSession: false, // لا يُعرف بدون مقارنة الـ cookie
      }))
    );
  } catch (err) {
    console.error('Sessions list error:', err);
    res.status(500).json({ error: 'Failed to load sessions' });
  }
});

// End a specific session (revoke refresh token)
router.delete('/sessions/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.refreshToken.updateMany({
      where: { id, userId: req.userId! },
      data: { isRevoked: true },
    });
    res.status(204).send();
  } catch (err) {
    console.error('End session error:', err);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// End all other sessions (revoke all refresh tokens for this user; current tab stays until access token expires)
router.post('/sessions/revoke-all-other', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.refreshToken.updateMany({
      where: { userId: req.userId! },
      data: { isRevoked: true },
    });
    res.status(200).json({ message: 'All other sessions ended' });
  } catch (err) {
    console.error('Revoke all sessions error:', err);
    res.status(500).json({ error: 'Failed to end sessions' });
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

// Delete account — يتطلب body: { confirmText: "حذف" | "DELETE", password }
router.delete('/account', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { confirmText, password } = (req.body || {}) as { confirmText?: string; password?: string };
    const normalized = (confirmText || '').trim().toUpperCase();
    if (normalized !== 'حذف' && normalized !== 'DELETE') {
      return res.status(400).json({
        error: 'invalid_confirm',
        message: 'يرجى كتابة "حذف" أو "DELETE" للتأكيد',
      });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'password_required', message: 'كلمة المرور مطلوبة' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { passwordHash: true, salt: true },
    });
    if (!user?.passwordHash || !user.salt) {
      return res.status(400).json({ error: 'invalid_account', message: 'تعذر التحقق من الحساب' });
    }
    const { verifyPassword } = await import('../../src/lib/auth.ts');
    const valid = await verifyPassword(password, user.passwordHash, user.salt);
    if (!valid) {
      return res.status(400).json({ error: 'wrong_password', message: 'كلمة المرور غير صحيحة' });
    }

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

    await auditLog({
      userId: req.userId ?? undefined,
      action: 'ACCOUNT_DELETED',
      req,
      result: 'success',
      details: `scheduled_${deletionDate.toISOString()}`,
    });

    await prisma.refreshToken.deleteMany({ where: { userId: req.userId! } });

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
