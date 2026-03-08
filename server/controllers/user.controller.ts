import { Response } from 'express';
import { UserService } from '../services/user.service.ts';
import type { AuthRequest } from '../routes/types.ts';
import { logger } from '../lib/logger.ts';

function userId(req: AuthRequest): string | null {
  return req.user?.id ?? req.userId ?? null;
}

export const UserController = {
  getProfile: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
      const user = await UserService.getProfile(id);
      if (!user) return res.status(404).json({ error: 'NOT_FOUND' });
      res.json({ data: user });
    } catch {
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  },

  updateProfile: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
      const { user } = await UserService.updateProfile(id, req.body, req);
      res.json({ data: user });
    } catch (err) {
      const e = err as Error;
      if (e.message === 'EMAIL_IN_USE') return res.status(400).json({ error: 'EMAIL_ALREADY_EXISTS' });
      if (e.message === 'PHONE_IN_USE') return res.status(400).json({ error: 'PHONE_ALREADY_EXISTS' });
      if (e.message === 'INVALID_PHONE') return res.status(400).json({ error: 'INVALID_PHONE' });
      if (e.message === 'USERNAME_TAKEN') return res.status(400).json({ error: 'USERNAME_TAKEN' });
      if (e.message === 'USERNAME_COOLDOWN') return res.status(400).json({ error: 'USERNAME_COOLDOWN' });
      if (e.message === 'USER_NOT_FOUND') return res.status(404).json({ error: 'NOT_FOUND' });
      logger.error('Update profile error', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  },

  checkUsername: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
      const raw = (req.query.username ?? '') as string;
      const result = await UserService.checkUsername(id, raw);
      if ('error' in result && result.error === 'Username is required') {
        return res.status(400).json({ error: 'VALIDATION_ERROR' });
      }
      res.json({ data: result });
    } catch {
      res.status(400).json({ error: 'VALIDATION_ERROR' });
    }
  },

  getProfileStats: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
      const stats = await UserService.getProfileStats(id);
      if (!stats) return res.status(404).json({ error: 'NOT_FOUND' });
      res.json({ data: stats });
    } catch (err) {
      logger.error('Profile stats error', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  },

  getUnseenAchievements: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
      const list = await UserService.getUnseenAchievements(id);
      res.json({ data: list });
    } catch (err) {
      logger.error('Unseen achievements error', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  },

  markAchievementsSeen: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
      await UserService.markAchievementsSeen(id);
      res.json({ success: true });
    } catch (err) {
      logger.error('Mark achievements seen error:', err);
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  },

  getAchievements: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
      const achievements = await UserService.getAchievements(id);
      res.json({ data: achievements });
    } catch (err) {
      logger.error('Achievements error', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  },

  getReferral: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
      const data = await UserService.getReferralSummary(id);
      if (!data) return res.status(404).json({ error: 'NOT_FOUND' });
      res.json({ data });
    } catch (err) {
      logger.error('Referral summary error', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  },

  redeemReferral: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
      const result = await UserService.redeemReferralReward(id);
      if (result.error === 'User not found') return res.status(404).json({ error: 'NOT_FOUND' });
      if (result.error === 'Reward already claimed') return res.status(400).json({ error: 'REWARD_ALREADY_CLAIMED' });
      if (result.error === 'Not enough referrals yet') return res.status(400).json({ error: 'NOT_ENOUGH_REFERRALS' });
      res.json({ data: (result as { data: unknown }).data });
    } catch (err) {
      logger.error('Referral redeem error:', err);
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  },

  useReferralCode: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
      const { code } = (req.body || {}) as { code?: string };
      const result = await UserService.useReferralCode(id, code ?? '');
      if (result.error === 'Referral code is required') return res.status(400).json({ error: 'VALIDATION_ERROR' });
      if (result.error === 'User not found') return res.status(404).json({ error: 'NOT_FOUND' });
      if (result.error === 'Referral code already used') return res.status(400).json({ error: 'REFERRAL_CODE_ALREADY_USED' });
      if (result.error === 'Invalid referral code') return res.status(400).json({ error: 'INVALID_REFERRAL_CODE' });
      if (result.error === 'You cannot use your own referral code') return res.status(400).json({ error: 'OWN_REFERRAL_CODE' });
      res.json({ success: true, data: { referrerName: (result as { referrerName: string }).referrerName } });
    } catch (err) {
      logger.error('Referral use error', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  },

  getSecurity: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
      const data = await UserService.getSecurity(id);
      if (!data) return res.status(404).json({ error: 'NOT_FOUND' });
      res.json({ data });
    } catch (err) {
      logger.error('Security info error', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  },

  getSessions: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
      const list = await UserService.getSessions(id);
      res.json({ data: list });
    } catch (err) {
      logger.error('Sessions list error:', err);
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  },

  revokeSession: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
      const sessionId = req.params.id;
      await UserService.revokeSession(id, sessionId);
      res.status(204).send();
    } catch (err) {
      logger.error('End session error', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  },

  revokeAllOtherSessions: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
      await UserService.revokeAllOtherSessions(id);
      res.status(200).json({ success: true });
    } catch (err) {
      logger.error('Revoke all sessions error', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  },

  uploadAvatar: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
      const { image } = (req.body || {}) as { image?: string };
      if (!image || typeof image !== 'string') return res.status(400).json({ error: 'VALIDATION_ERROR' });
      const result = await UserService.uploadAvatar(id, image);
      if (result.error === 'Invalid image format') return res.status(400).json({ error: 'INVALID_IMAGE_FORMAT' });
      res.json({ data: { avatarUrl: (result as { avatarUrl: string }).avatarUrl } });
    } catch (err) {
      logger.error('Avatar upload error', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  },

  deleteAccount: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
      const { confirmText, password } = (req.body || {}) as { confirmText?: string; password?: string };
      const result = await UserService.deleteAccount(id, confirmText ?? '', password ?? '', req);
      if (result.error === 'invalid_confirm') return res.status(400).json({ error: 'INVALID_CONFIRM' });
      if (result.error === 'password_required') return res.status(400).json({ error: 'PASSWORD_REQUIRED' });
      if (result.error === 'invalid_account') return res.status(400).json({ error: 'INVALID_ACCOUNT' });
      if (result.error === 'wrong_password') return res.status(400).json({ error: 'WRONG_PASSWORD' });
      const success = result as { deletedAt: Date; deletionScheduledFor: Date };
      res.status(200).json({ success: true, data: { deletedAt: success.deletedAt, deletionScheduledFor: success.deletionScheduledFor } });
    } catch (err) {
      logger.error('Delete account error', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  },
};
