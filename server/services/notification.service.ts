import { prisma } from '../lib/prisma.ts';

export const NotificationService = {
  async getList(userId: string, page = 1, limit = 20) {
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(50, Math.max(1, limit));
    const skip = (pageNum - 1) * limitNum;
    const where = { userId };
    const [list, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return {
      notifications: list,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  },

  async markAllRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId },
      data: { isRead: true },
    });
  },

  async markOneRead(userId: string, id: string) {
    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  },

  async clearAll(userId: string) {
    await prisma.notification.deleteMany({
      where: { userId },
    });
  },

  async deleteOne(userId: string, id: string): Promise<boolean> {
    const result = await prisma.notification.deleteMany({
      where: { id, userId },
    });
    return result.count > 0;
  },
};
