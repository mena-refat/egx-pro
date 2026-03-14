import { prisma } from '../lib/prisma.ts';

export const AnalysisRepository = {
  create(data: { userId: string; ticker: string; content: string }) {
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
};
