import { Response, NextFunction } from 'express';
import { UserService } from '../services/user.service.ts';
import type { AuthRequest } from '../routes/types.ts';
import { logger } from '../lib/logger.ts';
import { sendSuccess, sendError } from '../lib/apiResponse.ts';
import { AppError } from '../lib/errors.ts';

function userId(req: AuthRequest): string | null {
  return req.user?.id ?? req.userId ?? null;
}

export const UserController = {
  getProfile: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return sendError(res, 'UNAUTHORIZED', 401);
    try {
      const user = await UserService.getProfile(id);
      if (!user) return sendError(res, 'NOT_FOUND', 404);
      sendSuccess(res, user);
    } catch {
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },

  updateProfile: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return sendError(res, 'UNAUTHORIZED', 401);
    try {
      const { user } = await UserService.updateProfile(id, req.body, req);
      sendSuccess(res, user);
    } catch (err) {
      const e = err as Error;
      if (e.message === 'EMAIL_IN_USE') return sendError(res, 'EMAIL_ALREADY_EXISTS', 400);
      if (e.message === 'PHONE_IN_USE') return sendError(res, 'PHONE_ALREADY_EXISTS', 400);
      if (e.message === 'INVALID_PHONE') return sendError(res, 'INVALID_PHONE', 400);
      if (e.message === 'USERNAME_TAKEN') return sendError(res, 'USERNAME_TAKEN', 400);
      if (e.message === 'USERNAME_COOLDOWN') return sendError(res, 'USERNAME_COOLDOWN', 400);
      if (e.message === 'USER_NOT_FOUND') return sendError(res, 'NOT_FOUND', 404);
      logger.error('Update profile error', { err });
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },

  checkUsername: async (req: AuthRequest, res: Response, next: NextFunction) => {
    const id = userId(req);
    if (!id) return sendError(res, 'UNAUTHORIZED', 401);
    try {
      const raw = (req.query.username ?? '') as string;
      const result = await UserService.checkUsername(id, raw);
      sendSuccess(res, result);
    } catch (err) {
      if (err instanceof AppError) return next(err);
      sendError(res, 'VALIDATION_ERROR', 400);
    }
  },

  getProfileStats: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return sendError(res, 'UNAUTHORIZED', 401);
    try {
      const stats = await UserService.getProfileStats(id);
      if (!stats) return sendError(res, 'NOT_FOUND', 404);
      sendSuccess(res, stats);
    } catch (err) {
      logger.error('Profile stats error', { err });
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },

  getUnseenAchievements: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return sendError(res, 'UNAUTHORIZED', 401);
    try {
      const list = await UserService.getUnseenAchievements(id);
      sendSuccess(res, list);
    } catch (err) {
      logger.error('Unseen achievements error', { err });
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },

  markAchievementsSeen: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return sendError(res, 'UNAUTHORIZED', 401);
    try {
      await UserService.markAchievementsSeen(id);
      sendSuccess(res, { success: true });
    } catch (err) {
      logger.error('Mark achievements seen error:', err);
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },

  getAchievements: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return sendError(res, 'UNAUTHORIZED', 401);
    try {
      const achievements = await UserService.getAchievements(id);
      sendSuccess(res, achievements);
    } catch (err) {
      logger.error('Achievements error', { err });
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },

  getReferral: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return sendError(res, 'UNAUTHORIZED', 401);
    try {
      const data = await UserService.getReferralSummary(id);
      if (!data) return sendError(res, 'NOT_FOUND', 404);
      sendSuccess(res, data);
    } catch (err) {
      logger.error('Referral summary error', { err });
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },

  redeemReferral: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return sendError(res, 'UNAUTHORIZED', 401);
    try {
      const result = await UserService.redeemReferralReward(id);
      if (result.error === 'User not found') return sendError(res, 'NOT_FOUND', 404);
      if (result.error === 'Reward already claimed') return sendError(res, 'REWARD_ALREADY_CLAIMED', 400);
      if (result.error === 'Not enough referrals yet') return sendError(res, 'NOT_ENOUGH_REFERRALS', 400);
      sendSuccess(res, (result as { data: unknown }).data);
    } catch (err) {
      logger.error('Referral redeem error:', err);
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },

  applyReferralCode: async (req: AuthRequest, res: Response, next: NextFunction) => {
    const id = userId(req);
    if (!id) return sendError(res, 'UNAUTHORIZED', 401);
    try {
      const { code } = (req.body || {}) as { code?: string };
      const result = await UserService.applyReferralCode(id, code ?? '');
      sendSuccess(res, { success: true, referrerName: (result as { referrerName: string }).referrerName });
    } catch (err) {
      if (err instanceof AppError) return next(err);
      logger.error('Referral use error', { err });
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },

  getSecurity: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return sendError(res, 'UNAUTHORIZED', 401);
    try {
      const data = await UserService.getSecurity(id);
      if (!data) return sendError(res, 'NOT_FOUND', 404);
      sendSuccess(res, data);
    } catch (err) {
      logger.error('Security info error', { err });
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },

  getSessions: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return sendError(res, 'UNAUTHORIZED', 401);
    try {
      const list = await UserService.getSessions(id);
      sendSuccess(res, list);
    } catch (err) {
      logger.error('Sessions list error:', err);
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },

  revokeSession: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return sendError(res, 'UNAUTHORIZED', 401);
    try {
      const sessionId = req.params.id;
      await UserService.revokeSession(id, sessionId);
      res.status(204).send();
    } catch (err) {
      logger.error('End session error', { err });
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },

  revokeAllOtherSessions: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return sendError(res, 'UNAUTHORIZED', 401);
    try {
      await UserService.revokeAllOtherSessions(id);
      sendSuccess(res, { success: true });
    } catch (err) {
      logger.error('Revoke all sessions error', { err });
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },

  uploadAvatar: async (req: AuthRequest, res: Response, next: NextFunction) => {
    const id = userId(req);
    if (!id) return sendError(res, 'UNAUTHORIZED', 401);
    try {
      const { image } = (req.body || {}) as { image?: string };
      if (!image || typeof image !== 'string') return sendError(res, 'VALIDATION_ERROR', 400);
      const result = await UserService.uploadAvatar(id, image);
      sendSuccess(res, { avatarUrl: (result as { avatarUrl: string }).avatarUrl });
    } catch (err) {
      if (err instanceof AppError) return next(err);
      logger.error('Avatar upload error', { err });
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },

  deleteAccount: async (req: AuthRequest, res: Response, next: NextFunction) => {
    const id = userId(req);
    if (!id) return sendError(res, 'UNAUTHORIZED', 401);
    try {
      const { confirmText, password } = (req.body || {}) as { confirmText?: string; password?: string };
      const result = await UserService.deleteAccount(id, confirmText ?? '', password ?? '', req);
      const success = result as { deletedAt: Date; deletionScheduledFor: Date };
      sendSuccess(res, { deletedAt: success.deletedAt, deletionScheduledFor: success.deletionScheduledFor });
    } catch (err) {
      if (err instanceof AppError) return next(err);
      logger.error('Delete account error', { err });
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },
};
