import fs from 'fs';
import path from 'path';
import { randomUUID } from 'node:crypto';
import { UserRepository } from '../repositories/user.repository.ts';
import { RefreshTokenRepository } from '../repositories/refreshToken.repository.ts';
import { ReferralRepository } from '../repositories/referral.repository.ts';
import { createNotification } from '../lib/createNotification.ts';
import { auditLog } from '../lib/audit.ts';
import { verifyPassword, hashRefreshToken } from '../lib/auth.ts';
import { AppError } from '../lib/errors.ts';
import { REFERRAL_REQUIRED } from '../lib/constants/plans.ts';

export const UserAccountService = {
  async getSecurity(userId: number) {
    const user = await UserRepository.findUnique({
      where: { id: userId },
      select: {
        lastPasswordChangeAt: true, twoFactorEnabled: true, twoFactorEnabledAt: true,
        createdAt: true, lastLoginAt: true, lastLoginIp: true,
      },
    });
    if (!user) return null;
    return {
      lastPasswordChangeAt: user.lastPasswordChangeAt,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorEnabledAt: user.twoFactorEnabledAt ?? undefined,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp,
    };
  },

  async getReferralSummary(userId: number) {
    let user = await UserRepository.findUnique({
      where: { id: userId },
      select: { referralCode: true, freeReferralRewarded: true, totalReferrals: true },
    });
    if (!user) return null;
    if (!user.referralCode) {
      const referralCode = `EGX-${randomUUID().slice(0, 8).toUpperCase()}`;
      user = await UserRepository.update({
        where: { id: userId },
        data: { referralCode },
        select: { referralCode: true, freeReferralRewarded: true, totalReferrals: true },
      }) as typeof user;
    }
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const [completedCount, completedReferralsRaw, weeklyJoinedCount] = await Promise.all([
      ReferralRepository.countActiveByReferrer(userId),
      ReferralRepository.findByReferrer(userId, {
        take: 5,
        orderBy: { createdAt: 'asc' } as object,
        include: { referredUser: { select: { fullName: true, createdAt: true } } },
      }),
      ReferralRepository.countActiveByReferrerSince(userId, weekAgo),
    ]);
    type RefWithUser = { referredUserId: number; referredUser?: { fullName: string | null } };
    const completedReferrals = completedReferralsRaw as RefWithUser[];
    const friends = completedReferrals.map((ref, index) => ({
      id: ref.referredUserId,
      name: ref.referredUser?.fullName ?? null,
      order: index + 1,
    }));
    return {
      code: user.referralCode,
      completedCount,
      goal: 5,
      rewardClaimed: user.freeReferralRewarded,
      totalReferrals: user.totalReferrals ?? completedCount,
      friends,
      weeklyJoinedCount,
    };
  },

  async redeemReferralReward(userId: number) {
    const user = await UserRepository.findUnique({
      where: { id: userId },
      select: { freeReferralRewarded: true, plan: true, planExpiresAt: true },
    });
    if (!user) throw new AppError('NOT_FOUND', 404, 'User not found');
    if (user.freeReferralRewarded) throw new AppError('REWARD_ALREADY_CLAIMED', 400, 'المكافأة تم استلامها بالفعل');
    const completedCount = await ReferralRepository.countActiveByReferrer(userId);
    if (completedCount < REFERRAL_REQUIRED) throw new AppError('NOT_ENOUGH_REFERRALS', 400, `محتاج ${REFERRAL_REQUIRED} دعوات ناجحة على الأقل`);
    const now = new Date();
    let startsFrom = now;
    if (user.planExpiresAt && user.planExpiresAt > now) startsFrom = user.planExpiresAt;
    const newEndsAt = new Date(startsFrom);
    newEndsAt.setMonth(newEndsAt.getMonth() + 1);
    const updated = await UserRepository.update({
      where: { id: userId },
      data: { plan: 'pro', planExpiresAt: newEndsAt, freeReferralRewarded: true },
      select: { plan: true, planExpiresAt: true, freeReferralRewarded: true },
    });
    return { data: updated };
  },

  async applyReferralCode(userId: number, code: string) {
    const trimmed = (code || '').trim().toUpperCase();
    if (!trimmed) throw new AppError('VALIDATION_ERROR', 400, 'Referral code is required');
    const currentUser = await UserRepository.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, referralUsed: true },
    });
    if (!currentUser) throw new AppError('NOT_FOUND', 404, 'User not found');
    if (currentUser.referralUsed) throw new AppError('REFERRAL_CODE_ALREADY_USED', 400, 'Referral code already used');
    const referrer = await UserRepository.findFirst({
      where: { referralCode: trimmed },
      select: { id: true, fullName: true },
    });
    if (!referrer) throw new AppError('INVALID_REFERRAL_CODE', 400, 'Invalid referral code');
    if (referrer.id === currentUser.id) throw new AppError('OWN_REFERRAL_CODE', 400, 'You cannot use your own referral code');
    await ReferralRepository.applyReferralCodeTransaction(referrer.id, currentUser.id, trimmed);
    const { checkAndRewardReferrer } = await import('../lib/referral.ts');
    await checkAndRewardReferrer(referrer.id);
    await createNotification(
      referrer.id,
      'referral',
      'دعوة ناجحة',
      currentUser.fullName ? `صديقك ${currentUser.fullName} انضم بكودك` : 'صديق انضم بكودك'
    );
    return { success: true, referrerName: referrer.fullName || 'صاحب الدعوة' };
  },

  async getSessions(userId: number, currentRefreshToken?: string) {
    const list = await RefreshTokenRepository.findActiveSessions(userId);
    let currentSessionId: string | null = null;
    if (currentRefreshToken) {
      const hash = hashRefreshToken(currentRefreshToken);
      const current = await RefreshTokenRepository.findByTokenSelect(hash, { id: true });
      if (current) currentSessionId = (current as { id: string }).id;
    }
    return list.map((s) => ({
      id: s.id,
      deviceType: s.deviceType ?? undefined,
      browser: s.browser ?? undefined,
      os: s.os ?? undefined,
      deviceInfo: s.deviceInfo ?? undefined,
      city: s.city ?? undefined,
      country: s.country ?? undefined,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrentSession: currentSessionId ? s.id === currentSessionId : false,
    }));
  },

  async revokeSession(userId: number, sessionId: string) {
    await RefreshTokenRepository.updateMany({ id: sessionId, userId }, { isRevoked: true });
  },

  async revokeAllOtherSessions(userId: number, currentRefreshToken?: string) {
    if (currentRefreshToken) {
      const hash = hashRefreshToken(currentRefreshToken);
      const current = await RefreshTokenRepository.findByTokenSelect(hash, { id: true });
      if (current) {
        await RefreshTokenRepository.revokeAllByUserExcept(userId, (current as { id: string }).id);
        return;
      }
    }
    await RefreshTokenRepository.revokeAllByUser(userId);
  },

  async uploadAvatar(userId: number, imageBase64: string) {
    const matches = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) throw new AppError('INVALID_IMAGE_FORMAT', 400, 'Invalid image format');
    const base64Data = matches[2];
    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64Data, 'base64');
    } catch {
      throw new AppError('INVALID_IMAGE_FORMAT', 400, 'Invalid image format');
    }
    const MAX_AVATAR_BYTES = 500 * 1024;
    if (buffer.length > MAX_AVATAR_BYTES) throw new AppError('INVALID_IMAGE_FORMAT', 400, 'Invalid image format');
    const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const JPEG_SIG = Buffer.from([0xff, 0xd8, 0xff]);
    const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIG);
    const isJpeg = buffer.length >= 3 && buffer.subarray(0, 3).equals(JPEG_SIG);
    if (!isPng && !isJpeg) throw new AppError('INVALID_IMAGE_FORMAT', 400, 'Invalid image format');
    const sharp = (await import('sharp')).default;
    const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filename = `${randomUUID()}.webp`;
    const filePath = path.join(uploadsDir, filename);
    await sharp(buffer)
      .resize(400, 400, { fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .rotate()
      .toFile(filePath);
    const publicUrl = `/uploads/avatars/${filename}`;
    const user = await UserRepository.update({
      where: { id: userId },
      data: { avatarUrl: publicUrl },
      select: { avatarUrl: true },
    });
    return { avatarUrl: user.avatarUrl };
  },

  async deleteAccount(userId: number, confirmText: string, password: string, req?: import('express').Request) {
    const normalized = (confirmText || '').trim().toUpperCase();
    if (normalized !== 'حذف' && normalized !== 'DELETE') {
      throw new AppError('INVALID_CONFIRM', 400, 'يرجى كتابة "حذف" أو "DELETE" للتأكيد');
    }
    if (!password || typeof password !== 'string') {
      throw new AppError('PASSWORD_REQUIRED', 400, 'كلمة المرور مطلوبة');
    }
    const user = await UserRepository.findUnique({
      where: { id: userId },
      select: { passwordHash: true, salt: true },
    });
    if (!user?.passwordHash || !user.salt) {
      throw new AppError('INVALID_ACCOUNT', 400, 'تعذر التحقق من الحساب');
    }
    const valid = await verifyPassword(password, user.passwordHash, user.salt);
    if (!valid) throw new AppError('WRONG_PASSWORD', 400, 'كلمة المرور غير صحيحة');
    const now = new Date();
    const deletionDate = new Date(now);
    deletionDate.setDate(deletionDate.getDate() + 30);
    await UserRepository.update({
      where: { id: userId },
      data: { isDeleted: true, deletedAt: now, deletionScheduledFor: deletionDate },
    });
    if (req) {
      await auditLog({
        userId, action: 'ACCOUNT_DELETED', req, result: 'success',
        details: `scheduled_${deletionDate.toISOString()}`,
      });
    }
    await RefreshTokenRepository.deleteManyByUser(userId);
    return { success: true, deletedAt: now, deletionScheduledFor: deletionDate };
  },
};
