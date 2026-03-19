import { UserRepository } from '../repositories/user.repository.ts';
import { RefreshTokenRepository } from '../repositories/refreshToken.repository.ts';
import { ReferralRepository } from '../repositories/referral.repository.ts';
import { checkAndRewardReferrer } from '../lib/referral.ts';
import {
  hashPassword, verifyPassword, generateAccessToken, generateRefreshToken, hashRefreshToken,
} from '../lib/auth.ts';
import {
  loginSchema, normalizePhone, isEmailInput, validateChangePassword,
} from '../lib/validations.ts';
import { auditLog } from '../lib/audit.ts';
import { EmailService } from './email.service.ts';
import { logger } from '../lib/logger.ts';
import { buildRefreshTokenData } from '../lib/refreshTokenData.ts';
import { AppError } from '../lib/errors.ts';
import { prisma } from '../lib/prisma.ts';
import { generate2FATempToken } from '../lib/auth.ts';
import { REFRESH_TOKEN_AGE_MS, LOCKOUT_MINUTES, MAX_FAILED_ATTEMPTS, type AuthContext, toUserPayload } from './auth.shared.ts';

export async function login(
  body: unknown,
  ctx: AuthContext
): Promise<
  | { user: unknown; accessToken: string; refreshToken: string; restored?: boolean }
  | { requires2FA: true; tempToken: string }
> {
  const parsed = loginSchema.parse(body);
  const { emailOrPhone: raw } = parsed;
  const isEmail = isEmailInput(raw);
  const email = isEmail ? raw.toLowerCase().trim() : null;
  const phone = isEmail ? null : normalizePhone(raw);

  let user = email
    ? await UserRepository.findUnique({ where: { email } })
    : await UserRepository.findUnique({ where: { phone } });
  if (!user) {
    await auditLog({ action: 'LOGIN_FAILED', req: ctx.auditReq ?? undefined, result: 'failure', details: 'user_not_found' });
    throw new AppError('account_not_found', 401, 'الحساب ده مش موجود. تقدر تسجّل حساب جديد.');
  }
  if (!user.passwordHash || !user.salt) {
    await auditLog({ userId: user.id, action: 'LOGIN_FAILED', req: ctx.auditReq ?? undefined, result: 'failure', details: 'no_credentials' });
    throw new AppError('UNAUTHORIZED', 401);
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    await auditLog({ userId: user.id, action: 'LOGIN_FAILED', req: ctx.auditReq ?? undefined, result: 'failure', details: 'account_locked' });
    const until = user.lockedUntil.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
    throw new AppError('account_locked', 423, `الحساب مقفل حتى ${until}`);
  }

  const isValid = await verifyPassword(parsed.password, user.passwordHash, user.salt);
  if (!isValid) {
    const attempts = (user.failedLoginAttempts ?? 0) + 1;
    const updates: { failedLoginAttempts: number; lockedUntil?: Date } = { failedLoginAttempts: attempts };
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000);
      updates.lockedUntil = lockedUntil;
      await UserRepository.update({ where: { id: user.id }, data: updates });
      await auditLog({ userId: user.id, action: 'ACCOUNT_LOCKED', req: ctx.auditReq ?? undefined, result: 'failure', details: `locked_until_${lockedUntil.toISOString()}` });
    } else {
      await UserRepository.update({ where: { id: user.id }, data: updates });
    }
    await auditLog({ userId: user.id, action: 'LOGIN_FAILED', req: ctx.auditReq ?? undefined, result: 'failure', details: 'wrong_password' });
    throw new AppError('UNAUTHORIZED', 401);
  }

  await UserRepository.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: ctx.ip || null },
  });

  let restored = false;
  if (user.isDeleted) {
    if (user.deletionScheduledFor && user.deletionScheduledFor < now) {
      await auditLog({ userId: user.id, action: 'LOGIN_FAILED', req: ctx.auditReq ?? undefined, result: 'failure', details: 'account_deleted_after_grace' });
      throw new AppError('account_not_found', 401, 'الحساب ده مش موجود. تقدر تسجّل حساب جديد.');
    }
    user = await UserRepository.update({
      where: { id: user.id },
      data: { isDeleted: false, deletedAt: null, deletionScheduledFor: null },
    });
    restored = true;
  }

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    const tempToken = generate2FATempToken(user.id);
    return { requires2FA: true, tempToken };
  }

  const referral = await ReferralRepository.findUnique({ referredUserId: user.id });
  if (referral && referral.status !== 'completed') {
    const updated = await prisma.referral.updateMany({
      where: { id: referral.id, status: { not: 'completed' } },
      data: { status: 'completed' },
    });
    if (updated.count > 0) await checkAndRewardReferrer(referral.referrerId);
  }

  const loginId = user.email ?? user.phone ?? '';
  const accessToken = generateAccessToken({ id: user.id, email: loginId });
  const refreshToken = generateRefreshToken();
  const refreshHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_AGE_MS);
  const refreshData = await buildRefreshTokenData(user.id, refreshHash, expiresAt, ctx.ip, ctx.userAgent).catch(() =>
    buildRefreshTokenData(user.id, refreshHash, expiresAt, null, ctx.userAgent)
  );
  await RefreshTokenRepository.create(refreshData);
  await auditLog({ userId: user.id, action: 'LOGIN_SUCCESS', req: ctx.auditReq ?? undefined, result: 'success' });
  return { user: toUserPayload(user), accessToken, refreshToken, ...(restored && { restored: true }) };
}

export async function changePassword(
  userId: number,
  body: { currentPassword?: string; newPassword?: string },
  ctx?: AuthContext
): Promise<{ success: true }> {
  if (!body.currentPassword || !body.newPassword) throw new AppError('VALIDATION_ERROR', 400, 'Current and new password are required');

  const user = await UserRepository.findUnique({ where: { id: userId } });
  if (!user || !user.passwordHash || !user.salt) throw new AppError('VALIDATION_ERROR', 400, 'Password change not available for this account');

  const valid = await verifyPassword(body.currentPassword, user.passwordHash, user.salt);
  if (!valid) throw new AppError('wrong_password', 400, 'كلمة المرور الحالية غير صحيحة');

  const pwCheck = validateChangePassword(body.newPassword, { email: user.email ?? undefined, username: user.username ?? undefined });
  if (!pwCheck.ok) throw new AppError('VALIDATION_ERROR', 400, (pwCheck as { ok: false; message: string }).message);

  const { hash, salt } = await hashPassword(body.newPassword);
  await UserRepository.update({
    where: { id: userId },
    data: { passwordHash: hash, salt, lastPasswordChangeAt: new Date() },
  });
  await RefreshTokenRepository.revokeAllByUser(userId);
  if (user.email) {
    EmailService.sendPasswordChanged(user.email).catch((err) =>
      logger.error('Failed to send password change email', { err })
    );
  }
  if (ctx?.auditReq) await auditLog({ userId, action: 'PASSWORD_CHANGED', req: ctx.auditReq, result: 'success' });
  return { success: true };
}
