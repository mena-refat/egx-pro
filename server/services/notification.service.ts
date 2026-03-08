import { NotificationsRepository } from '../repositories/notifications.repository.ts';

export const NotificationService = {
  async getList(userId: string, page = 1, limit = 20) {
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(50, Math.max(1, limit));
    const [list, total, unreadCount] = await NotificationsRepository.findByUser(userId, pageNum, limitNum);
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
    await NotificationsRepository.markAllRead(userId);
  },

  async markOneRead(userId: string, id: string) {
    await NotificationsRepository.markOneRead(userId, id);
  },

  async clearAll(userId: string) {
    await NotificationsRepository.deleteAllByUser(userId);
  },

  async deleteOne(userId: string, id: string): Promise<boolean> {
    const result = await NotificationsRepository.deleteOne(userId, id);
    return result.count > 0;
  },
};
