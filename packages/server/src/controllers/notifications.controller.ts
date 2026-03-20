import { Response } from 'express';
import { NotificationService } from '../services/notification.service.ts';
import type { AuthRequest } from '../routes/types.ts';
import { logger } from '../lib/logger.ts';
import { sendSuccess, sendError } from '../lib/apiResponse.ts';

export const NotificationsController = {
  getAll: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return sendError(res, 'UNAUTHORIZED', 401);
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
    try {
      const data = await NotificationService.getList(userId, page, limit);
      sendSuccess(res, data);
    } catch (err) {
      logger.error('Notifications list error', { err });
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },

  markRead: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return sendError(res, 'UNAUTHORIZED', 401);
    try {
      await NotificationService.markAllRead(userId);
      sendSuccess(res, { success: true });
    } catch (err) {
      logger.error('Mark read error', { err });
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },

  markAllRead: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return sendError(res, 'UNAUTHORIZED', 401);
    try {
      await NotificationService.markAllRead(userId);
      sendSuccess(res, { success: true });
    } catch (err) {
      logger.error('Mark read all error', { err });
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },

  markOneRead: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return sendError(res, 'UNAUTHORIZED', 401);
    const { id } = req.params;
    try {
      await NotificationService.markOneRead(userId, id);
      sendSuccess(res, { success: true });
    } catch (err) {
      logger.error('Mark one read error', { err });
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },

  clearAll: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return sendError(res, 'UNAUTHORIZED', 401);
    try {
      await NotificationService.clearAll(userId);
      sendSuccess(res, { success: true });
    } catch (err) {
      logger.error('Clear all notifications error', { err });
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },

  deleteOne: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return sendError(res, 'UNAUTHORIZED', 401);
    const { id } = req.params;
    try {
      const deleted = await NotificationService.deleteOne(userId, id);
      if (!deleted) return sendError(res, 'NOT_FOUND', 404);
      sendSuccess(res, { success: true });
    } catch (err) {
      logger.error('Delete notification error', { err });
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },
};
