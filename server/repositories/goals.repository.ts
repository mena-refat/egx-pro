import { prisma } from '../lib/prisma.ts';

export const GoalsRepository = {
  findByUser(userId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return Promise.all([
      prisma.goal.findMany({
        where: { userId },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.goal.count({ where: { userId } }),
    ]);
  },

  findOwned(goalId: string, userId: number) {
    return prisma.goal.findFirst({
      where: { id: goalId, userId },
    });
  },

  countByUser(userId: number) {
    return prisma.goal.count({ where: { userId } });
  },

  countAchievedByUser(userId: number) {
    return prisma.goal.count({ where: { userId, achievedAt: { not: null } } });
  },

  create(data: {
    userId: number;
    title: string;
    category: string;
    targetAmount: number;
    currentAmount: number;
    currency: string;
    deadline: Date | null;
  }) {
    return prisma.goal.create({
      data,
    });
  },

  update(goalId: string, data: Record<string, unknown>) {
    return prisma.goal.update({
      where: { id: goalId },
      data,
    });
  },

  delete(goalId: string) {
    return prisma.goal.delete({
      where: { id: goalId },
    });
  },
};
