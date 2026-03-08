import { Response } from 'express';
import { NotificationService } from '../services/notification.service.ts';
import type { AuthRequest } from '../routes/types.ts';
import { logger } from '../lib/logger.ts';

export const NotificationsController = {
  getAll: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
    try {
      const data = await NotificationService.getList(userId, page, limit);
      res.json(data);
    } catch (err) {
      logger.error('Notifications list error', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  },

  markRead: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
      await NotificationService.markAllRead(userId);
      res.json({ success: true });
    } catch (err) {
      logger.error('Mark read error', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  },

  markAllRead: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
      await NotificationService.markAllRead(userId);
      res.json({ success: true });
    } catch (err) {
      logger.error('Mark read all error', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  },

  markOneRead: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { id } = req.params;
    try {
      await NotificationService.markOneRead(userId, id);
      res.json({ success: true });
    } catch (err) {
      logger.error('Mark one read error', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  },

  clearAll: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
      await NotificationService.clearAll(userId);
      res.status(204).send();
    } catch (err) {
      logger.error('Clear all notifications error', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  },

  deleteOne: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { id } = req.params;
    try {
      const deleted = await NotificationService.deleteOne(userId, id);
      if (!deleted) return res.status(404).json({ error: 'NOT_FOUND' });
      res.status(204).send();
    } catch (err) {
      logger.error('Delete notification error', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  },
};
