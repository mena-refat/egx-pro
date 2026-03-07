import fs from 'fs';
import path from 'path';
import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.ts';
import { normalizePhone, usernameSchema, isValidEgyptianPhone } from '../../src/lib/validations.ts';
import { getCompletedAchievementIds, addNewlyUnlockedAchievements } from '../lib/achievementCheck.ts';
import { auditLog } from '../lib/audit.ts';
import { createNotification } from '../lib/createNotification.ts';
import { ACHIEVEMENT_DEFS, type AchievementLevel } from '../lib/achievements.ts';
import { verifyPassword } from '../../src/lib/auth.ts';
import type { Request } from 'express';

const profileSelect = {
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
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: profileSelect,
    });
    if (!user) return null;
    const interestedSectors =
      typeof user.interestedSectors === 'string'
        ? (() => {
            try {
              return JSON.parse(user.interestedSectors);
            } catch {
              return [];
            }
          })()
        : user.interestedSectors;
    return { ...user, interestedSectors };
  },

  async updateProfile(
    userId: string,
    body: Record<string, unknown>,
    req?: Request
  ): Promise<{ user: Awaited<ReturnType<typeof prisma.user.update>> }> {
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
        const existingPhoneUser = await prisma.user.findFirst({
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
        const current = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true, lastUsernameChangeAt: true, usernameChangeCount: true },
        });
        if (!current) throw new Error('USER_NOT_FOUND');
        if (current.username !== username) {
          const existing = await prisma.user.findFirst({
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

    const before = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true },
    });
    const completedBefore = await getCompletedAchievementIds(userId);
    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });

    if (req && before && data.phone !== undefined && String(before.phone ?? '') !== String(data.phone ?? '')) {
      await auditLog({ userId, action: 'PHONE_CHANGED', req, result: 'success' });
    }
    if (req && before && data.email !== undefined && String(before.email ?? '') !== String(data.email ?? '')) {
      await auditLog({ userId, action: 'EMAIL_CHANGED', req, result: 'success' });
    }
    await addNewlyUnlockedAchievements(userId, completedBefore);

    const responseUser = {
      ...user,
      interestedSectors:
        typeof user.interestedSectors === 'string' ? JSON.parse(user.interestedSectors) : user.interestedSectors,
    };
    return { user: responseUser };
  },

  async checkUsername(userId: string, rawUsername: string) {
    const trimmed = rawUsername.trim();
    if (!trimmed) return { error: 'Username is required' as const };
    const username = usernameSchema.parse(trimmed);
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    if (currentUser?.username === username) return { available: true };
    const existing = await prisma.user.findFirst({
      where: { username, id: { not: userId } },
    });
    return { available: !existing };
  },

  async getProfileStats(userId: string) {
    const [user, analysesCount, watchlistCount, portfolioHoldings] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
      prisma.analysis.count({ where: { userId } }),
      prisma.watchlist.count({ where: { userId } }),
      prisma.portfolio.findMany({ where: { userId } }),
    ]);
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

  async getUnseenAchievements(userId: string) {
    const user = await prisma.user.findUnique({
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

  async markAchievementsSeen(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { unseenAchievements: [] },
    });
    return { success: true };
  },

  async getAchievements(userId: string) {
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
          plan: true,
          planExpiresAt: true,
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
    await prisma.user.update({
      where: { id: userId },
      data: { userTitle: newTitle },
    });
    return achievements.map((a) => ({ ...a, date: a.date?.toISOString() ?? null }));
  },

  async getSecurity(userId: string) {
    const user = await prisma.user.findUnique({
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

  async getReferralSummary(userId: string) {
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, freeReferralRewarded: true, totalReferrals: true },
    });
    if (!user) return null;
    if (!user.referralCode) {
      const referralCode = `EGX-${randomUUID().slice(0, 8).toUpperCase()}`;
      user = await prisma.user.update({
        where: { id: userId },
        data: { referralCode },
        select: { referralCode: true, freeReferralRewarded: true, totalReferrals: true },
      }) as typeof user;
    }
    const [completedCount, completedReferrals, weeklyJoinedCount] = await Promise.all([
      prisma.referral.count({ where: { referrerId: userId, status: 'completed' } }),
      prisma.referral.findMany({
        where: { referrerId: userId, status: 'completed' },
        orderBy: { createdAt: 'asc' },
        take: 5,
        include: {
          referredUser: { select: { fullName: true, createdAt: true } },
        },
      }),
      (async () => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return prisma.referral.count({
          where: {
            referrerId: userId,
            status: 'completed',
            referredUser: { createdAt: { gte: weekAgo } },
          },
        });
      })(),
    ]);
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

  async redeemReferralReward(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { freeReferralRewarded: true, plan: true, planExpiresAt: true },
    });
    if (!user) return { error: 'User not found' as const };
    if (user.freeReferralRewarded) return { error: 'Reward already claimed' as const };
    const completedCount = await prisma.referral.count({
      where: { referrerId: userId, status: 'completed' },
    });
    if (completedCount < 5) return { error: 'Not enough referrals yet' as const };
    const now = new Date();
    let startsFrom = now;
    if (user.planExpiresAt && user.planExpiresAt > now) startsFrom = user.planExpiresAt;
    const newEndsAt = new Date(startsFrom);
    newEndsAt.setMonth(newEndsAt.getMonth() + 1);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { plan: 'pro', planExpiresAt: newEndsAt, freeReferralRewarded: true },
      select: { plan: true, planExpiresAt: true, freeReferralRewarded: true },
    });
    return { data: updated };
  },

  async useReferralCode(userId: string, code: string) {
    const trimmed = (code || '').trim().toUpperCase();
    if (!trimmed) return { error: 'Referral code is required' as const };
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, referralUsed: true },
    });
    if (!currentUser) return { error: 'User not found' as const };
    if (currentUser.referralUsed) return { error: 'Referral code already used' as const };
    const referrer = await prisma.user.findFirst({
      where: { referralCode: trimmed },
      select: { id: true, fullName: true },
    });
    if (!referrer) return { error: 'Invalid referral code' as const };
    if (referrer.id === currentUser.id) return { error: 'You cannot use your own referral code' as const };
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: currentUser.id },
        data: { referredBy: referrer.id, referralUsed: trimmed },
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
        select: { totalReferrals: true, referralProDaysRemaining: true, referralProExpiresAt: true },
      });
      if (!referrerUser) return;
      const now = new Date();
      const previousTotal = referrerUser.totalReferrals ?? 0;
      const totalReferrals = previousTotal + 1;
      let referralProDaysRemaining = referrerUser.referralProDaysRemaining ?? 0;
      let referralProExpiresAt = referrerUser.referralProExpiresAt;
      if (totalReferrals % 5 === 0) {
        referralProDaysRemaining += 30;
        const baseDate = referralProExpiresAt && referralProExpiresAt > now ? referralProExpiresAt : now;
        const extended = new Date(baseDate);
        extended.setDate(extended.getDate() + 30);
        referralProExpiresAt = extended;
      }
      await tx.user.update({
        where: { id: referrer.id },
        data: { totalReferrals, referralProDaysRemaining, referralProExpiresAt },
      });
    });
    await createNotification(
      referrer.id,
      'referral',
      'دعوة ناجحة',
      currentUser.fullName ? `صديقك ${currentUser.fullName} انضم بكودك` : 'صديق انضم بكودك'
    );
    return { success: true, referrerName: referrer.fullName || 'صاحب الدعوة' };
  },

  async getSessions(userId: string) {
    const list = await prisma.refreshToken.findMany({
      where: { userId, isRevoked: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
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

  async revokeSession(userId: string, sessionId: string) {
    await prisma.refreshToken.updateMany({
      where: { id: sessionId, userId },
      data: { isRevoked: true },
    });
  },

  async revokeAllOtherSessions(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  },

  async uploadAvatar(userId: string, imageBase64: string) {
    const matches = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) return { error: 'Invalid image format' as const };
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = mimeType.split('/')[1] || 'png';
    const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filename = `${userId}.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    const publicUrl = `/uploads/avatars/${filename}`;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: publicUrl },
      select: { avatarUrl: true },
    });
    return { avatarUrl: user.avatarUrl };
  },

  async deleteAccount(userId: string, confirmText: string, password: string, req?: Request) {
    const normalized = (confirmText || '').trim().toUpperCase();
    if (normalized !== 'حذف' && normalized !== 'DELETE') {
      return { error: 'invalid_confirm' as const, message: 'يرجى كتابة "حذف" أو "DELETE" للتأكيد' };
    }
    if (!password || typeof password !== 'string') {
      return { error: 'password_required' as const, message: 'كلمة المرور مطلوبة' };
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, salt: true },
    });
    if (!user?.passwordHash || !user.salt) {
      return { error: 'invalid_account' as const, message: 'تعذر التحقق من الحساب' };
    }
    const valid = await verifyPassword(password, user.passwordHash, user.salt);
    if (!valid) return { error: 'wrong_password' as const, message: 'كلمة المرور غير صحيحة' };
    const now = new Date();
    const deletionDate = new Date(now);
    deletionDate.setDate(deletionDate.getDate() + 30);
    await prisma.user.update({
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
    await prisma.refreshToken.deleteMany({ where: { userId } });
    return { success: true, deletedAt: now, deletionScheduledFor: deletionDate };
  },
};
