import { prisma } from '../lib/prisma.ts';

export const WatchlistRepository = {
  findByUser(userId: number) {
    return prisma.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  countByUser(userId: number) {
    return prisma.watchlist.count({ where: { userId } });
  },

  findFirstByUserAndTicker(userId: number, ticker: string) {
    return prisma.watchlist.findFirst({
      where: { userId, ticker },
    });
  },

  findFirstTargetNotNotified(userId: number, ticker: string, targetPrice: number) {
    return prisma.watchlist.findFirst({
      where: {
        userId,
        ticker: ticker.toUpperCase(),
        targetPrice,
        targetReachedNotifiedAt: null,
      },
    });
  },

  create(data: { userId: number; ticker: string; targetPrice?: number }) {
    return prisma.watchlist.create({
      data: {
        userId: data.userId,
        ticker: data.ticker,
        targetPrice: data.targetPrice ?? undefined,
      },
    });
  },

  updateMany(
    userId: number,
    ticker: string,
    data: { targetPrice?: number | null; targetReachedNotifiedAt?: Date | null }
  ) {
    return prisma.watchlist.updateMany({
      where: { userId, ticker },
      data,
    });
  },

  updateTargetNotified(id: string) {
    return prisma.watchlist.update({
      where: { id },
      data: { targetReachedNotifiedAt: new Date() },
    });
  },

  deleteMany(userId: number, ticker: string) {
    return prisma.watchlist.deleteMany({
      where: { userId, ticker: ticker.toUpperCase() },
    });
  },
};
