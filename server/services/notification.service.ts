import { prisma } from '../lib/prisma.ts';

export const NotificationService = {
  async getList(userId: string) {
    const [list, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { notifications: list, unreadCount };
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
