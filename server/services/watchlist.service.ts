import { prisma } from '../lib/prisma.ts';
import { watchlistTickerSchema, watchlistCheckTargetsSchema } from '../../src/lib/validations.ts';
import { getCompletedAchievementIds, addNewlyUnlockedAchievements } from '../lib/achievementCheck.ts';
import { createNotification } from '../lib/createNotification.ts';
import { isPro, FREE_LIMITS } from '../lib/plan.ts';
import { AppError } from '../lib/errors.ts';
import type { z } from 'zod';

type WatchlistTickerInput = z.infer<typeof watchlistTickerSchema>;
type WatchlistCheckTargetsInput = z.infer<typeof watchlistCheckTargetsSchema>;

export const WatchlistService = {
  async list(userId: string) {
    const items = await prisma.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return { items, pagination: { total: items.length } };
  },

  async add(userId: string, body: unknown): Promise<
    { item: Awaited<ReturnType<typeof prisma.watchlist.create>>; newUnseenAchievements: string[] }
  > {
    if (!userId) throw new AppError('UNAUTHORIZED', 401);

    const parsed = watchlistTickerSchema.parse(body) as WatchlistTickerInput;
    const { ticker, targetPrice: bodyTargetPrice } = parsed;

    const planUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, planExpiresAt: true, referralProExpiresAt: true },
    });
    if (!planUser) throw new AppError('UNAUTHORIZED', 401);
    if (!isPro(planUser)) {
      const count = await prisma.watchlist.count({ where: { userId } });
      if (count >= FREE_LIMITS.watchlistStocks) {
        throw new AppError('WATCHLIST_LIMIT_REACHED', 403);
      }
    }
    if (bodyTargetPrice != null && !isPro(planUser)) {
      throw new AppError('PRICE_ALERTS_PRO', 403);
    }

    const existing = await prisma.watchlist.findFirst({
      where: { userId, ticker },
    });
    if (existing) throw new AppError('ALREADY_IN_WATCHLIST', 400);

    const completedBefore = await getCompletedAchievementIds(userId);
    const item = await prisma.watchlist.create({
      data: {
        userId,
        ticker,
        targetPrice: bodyTargetPrice ?? undefined,
      },
    });
    const newUnseenAchievements = await addNewlyUnlockedAchievements(userId, completedBefore);
    return { item, newUnseenAchievements };
  },

  async update(userId: string, ticker: string, body: { targetPrice?: number | null }) {
    if (!userId) throw new AppError('UNAUTHORIZED', 401);
    const normalizedTicker = ticker?.toUpperCase();
    if (!normalizedTicker) throw new AppError('VALIDATION_ERROR', 400);

    const targetPrice = typeof body?.targetPrice === 'number' ? body.targetPrice : null;
    if (targetPrice != null) {
      const planUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true, planExpiresAt: true, referralProExpiresAt: true },
      });
      if (!planUser || !isPro(planUser)) {
        throw new AppError('PRICE_ALERTS_PRO', 403);
      }
    }

    const updated = await prisma.watchlist.updateMany({
      where: { userId, ticker: normalizedTicker },
      data: targetPrice != null
        ? { targetPrice }
        : { targetPrice: null, targetReachedNotifiedAt: null },
    });
    return { updated: updated.count > 0 };
  },

  async checkTargets(userId: string, body: unknown): Promise<void> {
    const parsed = watchlistCheckTargetsSchema.parse(body) as WatchlistCheckTargetsInput;
    for (const { ticker, targetPrice, currentPrice } of parsed.items) {
      if (currentPrice < targetPrice) continue;
      const row = await prisma.watchlist.findFirst({
        where: {
          userId,
          ticker: ticker.toUpperCase(),
          targetPrice,
          targetReachedNotifiedAt: null,
        },
      });
      if (!row) continue;
      const titleAr = `سهم ${ticker} وصل للسعر المستهدف`;
      const titleEn = `${ticker} reached target price`;
      const bodyAr = `السعر الحالي ${currentPrice} وصل أو تجاوز المستهدف ${targetPrice}`;
      const bodyEn = `Current price ${currentPrice} reached or exceeded target ${targetPrice}`;
      await createNotification(userId, 'stock_target', titleAr, bodyAr);
      await prisma.watchlist.update({
        where: { id: row.id },
        data: { targetReachedNotifiedAt: new Date() },
      });
    }
  },

  async remove(userId: string, ticker: string): Promise<boolean> {
    if (!userId) throw new AppError('UNAUTHORIZED', 401);
    const result = await prisma.watchlist.deleteMany({
      where: { userId, ticker: ticker?.toUpperCase() ?? ticker },
    });
    return result.count > 0;
  },
};
