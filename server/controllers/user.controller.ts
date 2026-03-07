import { Response } from 'express';
import { UserService } from '../services/user.service.ts';
import type { AuthRequest } from '../routes/types.ts';

function userId(req: AuthRequest): string | null {
  return req.user?.id ?? req.userId ?? null;
}

export const UserController = {
  getProfile: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    try {
      const user = await UserService.getProfile(id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  updateProfile: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    try {
      const { user } = await UserService.updateProfile(id, req.body, req);
      res.json(user);
    } catch (err) {
      const e = err as Error;
      if (e.message === 'EMAIL_IN_USE') return res.status(400).json({ error: 'Email already used' });
      if (e.message === 'PHONE_IN_USE') return res.status(400).json({ error: 'Phone number already used' });
      if (e.message === 'INVALID_PHONE') return res.status(400).json({ error: 'invalid_phone', message: 'رقم الموبايل غير صحيح' });
      if (e.message === 'USERNAME_TAKEN') return res.status(400).json({ error: 'Username already taken' });
      if (e.message === 'USERNAME_COOLDOWN') {
        const remaining = (e as Error & { remainingDays?: number }).remainingDays ?? 0;
        return res.status(400).json({ error: `يمكنك تغيير اسم المستخدم مرة أخرى بعد ${remaining} يوم` });
      }
      if (e.message === 'USER_NOT_FOUND') return res.status(404).json({ error: 'User not found' });
      console.error('Update profile error:', err);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  },

  checkUsername: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    try {
      const raw = (req.query.username ?? '') as string;
      const result = await UserService.checkUsername(id, raw);
      if ('error' in result && result.error === 'Username is required') {
        return res.status(400).json({ error: result.error });
      }
      res.json(result);
    } catch {
      res.status(400).json({ error: 'Invalid username format' });
    }
  },

  getProfileStats: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    try {
      const stats = await UserService.getProfileStats(id);
      if (!stats) return res.status(404).json({ error: 'User not found' });
      res.json(stats);
    } catch (err) {
      console.error('Profile stats error:', err);
      res.status(500).json({ error: 'Failed to load profile stats' });
    }
  },

  getUnseenAchievements: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    try {
      const list = await UserService.getUnseenAchievements(id);
      res.json(list);
    } catch (err) {
      console.error('Unseen achievements error:', err);
      res.status(500).json({ error: 'Failed to load unseen achievements' });
    }
  },

  markAchievementsSeen: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    try {
      await UserService.markAchievementsSeen(id);
      res.json({ success: true });
    } catch (err) {
      console.error('Mark achievements seen error:', err);
      res.status(500).json({ error: 'Failed to mark as seen' });
    }
  },

  getAchievements: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    try {
      const achievements = await UserService.getAchievements(id);
      res.json(achievements);
    } catch (err) {
      console.error('Achievements error:', err);
      res.status(500).json({ error: 'Failed to load achievements' });
    }
  },

  getReferral: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    try {
      const data = await UserService.getReferralSummary(id);
      if (!data) return res.status(404).json({ error: 'User not found' });
      res.json(data);
    } catch (err) {
      console.error('Referral summary error:', err);
      res.status(500).json({ error: 'Failed to load referral data' });
    }
  },

  redeemReferral: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    try {
      const result = await UserService.redeemReferralReward(id);
      if (result.error === 'User not found') return res.status(404).json({ error: 'User not found' });
      if (result.error === 'Reward already claimed') return res.status(400).json({ error: 'Reward already claimed' });
      if (result.error === 'Not enough referrals yet') return res.status(400).json({ error: 'Not enough referrals yet' });
      res.json(result.data);
    } catch (err) {
      console.error('Referral redeem error:', err);
      res.status(500).json({ error: 'Failed to redeem referral reward' });
    }
  },

  useReferralCode: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    try {
      const { code } = (req.body || {}) as { code?: string };
      const result = await UserService.useReferralCode(id, code ?? '');
      if (result.error === 'Referral code is required') return res.status(400).json({ error: result.error });
      if (result.error === 'User not found') return res.status(404).json({ error: 'User not found' });
      if (result.error === 'Referral code already used') return res.status(400).json({ error: result.error });
      if (result.error === 'Invalid referral code') return res.status(400).json({ error: result.error });
      if (result.error === 'You cannot use your own referral code') return res.status(400).json({ error: result.error });
      res.json({ success: true, referrerName: result.referrerName });
    } catch (err) {
      console.error('Referral use error:', err);
      res.status(500).json({ error: 'Failed to apply referral code' });
    }
  },

  getSecurity: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    try {
      const data = await UserService.getSecurity(id);
      if (!data) return res.status(404).json({ error: 'User not found' });
      res.json(data);
    } catch (err) {
      console.error('Security info error:', err);
      res.status(500).json({ error: 'Failed to load security info' });
    }
  },

  getSessions: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    try {
      const list = await UserService.getSessions(id);
      res.json(list);
    } catch (err) {
      console.error('Sessions list error:', err);
      res.status(500).json({ error: 'Failed to load sessions' });
    }
  },

  revokeSession: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    try {
      const sessionId = req.params.id;
      await UserService.revokeSession(id, sessionId);
      res.status(204).send();
    } catch (err) {
      console.error('End session error:', err);
      res.status(500).json({ error: 'Failed to end session' });
    }
  },

  revokeAllOtherSessions: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    try {
      await UserService.revokeAllOtherSessions(id);
      res.status(200).json({ message: 'All other sessions ended' });
    } catch (err) {
      console.error('Revoke all sessions error:', err);
      res.status(500).json({ error: 'Failed to end sessions' });
    }
  },

  uploadAvatar: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    try {
      const { image } = (req.body || {}) as { image?: string };
      if (!image || typeof image !== 'string') return res.status(400).json({ error: 'Image is required' });
      const result = await UserService.uploadAvatar(id, image);
      if (result.error === 'Invalid image format') return res.status(400).json({ error: result.error });
      res.json({ avatarUrl: result.avatarUrl });
    } catch (err) {
      console.error('Avatar upload error:', err);
      res.status(500).json({ error: 'Failed to upload avatar' });
    }
  },

  deleteAccount: async (req: AuthRequest, res: Response) => {
    const id = userId(req);
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    try {
      const { confirmText, password } = (req.body || {}) as { confirmText?: string; password?: string };
      const result = await UserService.deleteAccount(id, confirmText ?? '', password ?? '', req);
      if (result.error === 'invalid_confirm') return res.status(400).json({ error: result.error, message: result.message });
      if (result.error === 'password_required') return res.status(400).json({ error: result.error, message: result.message });
      if (result.error === 'invalid_account') return res.status(400).json({ error: result.error, message: result.message });
      if (result.error === 'wrong_password') return res.status(400).json({ error: result.error, message: result.message });
      res.status(200).json({
        success: true,
        deletedAt: result.deletedAt,
        deletionScheduledFor: result.deletionScheduledFor,
      });
    } catch (err) {
      console.error('Delete account error:', err);
      res.status(500).json({ error: 'Failed to delete account' });
    }
  },
};
