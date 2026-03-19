import { UserRepository } from '../repositories/user.repository.ts';
import { AnalysisRepository } from '../repositories/analysis.repository.ts';
import { PortfolioRepository } from '../repositories/portfolio.repository.ts';
import { WatchlistRepository } from '../repositories/watchlist.repository.ts';
import { normalizePhone, usernameSchema, isValidEgyptianPhone } from '../lib/validations.ts';
import { getCompletedAchievementIds, addNewlyUnlockedAchievements } from '../lib/achievementCheck.ts';
import { auditLog } from '../lib/audit.ts';
import { AppError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';
import type { Prisma } from '@prisma/client';
import type { Request } from 'express';

export const profileSelect = {
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

export const UserProfileService = {
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
      fullName, email: rawEmail, phone: rawPhone, username: rawUsername,
      riskTolerance, investmentHorizon, monthlyBudget, shariaMode,
      onboardingCompleted, interestedSectors, twoFactorEnabled, language, theme,
      notifySignals, notifyPortfolio, notifyNews, notifyAchievements, notifyGoals,
      hearAboutUs, investorProfile, isFirstLogin,
    } = body;

    const data: Record<string, unknown> = {
      fullName, riskTolerance, investmentHorizon, monthlyBudget, shariaMode,
      onboardingCompleted, isFirstLogin,
      interestedSectors: Array.isArray(interestedSectors) ? interestedSectors : undefined,
      twoFactorEnabled, language, theme,
      notifySignals, notifyPortfolio, notifyNews, notifyAchievements, notifyGoals,
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
        const existing = await UserRepository.findFirst({ where: { email: trimmed, id: { not: userId } } });
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
        const existingPhoneUser = await UserRepository.findFirst({ where: { phone: normalized, id: { not: userId } } });
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
          const existing = await UserRepository.findFirst({ where: { username, id: { not: userId } } });
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
    const dataToUpdate = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    ) as Prisma.UserUpdateInput;
    const user = await UserRepository.update({ where: { id: userId }, data: dataToUpdate });

    if (req && before && data.phone !== undefined && String(before.phone ?? '') !== String(data.phone ?? '')) {
      await auditLog({ userId, action: 'PHONE_CHANGED', req, result: 'success' });
    }
    if (req && before && data.email !== undefined && String(before.email ?? '') !== String(data.email ?? '')) {
      await auditLog({ userId, action: 'EMAIL_CHANGED', req, result: 'success' });
    }
    try {
      await addNewlyUnlockedAchievements(userId, completedBefore);
    } catch (achievementErr) {
      logger.warn('addNewlyUnlockedAchievements failed (non-fatal)', { userId, error: (achievementErr as Error).message });
    }

    return { user: { ...user, interestedSectors: user.interestedSectors ?? [] } };
  },

  async checkUsername(userId: number, rawUsername: string) {
    const trimmed = rawUsername.trim();
    if (!trimmed) throw new AppError('VALIDATION_ERROR', 400, 'اسم المستخدم مطلوب');
    const username = usernameSchema.parse(trimmed);
    const currentUser = await UserRepository.findUnique({ where: { id: userId }, select: { username: true } });
    if (currentUser?.username === username) return { available: true };
    const existing = await UserRepository.findFirst({ where: { username, id: { not: userId } } });
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
    return { analysesCount, watchlistCount, portfolioCount: portfolioHoldings.length, portfolioValue, daysSinceJoined };
  },
};
