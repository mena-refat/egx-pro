import { UserRepository } from '../repositories/user.repository.ts';
import { RefreshTokenRepository } from '../repositories/refreshToken.repository.ts';
import { ReferralRepository } from '../repositories/referral.repository.ts';
import { checkAndRewardReferrer } from '../lib/referral.ts';
import {
  verifyPassword, generateAccessToken, generateRefreshToken, hashRefreshToken,
  verify2FATempToken,
} from '../lib/auth.ts';
import { auditLog } from '../lib/audit.ts';
import { buildRefreshTokenData } from '../lib/refreshTokenData.ts';
import { AppError } from '../lib/errors.ts';
import { prisma } from '../lib/prisma.ts';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { REFRESH_TOKEN_AGE_MS, type AuthContext, toUserPayload } from './auth.shared.ts';

export async function twoFaAuthenticate(
  body: { tempToken?: string; code?: string },
  ctx: AuthContext
): Promise<{ user: unknown; accessToken: string; refreshToken: string }> {
  const cleanCode = body.code != null ? body.code.toString().replace(/\s/g, '') : '';
  if (!body.tempToken || !body.code || typeof body.code !== 'string' || cleanCode.length !== 6) {
    throw new AppError('Invalid request', 400);
  }
  let userId: number;
  try {
    const parsed = parseInt(verify2FATempToken(body.tempToken).userId, 10);
    if (isNaN(parsed)) throw new Error('invalid id');
    userId = parsed;
  } catch {
    throw new AppError('invalid_or_expired_token', 401);
  }

  if (!userId) throw new AppError('UNAUTHORIZED', 401);
  const user = await UserRepository.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, phone: true, fullName: true, username: true,
      twoFactorSecret: true, onboardingCompleted: true, isFirstLogin: true,
    },
  });

  if (!user?.twoFactorSecret) throw new AppError('UNAUTHORIZED', 401);

  const valid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: cleanCode,
    window: 1,
  });
  if (!valid) throw new AppError('invalid_code', 401);

  const referral = await ReferralRepository.findUnique({ referredUserId: user.id });
  if (referral && referral.status !== 'completed') {
    const updated = await prisma.referral.updateMany({
      where: { id: referral.id, status: { not: 'completed' } },
      data: { status: 'completed' },
    });
    if (updated.count > 0) await checkAndRewardReferrer(referral.referrerId);
  }

  const accessToken = generateAccessToken({ id: user.id });
  const refreshToken = generateRefreshToken();
  const refreshHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_AGE_MS);
  const refreshData = await buildRefreshTokenData(user.id, refreshHash, expiresAt, ctx.ip, ctx.userAgent).catch(() =>
    buildRefreshTokenData(user.id, refreshHash, expiresAt, null, ctx.userAgent)
  );
  await RefreshTokenRepository.create(refreshData);
  await UserRepository.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), lastLoginIp: ctx.ip || null },
  });
  await auditLog({ userId: user.id, action: 'LOGIN_SUCCESS', req: ctx.auditReq ?? undefined, result: 'success', details: '2fa_verified' });
  return { user: toUserPayload(user as typeof user & { [k: string]: unknown }), accessToken, refreshToken };
}

export async function twoFaSetup(userId: number): Promise<{ secret: string; qrCodeUrl: string; manualCode: string }> {
  const user = await UserRepository.findUnique({
    where: { id: userId },
    select: { id: true, email: true, twoFactorSecret: true, twoFactorEnabled: true },
  });
  if (!user) throw new AppError('UNAUTHORIZED', 401);
  if (user.twoFactorEnabled) throw new AppError('2fa_already_enabled', 400);

  const label = user.email ?? userId;
  let base32: string;
  if (user.twoFactorSecret) {
    base32 = user.twoFactorSecret;
  } else {
    const secret = speakeasy.generateSecret({ name: `Borsa (${label})`, length: 20 });
    base32 = secret.base32 ?? '';
    await UserRepository.update({
      where: { id: userId },
      data: { twoFactorSecret: base32, twoFactorEnabled: false },
    });
  }
  const otpauthUrl = `otpauth://totp/Borsa:${encodeURIComponent(label)}?secret=${base32}&issuer=Borsa`;
  const qrCodeUrl = await qrcode.toDataURL(otpauthUrl);
  const manualCode = base32.replace(/(.{4})/g, '$1 ').trim();
  return { secret: base32, qrCodeUrl, manualCode };
}

export async function twoFaVerify(
  userId: number,
  body: { code?: string },
  ctx?: AuthContext
): Promise<{ success: true }> {
  if (!body.code || typeof body.code !== 'string') throw new AppError('invalid_code', 400, 'الكود مطلوب');
  const cleanCode = body.code.toString().replace(/\s/g, '');
  if (cleanCode.length !== 6) throw new AppError('invalid_code', 400, 'الكود غير صحيح، تأكد من التطبيق وحاول مجدداً');

  const user = await UserRepository.findUnique({ where: { id: userId }, select: { twoFactorSecret: true } });
  if (!user?.twoFactorSecret) throw new AppError('no_secret', 400, 'ابدأ عملية الإعداد أولاً');

  const valid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: cleanCode,
    window: 1,
  });
  if (!valid) throw new AppError('invalid_code', 400, 'الكود غير صحيح، تأكد من التطبيق وحاول مجدداً');

  await UserRepository.update({
    where: { id: userId },
    data: { twoFactorEnabled: true, twoFactorEnabledAt: new Date() },
  });
  await auditLog({ userId, action: 'TWO_FA_ENABLED', req: ctx?.auditReq ?? undefined, result: 'success' });
  return { success: true };
}

export async function twoFaDisable(
  userId: number,
  body: { code?: string; password?: string },
  ctx?: AuthContext
): Promise<{ success: true }> {
  if (!body.code || typeof body.code !== 'string' || !body.password) throw new AppError('code_and_password_required', 400);
  const cleanCode = body.code.toString().replace(/\s/g, '');
  if (cleanCode.length !== 6) throw new AppError('invalid_code', 400);

  const user = await UserRepository.findUnique({
    where: { id: userId },
    select: { passwordHash: true, salt: true, twoFactorSecret: true },
  });
  if (!user?.passwordHash || !user.salt) throw new AppError('UNAUTHORIZED', 401);
  if (!user.twoFactorSecret) throw new AppError('2FA not enabled', 400);

  const passwordValid = await verifyPassword(body.password, user.passwordHash, user.salt);
  if (!passwordValid) throw new AppError('wrong_password', 401);

  const valid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: cleanCode,
    window: 1,
  });
  if (!valid) throw new AppError('invalid_code', 400);

  await UserRepository.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorEnabledAt: null },
  });
  await auditLog({ userId, action: 'TWO_FA_DISABLED', req: ctx?.auditReq ?? undefined, result: 'success' });
  return { success: true };
}
