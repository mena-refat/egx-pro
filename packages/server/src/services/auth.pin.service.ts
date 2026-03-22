import { UserRepository } from '../repositories/user.repository.ts';
import { RefreshTokenRepository } from '../repositories/refreshToken.repository.ts';
import {
  hashPassword, verifyPassword,
  generateAccessToken, generateRefreshToken, hashRefreshToken,
} from '../lib/auth.ts';
import { buildRefreshTokenData } from '../lib/refreshTokenData.ts';
import { auditLog } from '../lib/audit.ts';
import { AppError } from '../lib/errors.ts';
import {
  REFRESH_TOKEN_AGE_MS, MAX_FAILED_ATTEMPTS, LOCKOUT_MINUTES,
  type AuthContext, toUserPayload,
} from './auth.shared.ts';

/** POST /api/auth/pin/setup — authenticated, stores hashed PIN in DB */
export async function setupPin(userId: number, pin: string): Promise<{ success: true }> {
  if (!/^\d{6}$/.test(pin)) throw new AppError('VALIDATION_ERROR', 400, 'PIN must be exactly 6 digits');
  const { hash, salt } = await hashPassword(pin);
  await UserRepository.update({
    where: { id: userId },
    data: { pinHash: hash, pinSalt: salt } as Record<string, unknown>,
  });
  await auditLog({ userId, action: 'PIN_SETUP', result: 'success' });
  return { success: true };
}

/** DELETE /api/auth/pin — authenticated, verify PIN then wipe from DB */
export async function removePin(userId: number, pin: string): Promise<{ success: true }> {
  if (!/^\d{6}$/.test(pin)) throw new AppError('VALIDATION_ERROR', 400, 'PIN must be exactly 6 digits');
  const user = await UserRepository.findUnique({ where: { id: userId } });
  const u = user as unknown as { pinHash?: string | null; pinSalt?: string | null };
  if (!u?.pinHash || !u?.pinSalt) throw new AppError('PIN_NOT_SET', 400, 'لم يتم إعداد رمز PIN');
  const valid = await verifyPassword(pin, u.pinHash, u.pinSalt);
  if (!valid) throw new AppError('INVALID_PIN', 401, 'رمز PIN غير صحيح');
  await UserRepository.update({
    where: { id: userId },
    data: { pinHash: null, pinSalt: null } as Record<string, unknown>,
  });
  await auditLog({ userId, action: 'PIN_REMOVED', result: 'success' });
  return { success: true };
}

/** POST /api/auth/pin/login — public, verify PIN against DB hash → return tokens */
export async function loginWithPin(
  body: { userId?: number; pin?: string },
  ctx: AuthContext,
): Promise<{ user: unknown; accessToken: string; refreshToken: string }> {
  const { userId, pin } = body;
  if (!userId || !pin || !/^\d{6}$/.test(pin)) {
    throw new AppError('VALIDATION_ERROR', 400, 'userId and 6-digit PIN are required');
  }

  const user = await UserRepository.findUnique({ where: { id: userId } });
  const u = user as unknown as { pinHash?: string | null; pinSalt?: string | null };
  if (!user || !u.pinHash || !u.pinSalt) {
    throw new AppError('INVALID_PIN', 401, 'رمز PIN غير صحيح');
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    const until = user.lockedUntil.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
    throw new AppError('account_locked', 423, `الحساب مقفل حتى ${until}`);
  }

  if ((user as unknown as { isSuspended?: boolean }).isSuspended) {
    throw new AppError('ACCOUNT_SUSPENDED', 403, 'هذا الحساب محظور');
  }

  const valid = await verifyPassword(pin, u.pinHash, u.pinSalt);
  if (!valid) {
    const attempts = (user.failedLoginAttempts ?? 0) + 1;
    const updates: Record<string, unknown> = { failedLoginAttempts: attempts };
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      updates.lockedUntil = new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000);
    }
    await UserRepository.update({ where: { id: user.id }, data: updates });
    await auditLog({ userId: user.id, action: 'LOGIN_FAILED', req: ctx.auditReq ?? undefined, result: 'failure', details: 'wrong_pin' });
    throw new AppError('INVALID_PIN', 401, 'رمز PIN غير صحيح');
  }

  await UserRepository.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: ctx.ip ?? null },
  });

  const accessToken  = generateAccessToken({ id: user.id });
  const refreshToken = generateRefreshToken();
  const refreshHash  = hashRefreshToken(refreshToken);
  const expiresAt    = new Date(Date.now() + REFRESH_TOKEN_AGE_MS);
  const refreshData  = await buildRefreshTokenData(user.id, refreshHash, expiresAt, ctx.ip, ctx.userAgent)
    .catch(() => buildRefreshTokenData(user.id, refreshHash, expiresAt, null, ctx.userAgent));
  await RefreshTokenRepository.create(refreshData);
  await auditLog({ userId: user.id, action: 'LOGIN_SUCCESS', req: ctx.auditReq ?? undefined, result: 'success' });
  return { user: toUserPayload(user), accessToken, refreshToken };
}
