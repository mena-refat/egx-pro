import { UserRepository } from '../repositories/user.repository.ts';
import { watchlistTickerSchema, watchlistCheckTargetsSchema } from '../../src/lib/validations.ts';
import { getCompletedAchievementIds, addNewlyUnlockedAchievements } from '../lib/achievementCheck.ts';
import { createNotification } from '../lib/createNotification.ts';
import { isPaid, getLimit } from '../lib/plan.ts';
import { AppError } from '../lib/errors.ts';
import { WatchlistRepository } from '../repositories/watchlist.repository.ts';
import type { z } from 'zod';

type WatchlistTickerInput = z.infer<typeof watchlistTickerSchema>;
type WatchlistCheckTargetsInput = z.infer<typeof watchlistCheckTargetsSchema>;

export const WatchlistService = {
  async list(userId: number) {
    const items = await WatchlistRepository.findByUser(userId);
    return { items, pagination: { total: items.length } };
  },

  async add(userId: number, body: unknown): Promise<
    { item: Awaited<ReturnType<typeof WatchlistRepository.create>>; newUnseenAchievements: string[] }
  > {
    if (!userId) throw new AppError('UNAUTHORIZED', 401);

    const parsed = watchlistTickerSchema.parse(body) as WatchlistTickerInput;
    const { ticker, targetPrice: bodyTargetPrice } = parsed;

    const planUser = await UserRepository.getPlanUser(userId);
    if (!planUser) throw new AppError('UNAUTHORIZED', 401);
    const watchlistLimit = getLimit(planUser, 'watchlistStocks');
    const count = await WatchlistRepository.countByUser(userId);
    if (count >= (typeof watchlistLimit === 'number' ? watchlistLimit : 0)) {
      throw new AppError('WATCHLIST_LIMIT_REACHED', 403);
    }
    if (bodyTargetPrice != null && !isPaid(planUser)) {
      throw new AppError('PRICE_ALERTS_PRO', 403);
    }

    const existing = await WatchlistRepository.findFirstByUserAndTicker(userId, ticker);
    if (existing) throw new AppError('ALREADY_IN_WATCHLIST', 400);

    const completedBefore = await getCompletedAchievementIds(userId);
    const item = await WatchlistRepository.create({
      userId,
      ticker,
      targetPrice: bodyTargetPrice ?? undefined,
    });
    const newUnseenAchievements = await addNewlyUnlockedAchievements(userId, completedBefore);
    return { item, newUnseenAchievements };
  },

  async update(userId: number, ticker: string, body: { targetPrice?: number | null }) {
    if (!userId) throw new AppError('UNAUTHORIZED', 401);
    const normalizedTicker = ticker?.toUpperCase();
    if (!normalizedTicker) throw new AppError('VALIDATION_ERROR', 400);

    const targetPrice = typeof body?.targetPrice === 'number' ? body.targetPrice : null;
    if (targetPrice != null) {
      const planUser = await UserRepository.getPlanUser(userId);
      if (!planUser || !isPaid(planUser)) {
        throw new AppError('PRICE_ALERTS_PRO', 403);
      }
    }

    const updated = await WatchlistRepository.updateMany(
      userId,
      normalizedTicker,
      targetPrice != null
        ? { targetPrice }
        : { targetPrice: null, targetReachedNotifiedAt: null }
    );
    return { updated: updated.count > 0 };
  },

  async checkTargets(userId: number, body: unknown): Promise<void> {
    const parsed = watchlistCheckTargetsSchema.parse(body) as WatchlistCheckTargetsInput;
    for (const { ticker, targetPrice, currentPrice } of parsed.items) {
      if (currentPrice < targetPrice) continue;
      const row = await WatchlistRepository.findFirstTargetNotNotified(
        userId,
        ticker,
        targetPrice
      );
      if (!row) continue;
      const titleAr = `سهم ${ticker} وصل للسعر المستهدف`;
      const bodyAr = `السعر الحالي ${currentPrice} وصل أو تجاوز المستهدف ${targetPrice}`;
      await createNotification(userId, 'stock_target', titleAr, bodyAr);
      await WatchlistRepository.updateTargetNotified(row.id);
    }
  },

  async remove(userId: number, ticker: string): Promise<boolean> {
    if (!userId) throw new AppError('UNAUTHORIZED', 401);
    const result = await WatchlistRepository.deleteMany(userId, ticker);
    return result.count > 0;
  },
};
