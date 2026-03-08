import { prisma } from '../lib/prisma.ts';

export const PortfolioRepository = {
  findByUser(userId: string, skip?: number, take?: number) {
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

  countByUser(userId: string) {
    return prisma.portfolio.count({ where: { userId } });
  },

  create(data: { userId: string; ticker: string; shares: number; avgPrice: number; buyDate: Date }) {
    return prisma.portfolio.create({ data });
  },

  updateMany(userId: string, id: string, data: { shares?: number; avgPrice?: number; buyDate?: Date }) {
    return prisma.portfolio.updateMany({
      where: { id, userId },
      data,
    });
  },

  deleteMany(userId: string, id: string) {
    return prisma.portfolio.deleteMany({ where: { id, userId } });
  },
};
