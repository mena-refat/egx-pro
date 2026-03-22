import { prisma } from '../lib/prisma.ts';

export const PortfolioRepository = {
  findByUser(userId: number, skip?: number, take?: number) {
    const where = { userId };
    if (skip != null && take != null) {
      return Promise.all([
        prisma.portfolio.findMany({
          where,
          orderBy: { buyDate: 'desc' },
          skip,
          take,
        }),
        prisma.portfolio.count({ where }),
      ]);
    }
    return prisma.portfolio.findMany({ where, orderBy: { buyDate: 'desc' } }).then((list) => [list, 0] as const);
  },

  countByUser(userId: number) {
    return prisma.portfolio.count({ where: { userId } });
  },

  async countUniqueTickersByUser(userId: number): Promise<number> {
    const rows = await prisma.portfolio.findMany({
      where: { userId },
      distinct: ['ticker'],
      select: { ticker: true },
    });
    return rows.length;
  },

  existsByUserAndTicker(userId: number, ticker: string): Promise<boolean> {
    return prisma.portfolio.count({ where: { userId, ticker } }).then((n) => n > 0);
  },

  create(data: { userId: number; ticker: string; shares: number; avgPrice: number; buyDate: Date }) {
    return prisma.portfolio.create({ data });
  },

  updateMany(userId: number, id: string, data: { shares?: number; avgPrice?: number; buyDate?: Date }) {
    return prisma.portfolio.updateMany({
      where: { id, userId },
      data,
    });
  },

  deleteMany(userId: number, id: string) {
    return prisma.portfolio.deleteMany({ where: { id, userId } });
  },
};
