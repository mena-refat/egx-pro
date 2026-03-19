import { prisma } from '../lib/prisma.ts';

export const NotificationsRepository = {
  findByUser(userId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
  },

  markAllRead(userId: number) {
    return prisma.notification.updateMany({
      where: { userId },
      data: { isRead: true },
    });
  },

  markOneRead(userId: number, id: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  },

  deleteAllByUser(userId: number) {
    return prisma.notification.deleteMany({ where: { userId } });
  },

  deleteOne(userId: number, id: string) {
    return prisma.notification.deleteMany({ where: { id, userId } });
  },
};
