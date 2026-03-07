import { Response } from 'express';
import { NotificationService } from '../services/notification.service.ts';
import type { AuthRequest } from '../routes/types.ts';

export const NotificationsController = {
  getAll: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
      const data = await NotificationService.getList(userId);
      res.json(data);
    } catch (err) {
      console.error('Notifications list error:', err);
      res.status(500).json({ error: 'Failed to load notifications' });
    }
  },

  markRead: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
      await NotificationService.markAllRead(userId);
      res.json({ success: true });
    } catch (err) {
      console.error('Mark read error:', err);
      res.status(500).json({ error: 'Failed to mark as read' });
    }
  },

  markAllRead: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
      await NotificationService.markAllRead(userId);
      res.json({ success: true });
    } catch (err) {
      console.error('Mark read all error:', err);
      res.status(500).json({ error: 'Failed to mark as read' });
    }
  },

  markOneRead: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const { id } = req.params;
    try {
      await NotificationService.markOneRead(userId, id);
      res.json({ success: true });
    } catch (err) {
      console.error('Mark one read error:', err);
      res.status(500).json({ error: 'Failed to mark as read' });
    }
  },

  clearAll: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
      await NotificationService.clearAll(userId);
      res.status(204).send();
    } catch (err) {
      console.error('Clear all notifications error:', err);
      res.status(500).json({ error: 'Failed to clear' });
    }
  },

  deleteOne: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const { id } = req.params;
    try {
      const deleted = await NotificationService.deleteOne(userId, id);
      if (!deleted) return res.status(404).json({ error: 'Not found' });
      res.status(204).send();
    } catch (err) {
      console.error('Delete notification error:', err);
      res.status(500).json({ error: 'Failed to delete' });
    }
  },
};
