import { RefreshTokenRepository } from '../repositories/refreshToken.repository.ts';
import {
  generateAccessToken, generateRefreshToken, hashRefreshToken,
} from '../lib/auth.ts';
import { auditLog } from '../lib/audit.ts';
import { buildRefreshTokenData } from '../lib/refreshTokenData.ts';
import { AppError } from '../lib/errors.ts';
import { REFRESH_TOKEN_AGE_MS, type AuthContext, toUserPayload } from './auth.shared.ts';

export async function refresh(
  refreshTokenCookie: string | undefined,
  ctx?: { ip?: string; userAgent?: string }
): Promise<{ accessToken: string; refreshToken: string }> {
  if (!refreshTokenCookie) throw new AppError('UNAUTHORIZED', 401);
  const refreshHash = hashRefreshToken(refreshTokenCookie);
  const rt = await RefreshTokenRepository.findByToken(refreshHash);
  const now = new Date();
  if (!rt || rt.isRevoked || rt.expiresAt < now) {
    if (rt?.id) await RefreshTokenRepository.updateMany({ id: rt.id }, { isRevoked: true });
    throw new AppError('UNAUTHORIZED', 401);
  }

  const newRefreshToken = generateRefreshToken();
  const newRefreshHash = hashRefreshToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_AGE_MS);
  await RefreshTokenRepository.updateMany({ id: rt.id }, { isRevoked: true });
  const refreshData = await buildRefreshTokenData(rt.user.id, newRefreshHash, expiresAt, ctx?.ip ?? null, ctx?.userAgent).catch(() =>
    buildRefreshTokenData(rt.user.id, newRefreshHash, expiresAt, null, ctx?.userAgent)
  );
  await RefreshTokenRepository.create(refreshData);

  const accessToken = generateAccessToken({ id: rt.user.id });
  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(
  refreshTokenCookie: string | undefined,
  ctx?: AuthContext
): Promise<{ userId?: number }> {
  let userId: number | null = null;
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
): Promise<{ userId: number }> {
  if (!refreshTokenCookie) throw new AppError('UNAUTHORIZED', 401);
  const refreshHash = hashRefreshToken(refreshTokenCookie);
  const current = await RefreshTokenRepository.findByTokenSelect(refreshHash, { userId: true });
  if (!current) throw new AppError('UNAUTHORIZED', 401);
  await RefreshTokenRepository.revokeById(tokenId, current.userId);
  if (ctx?.auditReq) await auditLog({ userId: current.userId, action: 'SESSION_REVOKED', req: ctx.auditReq, result: 'success', details: tokenId });
  return { userId: current.userId };
}

export async function getMe(refreshTokenCookie: string | undefined): Promise<{ user: unknown; accessToken: string }> {
  if (!refreshTokenCookie) throw new AppError('UNAUTHORIZED', 401, 'No refresh token');
  const refreshHash = hashRefreshToken(refreshTokenCookie);
  const rt = await RefreshTokenRepository.findByToken(refreshHash);
  const now = new Date();
  if (!rt || rt.isRevoked || rt.expiresAt < now) throw new AppError('invalid_or_expired_token', 401, 'Invalid or expired refresh token');

  if ((rt.user as { isSuspended?: boolean }).isSuspended) {
    throw new AppError('ACCOUNT_SUSPENDED', 403, 'هذا الحساب محظور');
  }

  const accessToken = generateAccessToken({ id: rt.user.id });
  const userPayload = toUserPayload(rt.user as Parameters<typeof toUserPayload>[0]);
  return { user: userPayload, accessToken };
}
