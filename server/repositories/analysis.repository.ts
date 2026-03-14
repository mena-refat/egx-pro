import { prisma } from '../lib/prisma.ts';

export const AnalysisRepository = {
  create(data: {
    userId: string;
    ticker: string;
    content: string;
    priceAtAnalysis?: number;
    targetPrice?: number;
    stopLoss?: number;
    verdict?: string;
  }) {
    return prisma.analysis.create({ data });
  },

  countByUser(userId: string) {
    return prisma.analysis.count({ where: { userId } });
  },

  findFirst(where: { userId: string }, orderBy: { createdAt: 'asc' | 'desc' }) {
    return prisma.analysis.findFirst({ where, orderBy });
  },

  groupBy(args: { by: ['ticker']; where: { userId: string } }) {
    return prisma.analysis.groupBy(args);
  },

  findUnchecked7d(limit = 50) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return prisma.analysis.findMany({
      where: {
        createdAt: { lt: sevenDaysAgo },
        priceAtAnalysis: { not: null },
        targetPrice: { not: null },
        priceAfter7d: null,
        ticker: { not: { startsWith: '_' } },
        NOT: { ticker: { contains: '|' } },
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
  },

  findUnchecked30d(limit = 50) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return prisma.analysis.findMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        priceAtAnalysis: { not: null },
        targetPrice: { not: null },
        priceAfter30d: null,
        ticker: { not: { startsWith: '_' } },
        NOT: { ticker: { contains: '|' } },
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
  },

  updateTrackRecord(
    id: string,
    data: {
      priceAfter7d?: number;
      priceAfter30d?: number;
      accuracyScore?: number;
      accuracyNote?: string;
      checkedAt?: Date;
    }
  ) {
    return prisma.analysis.update({ where: { id }, data });
  },

  async getAccuracyStats(): Promise<{
    total: number;
    checked: number;
    avgAccuracy: number;
    hitRate: number;
  }> {
    const [total, checkedList] = await Promise.all([
      prisma.analysis.count({
        where: {
          targetPrice: { not: null },
          ticker: { not: { startsWith: '_' } },
          NOT: { ticker: { contains: '|' } },
        },
      }),
      prisma.analysis.findMany({
        where: { accuracyScore: { not: null } },
        select: { accuracyScore: true },
      }),
    ]);

    const checked = checkedList.length;
    if (checked === 0) return { total, checked: 0, avgAccuracy: 0, hitRate: 0 };

    const scores = checkedList.map((a) => a.accuracyScore!);
    const avgAccuracy = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const hitRate = Math.round((scores.filter((s) => s >= 50).length / scores.length) * 100);

    return { total, checked, avgAccuracy, hitRate };
  },

  findRecentChecked(limit = 10) {
    return prisma.analysis.findMany({
      where: { accuracyScore: { not: null } },
      select: {
        id: true,
        ticker: true,
        verdict: true,
        priceAtAnalysis: true,
        targetPrice: true,
        priceAfter7d: true,
        priceAfter30d: true,
        accuracyScore: true,
        accuracyNote: true,
        createdAt: true,
        checkedAt: true,
      },
      orderBy: { checkedAt: 'desc' },
      take: limit,
    });
  },
};
