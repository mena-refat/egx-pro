import { randomUUID } from 'node:crypto';
import { UserRepository } from '../repositories/user.repository.ts';
import { RefreshTokenRepository } from '../repositories/refreshToken.repository.ts';
import { ReferralRepository } from '../repositories/referral.repository.ts';
import {
  hashPassword, generateAccessToken, generateRefreshToken, hashRefreshToken,
} from '../lib/auth.ts';
import {
  registerSchema, normalizePhone, isEmailInput, isValidEgyptianPhone, validateRegisterPassword,
} from '../lib/validations.ts';
import { EmailService } from './email.service.ts';
import { logger } from '../lib/logger.ts';
import { buildRefreshTokenData } from '../lib/refreshTokenData.ts';
import { AppError } from '../lib/errors.ts';
import { prisma } from '../lib/prisma.ts';
import { setCache } from '../lib/redis.ts';
import { REFRESH_TOKEN_AGE_MS, type AuthContext, toUserPayload } from './auth.shared.ts';

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

  if (email) {
    const emailBlocked = await prisma.blockedIdentifier.findFirst({
      where: {
        OR: [
          { type: 'EMAIL', value: email },
          { type: 'EMAIL_DOMAIN', value: email.split('@')[1] ?? '' },
        ],
      },
    });
    if (emailBlocked) throw new AppError('ACCOUNT_BLOCKED', 403);
  }
  if (phone) {
    const phoneBlocked = await prisma.blockedIdentifier.findFirst({ where: { type: 'PHONE', value: phone } });
    if (phoneBlocked) throw new AppError('ACCOUNT_BLOCKED', 403);
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
    if (!exists) { username = candidate; break; }
  }
  if (!username) username = `${safeBase}-${Date.now().toString().slice(-8)}`;

  const user = await UserRepository.create({
    data: {
      fullName, username,
      email: email ?? undefined,
      phone: phone || undefined,
      passwordHash: hash, salt, referralCode,
      lastPasswordChangeAt: new Date(),
    },
  });

  if (incomingRefCode?.trim()) {
    const referrer = await UserRepository.findUnique({
      where: { referralCode: incomingRefCode.trim().toUpperCase() },
      select: { id: true },
    });
    if (referrer && referrer.id !== user.id) {
      await ReferralRepository.create({ referrerId: referrer.id, referredUserId: user.id, status: 'pending' });
    }
  }

  if (user.email) {
    EmailService.sendWelcome(user.email, user.fullName ?? 'مستخدم').catch((err) =>
      logger.error('Failed to send welcome email', { err })
    );
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
  await UserRepository.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: ctx.ip || null } });

  return { user: toUserPayload(user), accessToken, refreshToken };
}
