import { randomUUID } from 'node:crypto';
import { UserRepository } from '../repositories/user.repository.ts';
import { RefreshTokenRepository } from '../repositories/refreshToken.repository.ts';
import { ReferralRepository } from '../repositories/referral.repository.ts';
import { generateUniqueReferralCode, checkAndRewardReferrer } from '../lib/referral.ts';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  generate2FATempToken,
  verify2FATempToken,
} from '../../src/lib/auth.ts';
import {
  registerSchema,
  loginSchema,
  normalizePhone,
  isEmailInput,
  isValidEgyptianPhone,
  validateRegisterPassword,
  validateChangePassword,
} from '../../src/lib/validations.ts';
import { auditLog, type AuditReq } from '../lib/audit.ts';
import { setCache } from '../lib/redis.ts';
import { EmailService } from './email.service.ts';
import { logger } from '../lib/logger.ts';
import { sanitizeUser } from '../lib/userSanitize.ts';
import { buildRefreshTokenData } from '../lib/refreshTokenData.ts';
import { AppError } from '../lib/errors.ts';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

const REFRESH_TOKEN_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const LOCKOUT_MINUTES = 30;
const MAX_FAILED_ATTEMPTS = 5;

export type AuthContext = {
  ip?: string | null;
  userAgent?: string | null;
  /** For auditLog; pass from controller req. */
  auditReq?: AuditReq | null;
};

function ensureFullName(payload: Record<string, unknown>, fullName: string | null): void {
  if (typeof payload.fullName !== 'string') payload.fullName = fullName ?? '';
}

function toUserPayload(user: {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  username: string | null;
  onboardingCompleted: boolean | null;
  isFirstLogin: boolean | null;
  [k: string]: unknown;
}) {
  const safe = sanitizeUser(user as Record<string, unknown>);
  const payload = safe ?? {
    id: user.id,
    email: user.email ?? undefined,
    phone: user.phone ?? undefined,
    fullName: user.fullName ?? '',
    username: user.username ?? undefined,
    onboardingCompleted: user.onboardingCompleted,
    isFirstLogin: user.isFirstLogin,
  };
  ensureFullName(payload as Record<string, unknown>, user.fullName);
  return payload;
}

export async function register(
  body: unknown,
  ctx: AuthContext
): Promise<{ user: unknown; accessToken: string; refreshToken: string }> {
  const parsed = registerSchema.parse(body);
  const { fullName, emailOrPhone: raw, password, referralCode: incomingRefCode } = parsed;
  const pwCheck = validateRegisterPassword(password, raw);
  if (!pwCheck.ok) throw new AppError('VALIDATION_ERROR', 400, (pwCheck as { ok: false; message: string }).message);

  const isEmail = isEmailInput(raw);
  const email = isEmail ? raw.toLowerCase().trim() : null;
  let phone: string | null = null;
  if (!isEmail) {
    const digitsOnly = raw.replace(/\D/g, '');
    const normalizedPhone = normalizePhone(digitsOnly);
    if (!isValidEgyptianPhone(normalizedPhone)) {
      throw new AppError('invalid_phone', 400, 'رقم الموبايل غير صحيح');
    }
    phone = normalizedPhone;
  }

  const existingUser =
    email != null && email !== ''
      ? await UserRepository.findFirst({ where: { email } })
      : phone != null && phone !== ''
        ? await UserRepository.findFirst({ where: { phone } })
        : null;
  if (existingUser) {
    throw new AppError(isEmail ? 'Email already registered' : 'Phone number already registered', 400);
  }
  if ((email == null || email === '') && (phone == null || phone === '')) {
    throw new AppError('invalid_input', 400, 'يجب إدخال بريد إلكتروني أو رقم موبايل صحيح');
  }

  const { hash, salt } = await hashPassword(password);
  const referralCode = `EGX-${randomUUID().slice(0, 8).toUpperCase()}`;
  const firstName = fullName.trim().split(/\s+/)[0] || 'user';
  const safeBase = firstName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
  let username = '';
  for (let i = 0; i < 100; i++) {
    const digits = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');
    const candidate = `${safeBase}-${digits}`;
    const exists = await UserRepository.findUnique({ where: { username: candidate } });
    if (!exists) {
      username = candidate;
      break;
    }
  }
  if (!username) username = `${safeBase}-${Date.now().toString().slice(-8)}`;

  const user = await UserRepository.create({
    data: {
      fullName,
      username,
      email: email ?? undefined,
      phone: phone || undefined,
      passwordHash: hash,
      salt,
      referralCode,
      lastPasswordChangeAt: new Date(),
    },
  });

  if (incomingRefCode?.trim()) {
    const referrer = await UserRepository.findUnique({
      where: { referralCode: incomingRefCode.trim().toUpperCase() },
      select: { id: true },
    });
    if (referrer && referrer.id !== user.id) {
      await ReferralRepository.create({
          referrerId: referrer.id,
          referredUserId: user.id,
          status: 'pending',
        });
    }
  }

  // أرسل Welcome email في الخلفية (لا تنتظره)
  if (user.email) {
    EmailService.sendWelcome(user.email, user.fullName ?? 'مستخدم').catch((err) =>
      logger.error('Failed to send welcome email', { err })
    );
    // إرسال كود التحقق من البريد (15 دقيقة)
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    setCache(`email_verify:${user.id}`, verifyCode, 15 * 60).catch(() => {});
    EmailService.sendVerificationCode(user.email, verifyCode).catch((err) =>
      logger.error('Failed to send verification code', { err })
    );
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
  await UserRepository.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), lastLoginIp: ctx.ip || null },
  });

  const userPayload = toUserPayload(user);
  return { user: userPayload, accessToken, refreshToken };
}

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
    data: { failedLoginAttempts: 0, lockedUntil: null },
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

  const referral = await ReferralRepository.findUnique({ referredId: user.id });
  if (referral && !referral.isActive) {
    await ReferralRepository.update({ id: referral.id }, { isActive: true });
    await checkAndRewardReferrer(referral.referrerId);
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
  const userPayload = toUserPayload(user);
  return { user: userPayload, accessToken, refreshToken, ...(restored && { restored: true }) };
}

export async function twoFaAuthenticate(
  body: { tempToken?: string; code?: string },
  ctx: AuthContext
): Promise<{ user: unknown; accessToken: string; refreshToken: string }> {
  const cleanCode = body.code != null ? body.code.toString().replace(/\s/g, '') : '';
  if (!body.tempToken || !body.code || typeof body.code !== 'string' || cleanCode.length !== 6) {
    throw new AppError('Invalid request', 400);
  }
  let userId: string;
  try {
    userId = verify2FATempToken(body.tempToken).userId;
  } catch {
    throw new AppError('invalid_or_expired_token', 401);
  }

  if (!userId) throw new AppError('UNAUTHORIZED', 401);
  const user = await UserRepository.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      fullName: true,
      username: true,
      twoFactorSecret: true,
      onboardingCompleted: true,
      isFirstLogin: true,
    },
  });

  if (!user?.twoFactorSecret) throw new AppError('UNAUTHORIZED', 401);

  const valid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: cleanCode,
    window: 2,
  });
  if (!valid) throw new AppError('invalid_code', 401);

  const referral = await ReferralRepository.findUnique({ referredUserId: user.id });
  if (referral && referral.status !== 'completed') {
    await ReferralRepository.update({ id: referral.id }, { status: 'completed' });
    await checkAndRewardReferrer(referral.referrerId);
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
  await UserRepository.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), lastLoginIp: ctx.ip || null },
  });
  await auditLog({ userId: user.id, action: 'LOGIN_SUCCESS', req: ctx.auditReq ?? undefined, result: 'success', details: '2fa_verified' });
  const userPayload = toUserPayload(user as typeof user & { [k: string]: unknown });
  return { user: userPayload, accessToken, refreshToken };
}

export async function twoFaSetup(userId: string): Promise<{ secret: string; qrCodeUrl: string; manualCode: string }> {
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
    const secret = speakeasy.generateSecret({
      name: `Borsa (${label})`,
      length: 20,
    });
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
  userId: string,
  body: { code?: string },
  ctx?: AuthContext
): Promise<{ success: true }> {
  if (!body.code || typeof body.code !== 'string') throw new AppError('invalid_code', 400, 'الكود مطلوب');
  const cleanCode = body.code.toString().replace(/\s/g, '');
  if (cleanCode.length !== 6) throw new AppError('invalid_code', 400, 'الكود غير صحيح، تأكد من التطبيق وحاول مجدداً');

  const user = await UserRepository.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true },
  });
  if (!user?.twoFactorSecret) throw new AppError('no_secret', 400, 'ابدأ عملية الإعداد أولاً');

  const valid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: cleanCode,
    window: 2,
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
  userId: string,
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
    window: 2,
  });
  if (!valid) throw new AppError('invalid_code', 400);

  await UserRepository.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorEnabledAt: null },
  });
  await auditLog({ userId, action: 'TWO_FA_DISABLED', req: ctx?.auditReq ?? undefined, result: 'success' });
  return { success: true };
}

export async function refresh(refreshTokenCookie: string | undefined): Promise<{ accessToken: string }> {
  if (!refreshTokenCookie) throw new AppError('UNAUTHORIZED', 401);
  const refreshHash = hashRefreshToken(refreshTokenCookie);
  const rt = await RefreshTokenRepository.findByToken(refreshHash);
  const now = new Date();
  if (!rt || rt.isRevoked || rt.expiresAt < now) {
    if (rt?.id) await RefreshTokenRepository.updateMany({ id: rt.id }, { isRevoked: true });
    throw new AppError('UNAUTHORIZED', 401);
  }
  const loginId = rt.user.email ?? rt.user.phone ?? '';
  const accessToken = generateAccessToken({ id: rt.user.id, email: loginId });
  return { accessToken };
}

export async function logout(
  refreshTokenCookie: string | undefined,
  ctx?: AuthContext
): Promise<{ userId?: string }> {
  let userId: string | null = null;
  if (refreshTokenCookie) {
    const refreshHash = hashRefreshToken(refreshTokenCookie);
    const rt = await RefreshTokenRepository.findByTokenSelect(refreshHash, { userId: true });
    if (rt) userId = rt.userId;
    await RefreshTokenRepository.revokeByToken(refreshHash);
  }
  if (userId && ctx?.auditReq) await auditLog({ userId, action: 'LOGOUT', req: ctx.auditReq, result: 'success' });
  return userId ? { userId } : {};
}

export async function logoutAll(
  refreshTokenCookie: string | undefined,
  ctx?: AuthContext
): Promise<void> {
  if (!refreshTokenCookie) return;
  const refreshHash = hashRefreshToken(refreshTokenCookie);
  const rt = await RefreshTokenRepository.findByTokenSelect(refreshHash, { userId: true });
  if (rt) {
    await RefreshTokenRepository.revokeAllByUser(rt.userId);
    if (ctx?.auditReq) await auditLog({ userId: rt.userId, action: 'SESSION_REVOKED', req: ctx.auditReq, result: 'success', details: 'all_sessions' });
  }
}

export async function getSessions(refreshTokenCookie: string | undefined): Promise<
  Array<{
    id: string;
    deviceType?: string;
    browser?: string;
    os?: string;
    deviceInfo?: string | null;
    city?: string | null;
    country?: string | null;
    createdAt: Date;
    expiresAt: Date;
    isCurrentSession: boolean;
  }>
> {
  if (!refreshTokenCookie) throw new AppError('UNAUTHORIZED', 401);
  const refreshHash = hashRefreshToken(refreshTokenCookie);
  const current = await RefreshTokenRepository.findByTokenSelect(refreshHash, { id: true, userId: true });
  if (!current) throw new AppError('UNAUTHORIZED', 401);

  const list = await RefreshTokenRepository.findActiveSessions(current.userId);
  const currentId = current.id;
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
    isCurrentSession: s.id === currentId,
  }));
}

export async function revokeSession(
  refreshTokenCookie: string | undefined,
  tokenId: string,
  ctx?: AuthContext
): Promise<{ userId: string }> {
  if (!refreshTokenCookie) throw new AppError('UNAUTHORIZED', 401);
  const refreshHash = hashRefreshToken(refreshTokenCookie);
  const current = await RefreshTokenRepository.findByTokenSelect(refreshHash, { userId: true });
  if (!current) throw new AppError('UNAUTHORIZED', 401);
  await RefreshTokenRepository.revokeById(tokenId, current.userId);
  if (ctx?.auditReq) await auditLog({ userId: current.userId, action: 'SESSION_REVOKED', req: ctx.auditReq, result: 'success', details: tokenId });
  return { userId: current.userId };
}

export async function changePassword(
  userId: string,
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
  if (user.email) {
    EmailService.sendPasswordChanged(user.email).catch((err) =>
      logger.error('Failed to send password change email', { err })
    );
  }
  if (ctx?.auditReq) await auditLog({ userId, action: 'PASSWORD_CHANGED', req: ctx.auditReq, result: 'success' });
  return { success: true };
}

export async function getMe(refreshTokenCookie: string | undefined): Promise<{ user: unknown; accessToken: string }> {
  if (!refreshTokenCookie) throw new AppError('UNAUTHORIZED', 401, 'No refresh token');
  const refreshHash = hashRefreshToken(refreshTokenCookie);
  const rt = await RefreshTokenRepository.findByToken(refreshHash);
  const now = new Date();
  if (!rt || rt.isRevoked || rt.expiresAt < now) throw new AppError('invalid_or_expired_token', 401, 'Invalid or expired refresh token');

  const loginId = rt.user.email ?? rt.user.phone ?? '';
  const accessToken = generateAccessToken({ id: rt.user.id, email: loginId });
  const userPayload = toUserPayload(rt.user as Parameters<typeof toUserPayload>[0]);
  return { user: userPayload, accessToken };
}

export function getGoogleUrl(): { url: string } {
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
  };
  const qs = new URLSearchParams(options);
  return { url: `${rootUrl}?${qs.toString()}` };
}

export async function googleCallback(
  code: string,
  ctx: AuthContext
): Promise<{ redirectHtml: string; refreshToken: string }> {
  const axios = (await import('axios')).default;
  const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
    grant_type: 'authorization_code',
  });
  const { access_token } = tokenRes.data;
  const userRes = await axios.get(
    `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  const googleUser = userRes.data;

  let user = await UserRepository.findUnique({ where: { email: googleUser.email } });
  if (!user) {
    const referralCode = `EGX-${randomUUID().slice(0, 8).toUpperCase()}`;
    user = await UserRepository.create({
      data: {
        email: googleUser.email,
        fullName: googleUser.name,
        onboardingCompleted: false,
        referralCode,
      },
    });
    EmailService.sendWelcome(user.email!, user.fullName ?? 'مستخدم').catch((err) =>
      logger.error('Failed to send welcome email', { err })
    );
  } else if (!user.referralCode) {
    const referralCode = `EGX-${randomUUID().slice(0, 8).toUpperCase()}`;
    user = await UserRepository.update({
      where: { id: user.id },
      data: { referralCode },
    });
  }

  const refreshToken = generateRefreshToken();
  const refreshHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_AGE_MS);
  const userId = user?.id;
  if (!userId) throw new Error('Unauthorized');
  const refreshData = await buildRefreshTokenData(userId, refreshHash, expiresAt, ctx.ip, ctx.userAgent).catch(() =>
    buildRefreshTokenData(userId, refreshHash, expiresAt, null, ctx.userAgent)
  );
  await RefreshTokenRepository.create(refreshData);

  const origin = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
  const redirectHtml = `
    <html>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, ${JSON.stringify(origin)});
            window.close();
          } else {
            window.location.href = '/';
          }
        </script>
        <p>Authentication successful. This window should close automatically.</p>
      </body>
    </html>
  `;
  return { redirectHtml, refreshToken };
}
