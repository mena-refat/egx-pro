import fs from 'fs';
import path from 'path';
import { randomUUID } from 'node:crypto';
import { UserRepository } from '../repositories/user.repository.ts';
import { RefreshTokenRepository } from '../repositories/refreshToken.repository.ts';
import { ReferralRepository } from '../repositories/referral.repository.ts';
import { AnalysisRepository } from '../repositories/analysis.repository.ts';
import { PortfolioRepository } from '../repositories/portfolio.repository.ts';
import { WatchlistRepository } from '../repositories/watchlist.repository.ts';
import { GoalsRepository } from '../repositories/goals.repository.ts';
import { normalizePhone, usernameSchema, isValidEgyptianPhone } from '../lib/validations.ts';
import { getCompletedAchievementIds, addNewlyUnlockedAchievements } from '../lib/achievementCheck.ts';
import { auditLog } from '../lib/audit.ts';
import { createNotification } from '../lib/createNotification.ts';
import { ACHIEVEMENT_DEFS, type AchievementLevel } from '../lib/achievements.ts';
import { verifyPassword } from '../lib/auth.ts';
import { AppError } from '../lib/errors.ts';
import { REFERRAL_REQUIRED } from '../lib/constants/plans.ts';
import { logger } from '../lib/logger.ts';
import type { Prisma } from '@prisma/client';
import type { Request } from 'express';

const profileSelect = {
  id: true,
  createdAt: true,
  email: true,
  phone: true,
  fullName: true,
  username: true,
  isPrivate: true,
  showPortfolio: true,
  avatarUrl: true,
  riskTolerance: true,
  investmentHorizon: true,
  monthlyBudget: true,
  shariaMode: true,
  onboardingCompleted: true,
  isFirstLogin: true,
  interestedSectors: true,
  twoFactorEnabled: true,
  language: true,
  theme: true,
  plan: true,
  planExpiresAt: true,
  hearAboutUs: true,
  investorProfile: true,
  userTitle: true,
  lastPasswordChangeAt: true,
  lastUsernameChangeAt: true,
  notifySignals: true,
  notifyPortfolio: true,
  notifyNews: true,
  notifyAchievements: true,
  notifyGoals: true,
} as const;

export const UserService = {
  async getProfile(userId: number) {
    const user = await UserRepository.findUnique({
      where: { id: userId },
      select: profileSelect,
    });
    if (!user) return null;
    return { ...user, interestedSectors: user.interestedSectors ?? [] };
  },

  async updateProfile(
    userId: number,
    body: Record<string, unknown>,
    req?: Request
  ): Promise<{ user: Awaited<ReturnType<typeof UserRepository.update>> }> {
    const {
      fullName,
      email: rawEmail,
      phone: rawPhone,
      username: rawUsername,
      riskTolerance,
      investmentHorizon,
      monthlyBudget,
      shariaMode,
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
    } = body;

    const data: Record<string, unknown> = {
      fullName,
      riskTolerance,
      investmentHorizon,
      monthlyBudget,
      shariaMode,
      onboardingCompleted,
      isFirstLogin,
      interestedSectors: Array.isArray(interestedSectors) ? interestedSectors : undefined,
      twoFactorEnabled,
      language,
      theme,
      notifySignals,
      notifyPortfolio,
      notifyNews,
      notifyAchievements,
      notifyGoals,
      hearAboutUs,
      investorProfile:
        investorProfile != null && typeof investorProfile === 'object'
          ? JSON.parse(JSON.stringify(investorProfile))
          : investorProfile,
    };

    if (rawEmail !== undefined) {
      const trimmed = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
      if (!trimmed) {
        data.email = null;
      } else {
        const existing = await UserRepository.findFirst({
          where: { email: trimmed, id: { not: userId } },
        });
        if (existing) throw new Error('EMAIL_IN_USE');
        data.email = trimmed;
      }
    }

    if (rawPhone !== undefined) {
      const trimmed = typeof rawPhone === 'string' ? rawPhone.trim() : '';
      if (!trimmed) {
        data.phone = null;
      } else {
        const digitsOnly = trimmed.replace(/\D/g, '');
        if (!isValidEgyptianPhone(digitsOnly)) throw new Error('INVALID_PHONE');
        const normalized = normalizePhone(digitsOnly);
        const existingPhoneUser = await UserRepository.findFirst({
          where: { phone: normalized, id: { not: userId } },
        });
        if (existingPhoneUser) throw new Error('PHONE_IN_USE');
        data.phone = normalized;
      }
    }

    if (rawUsername !== undefined) {
      const trimmed = typeof rawUsername === 'string' ? rawUsername.trim() : '';
      if (!trimmed) {
        data.username = null;
      } else {
        const username = usernameSchema.parse(trimmed);
        const current = await UserRepository.findUnique({
          where: { id: userId },
          select: { username: true, lastUsernameChangeAt: true, usernameChangeCount: true },
        });
        if (!current) throw new Error('USER_NOT_FOUND');
        if (current.username !== username) {
          const existing = await UserRepository.findFirst({
            where: { username, id: { not: userId } },
          });
          if (existing) throw new Error('USERNAME_TAKEN');
          const now = new Date();
          const changeCount = current.usernameChangeCount ?? 0;
          if (changeCount >= 1 && current.lastUsernameChangeAt) {
            const diffMs = now.getTime() - current.lastUsernameChangeAt.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays < 7) {
              const err = new Error('USERNAME_COOLDOWN') as Error & { remainingDays?: number };
              err.remainingDays = 7 - diffDays;
              throw err;
            }
          }
          data.username = username;
          data.lastUsernameChangeAt = now;
          data.usernameChangeCount = changeCount + 1;
        }
      }
    }

    const before = await UserRepository.findUnique({
      where: { id: userId },
      select: { phone: true, email: true },
    });
    let completedBefore: string[] = [];
    try {
      completedBefore = await getCompletedAchievementIds(userId);
    } catch (e) {
      logger.warn('getCompletedAchievementIds failed (non-fatal)', { userId, error: (e as Error).message });
    }
    // إزالة الحقول undefined حتى لا تسبب مشكلة مع Prisma/DB
    const dataToUpdate = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    ) as Prisma.UserUpdateInput;
    const user = await UserRepository.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    if (req && before && data.phone !== undefined && String(before.phone ?? '') !== String(data.phone ?? '')) {
      await auditLog({ userId, action: 'PHONE_CHANGED', req, result: 'success' });
    }
    if (req && before && data.email !== undefined && String(before.email ?? '') !== String(data.email ?? '')) {
      await auditLog({ userId, action: 'EMAIL_CHANGED', req, result: 'success' });
    }
    try {
      await addNewlyUnlockedAchievements(userId, completedBefore);
    } catch (achievementErr) {
      logger.warn('addNewlyUnlockedAchievements failed (non-fatal)', {
        userId,
        error: (achievementErr as Error).message,
      });
    }

    const responseUser = {
      ...user,
      interestedSectors: user.interestedSectors ?? [],
    };
    return { user: responseUser };
  },

  async checkUsername(userId: number, rawUsername: string) {
    const trimmed = rawUsername.trim();
    if (!trimmed) throw new AppError('VALIDATION_ERROR', 400, 'اسم المستخدم مطلوب');
    const username = usernameSchema.parse(trimmed);
    const currentUser = await UserRepository.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    if (currentUser?.username === username) return { available: true };
    const existing = await UserRepository.findFirst({
      where: { username, id: { not: userId } },
    });
    return { available: !existing };
  },

  async getProfileStats(userId: number) {
    const [user, analysesCount, watchlistCount, portfolioResult] = await Promise.all([
      UserRepository.findUnique({ where: { id: userId }, select: { createdAt: true } }),
      AnalysisRepository.countByUser(userId),
      WatchlistRepository.countByUser(userId),
      PortfolioRepository.findByUser(userId),
    ]);
    const portfolioHoldings = (portfolioResult as readonly [Array<{ shares: number; avgPrice: number }>, number])[0] ?? [];
    if (!user) return null;
    const now = new Date();
    const daysSinceJoined = Math.max(
      1,
      Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );
    const portfolioValue = portfolioHoldings.reduce((sum, h) => sum + h.shares * h.avgPrice, 0);
    return {
      analysesCount,
      watchlistCount,
      portfolioCount: portfolioHoldings.length,
      portfolioValue,
      daysSinceJoined,
    };
  },

  async getUnseenAchievements(userId: number) {
    const user = await UserRepository.findUnique({
      where: { id: userId },
      select: { unseenAchievements: true },
    });
    const ids = user?.unseenAchievements ?? [];
    return ids
      .map((id) => {
        const def = ACHIEVEMENT_DEFS.find((d) => d.id === id);
        if (!def) return null;
        return { id: def.id, title: def.title, shortDescription: def.shortDescription };
      })
      .filter(Boolean);
  },

  async markAchievementsSeen(userId: number) {
    await UserRepository.update({
      where: { id: userId },
      data: { unseenAchievements: [] },
    });
    return { success: true };
  },

  async getAchievements(userId: number) {
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
      UserRepository.findUnique({
        where: { id: userId },
        select: {
          createdAt: true,
          fullName: true,
          phone: true,
          username: true,
          onboardingCompleted: true,
          loginStreak: true,
          totalReferrals: true,
          plan: true,
          planExpiresAt: true,
        },
      }),
      AnalysisRepository.findFirst({ userId }, { createdAt: 'asc' }),
      AnalysisRepository.countByUser(userId),
      WatchlistRepository.countByUser(userId),
      WatchlistRepository.findByUser(userId).then((list) => list[0] ?? null),
      PortfolioRepository.countByUser(userId),
      PortfolioRepository.findByUser(userId).then((res) => {
        const list = (res as readonly [Array<{ createdAt: Date }>, number])[0];
        return list?.[0] ?? null;
      }),
      GoalsRepository.countByUser(userId),
      GoalsRepository.findByUser(userId, 1, 1).then(([list]) => list[0] ?? null),
      GoalsRepository.countAchievedByUser(userId),
      ReferralRepository.countActiveByReferrer(userId),
      AnalysisRepository.groupBy({ by: ['ticker'], where: { userId } }),
    ]);
    const accountAgeDays = user ? Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const distinctTickers = distinctTickersResult?.length ?? 0;
    const profileComplete = Boolean(
      user?.fullName?.trim() && user?.phone?.trim() && user?.username?.trim() && goalsCount >= 1 && watchlistCount >= 1
    );
    const completedByLevel: Record<AchievementLevel, number> = { beginner: 0, growth: 0, pro: 0, legend: 0 };
    type AchOut = {
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
    };
    const build = (def: (typeof ACHIEVEMENT_DEFS)[0]): AchOut => {
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
          completed = user?.plan === 'pro' || user?.plan === 'yearly' || false;
          date = user?.planExpiresAt ?? null;
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
          completed = user?.plan === 'yearly';
          date = user?.planExpiresAt ?? null;
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
          date = completed ? firstAnalysis?.createdAt ?? null : null;
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
          break;
        default:
          break;
      }
      if (completed && def.id !== 'legend') completedByLevel[def.level as AchievementLevel]++;
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
    let newTitle = 'ناشئ';
    if (completedByLevel.legend >= 10) newTitle = 'أسطورة';
    else if (completedByLevel.pro >= 10) newTitle = 'محترف';
    else if (completedByLevel.growth >= 10) newTitle = 'مستثمر';
    else if (completedByLevel.beginner >= 10) newTitle = 'ناشئ';
    await UserRepository.update({
      where: { id: userId },
      data: { userTitle: newTitle },
    });
    return achievements.map((a) => ({ ...a, date: a.date?.toISOString() ?? null }));
  },

  async getSecurity(userId: number) {
    const user = await UserRepository.findUnique({
      where: { id: userId },
      select: {
        lastPasswordChangeAt: true,
        twoFactorEnabled: true,
        twoFactorEnabledAt: true,
        createdAt: true,
        lastLoginAt: true,
        lastLoginIp: true,
      },
    });
    if (!user) return null;
    return {
      lastPasswordChangeAt: user.lastPasswordChangeAt,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorEnabledAt: user.twoFactorEnabledAt ?? undefined,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp,
    };
  },

  async getReferralSummary(userId: number) {
    let user = await UserRepository.findUnique({
      where: { id: userId },
      select: { referralCode: true, freeReferralRewarded: true, totalReferrals: true },
    });
    if (!user) return null;
    if (!user.referralCode) {
      const referralCode = `EGX-${randomUUID().slice(0, 8).toUpperCase()}`;
      user = await UserRepository.update({
        where: { id: userId },
        data: { referralCode },
        select: { referralCode: true, freeReferralRewarded: true, totalReferrals: true },
      }) as typeof user;
    }
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const [completedCount, completedReferralsRaw, weeklyJoinedCount] = await Promise.all([
      ReferralRepository.countActiveByReferrer(userId),
      ReferralRepository.findByReferrer(userId, {
        take: 5,
        orderBy: { createdAt: 'asc' } as object,
        include: { referredUser: { select: { fullName: true, createdAt: true } } },
      }),
      ReferralRepository.countActiveByReferrerSince(userId, weekAgo),
    ]);
    type RefWithUser = { referredUserId: number; referredUser?: { fullName: string | null } };
    const completedReferrals = completedReferralsRaw as RefWithUser[];
    const friends = completedReferrals.map((ref, index) => ({
      id: ref.referredUserId,
      name: ref.referredUser?.fullName ?? null,
      order: index + 1,
    }));
    return {
      code: user.referralCode,
      completedCount,
      goal: 5,
      rewardClaimed: user.freeReferralRewarded,
      totalReferrals: user.totalReferrals ?? completedCount,
      friends,
      weeklyJoinedCount,
    };
  },

  async redeemReferralReward(userId: number) {
    const user = await UserRepository.findUnique({
      where: { id: userId },
      select: { freeReferralRewarded: true, plan: true, planExpiresAt: true },
    });
    if (!user) throw new AppError('NOT_FOUND', 404, 'User not found');
    if (user.freeReferralRewarded) throw new AppError('REWARD_ALREADY_CLAIMED', 400, 'المكافأة تم استلامها بالفعل');
    const completedCount = await ReferralRepository.countActiveByReferrer(userId);
    if (completedCount < REFERRAL_REQUIRED) throw new AppError('NOT_ENOUGH_REFERRALS', 400, `محتاج ${REFERRAL_REQUIRED} دعوات ناجحة على الأقل`);
    const now = new Date();
    let startsFrom = now;
    if (user.planExpiresAt && user.planExpiresAt > now) startsFrom = user.planExpiresAt;
    const newEndsAt = new Date(startsFrom);
    newEndsAt.setMonth(newEndsAt.getMonth() + 1);
    const updated = await UserRepository.update({
      where: { id: userId },
      data: { plan: 'pro', planExpiresAt: newEndsAt, freeReferralRewarded: true },
      select: { plan: true, planExpiresAt: true, freeReferralRewarded: true },
    });
    return { data: updated };
  },

  async applyReferralCode(userId: number, code: string) {
    const trimmed = (code || '').trim().toUpperCase();
    if (!trimmed) throw new AppError('VALIDATION_ERROR', 400, 'Referral code is required');
    const currentUser = await UserRepository.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, referralUsed: true },
    });
    if (!currentUser) throw new AppError('NOT_FOUND', 404, 'User not found');
    if (currentUser.referralUsed) throw new AppError('REFERRAL_CODE_ALREADY_USED', 400, 'Referral code already used');
    const referrer = await UserRepository.findFirst({
      where: { referralCode: trimmed },
      select: { id: true, fullName: true },
    });
    if (!referrer) throw new AppError('INVALID_REFERRAL_CODE', 400, 'Invalid referral code');
    if (referrer.id === currentUser.id) throw new AppError('OWN_REFERRAL_CODE', 400, 'You cannot use your own referral code');
    await ReferralRepository.applyReferralCodeTransaction(referrer.id, currentUser.id, trimmed);
    const { checkAndRewardReferrer } = await import('../lib/referral.ts');
    await checkAndRewardReferrer(referrer.id);
    await createNotification(
      referrer.id,
      'referral',
      'دعوة ناجحة',
      currentUser.fullName ? `صديقك ${currentUser.fullName} انضم بكودك` : 'صديق انضم بكودك'
    );
    return { success: true, referrerName: referrer.fullName || 'صاحب الدعوة' };
  },

  async getSessions(userId: number) {
    const list = await RefreshTokenRepository.findActiveSessions(userId);
    return list.map((s) => ({
      id: s.id,
      deviceType: s.deviceType ?? undefined,
      browser: s.browser ?? undefined,
      os: s.os ?? undefined,
      deviceInfo: s.deviceInfo ?? undefined,
      city: s.city ?? undefined,
      country: s.country ?? undefined,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrentSession: false,
    }));
  },

  async revokeSession(userId: number, sessionId: string) {
    await RefreshTokenRepository.updateMany({ id: sessionId, userId }, { isRevoked: true });
  },

  async revokeAllOtherSessions(userId: number) {
    await RefreshTokenRepository.revokeAllByUser(userId);
  },

  async uploadAvatar(userId: number, imageBase64: string) {
    const matches = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) throw new AppError('INVALID_IMAGE_FORMAT', 400, 'Invalid image format');
    const base64Data = matches[2];
    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64Data, 'base64');
    } catch {
      throw new AppError('INVALID_IMAGE_FORMAT', 400, 'Invalid image format');
    }
    const MAX_AVATAR_BYTES = 500 * 1024; // 500KB
    if (buffer.length > MAX_AVATAR_BYTES) throw new AppError('INVALID_IMAGE_FORMAT', 400, 'Invalid image format');
    const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const JPEG_SIG = Buffer.from([0xff, 0xd8, 0xff]);
    const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIG);
    const isJpeg = buffer.length >= 3 && buffer.subarray(0, 3).equals(JPEG_SIG);
    if (!isPng && !isJpeg) throw new AppError('INVALID_IMAGE_FORMAT', 400, 'Invalid image format');
    const sharp = (await import('sharp')).default;
    const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filename = `${randomUUID()}.webp`;
    const filePath = path.join(uploadsDir, filename);
    await sharp(buffer)
      .resize(400, 400, { fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .rotate()
      .toFile(filePath);
    const publicUrl = `/uploads/avatars/${filename}`;
    const user = await UserRepository.update({
      where: { id: userId },
      data: { avatarUrl: publicUrl },
      select: { avatarUrl: true },
    });
    return { avatarUrl: user.avatarUrl };
  },

  async deleteAccount(userId: number, confirmText: string, password: string, req?: Request) {
    const normalized = (confirmText || '').trim().toUpperCase();
    if (normalized !== 'حذف' && normalized !== 'DELETE') {
      throw new AppError('INVALID_CONFIRM', 400, 'يرجى كتابة "حذف" أو "DELETE" للتأكيد');
    }
    if (!password || typeof password !== 'string') {
      throw new AppError('PASSWORD_REQUIRED', 400, 'كلمة المرور مطلوبة');
    }
    const user = await UserRepository.findUnique({
      where: { id: userId },
      select: { passwordHash: true, salt: true },
    });
    if (!user?.passwordHash || !user.salt) {
      throw new AppError('INVALID_ACCOUNT', 400, 'تعذر التحقق من الحساب');
    }
    const valid = await verifyPassword(password, user.passwordHash, user.salt);
    if (!valid) throw new AppError('WRONG_PASSWORD', 400, 'كلمة المرور غير صحيحة');
    const now = new Date();
    const deletionDate = new Date(now);
    deletionDate.setDate(deletionDate.getDate() + 30);
    await UserRepository.update({
      where: { id: userId },
      data: { isDeleted: true, deletedAt: now, deletionScheduledFor: deletionDate },
    });
    if (req) {
      await auditLog({
        userId,
        action: 'ACCOUNT_DELETED',
        req,
        result: 'success',
        details: `scheduled_${deletionDate.toISOString()}`,
      });
    }
    await RefreshTokenRepository.deleteManyByUser(userId);
    return { success: true, deletedAt: now, deletionScheduledFor: deletionDate };
  },
};
