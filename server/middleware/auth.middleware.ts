import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../src/lib/auth.ts';
import { UserRepository } from '../repositories/user.repository.ts';
import { getCache, setCache } from '../lib/redis.ts';
import type { AuthRequest } from '../routes/types.ts';

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    res.status(401).json({ error: 'UNAUTHORIZED' });
    return;
  }

  try {
    const payload = verifyAccessToken(token) as { sub: string };
    const userId = parseInt(payload.sub, 10);
    if (isNaN(userId)) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const cacheKey = `auth:user:${userId}`;
    let user = await getCache<{
      id: number;
      email: string | null;
      isDeleted: boolean;
      isEmailVerified: boolean;
      plan: string;
      planExpiresAt: Date | null;
      referralProExpiresAt: Date | null;
    }>(cacheKey).catch(() => null);

    if (!user) {
      user = await UserRepository.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          isDeleted: true,
          isEmailVerified: true,
          plan: true,
          planExpiresAt: true,
          referralProExpiresAt: true,
        },
      });
      if (user && !user.isDeleted) {
        await setCache(cacheKey, user, 60).catch(() => null);
      }
    }
    if (!user || user.isDeleted) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    req.user = user;
    req.userId = user.id;
    next();
  } catch {
    res.status(401).json({ error: 'UNAUTHORIZED' });
  }
}

/** Optional auth: attach user if Bearer token present; never 401. Use for routes that need user context (e.g. delayed prices) but are not required to be logged in. */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    next();
    return;
  }
  try {
    const payload = verifyAccessToken(token) as { sub: string };
    const userId = parseInt(payload.sub, 10);
    if (isNaN(userId)) {
      next();
      return;
    }
    const cacheKey = `auth:user:${userId}`;
    let user = await getCache<{
      id: number;
      email: string | null;
      isDeleted: boolean;
      isEmailVerified: boolean;
      plan: string;
      planExpiresAt: Date | null;
      referralProExpiresAt: Date | null;
    }>(cacheKey).catch(() => null);

    if (!user) {
      user = await UserRepository.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          isDeleted: true,
          isEmailVerified: true,
          plan: true,
          planExpiresAt: true,
          referralProExpiresAt: true,
        },
      });
      if (user && !user.isDeleted) {
        await setCache(cacheKey, user, 60).catch(() => null);
      }
    }
    if (user && !user.isDeleted) {
      req.user = user;
      req.userId = user.id;
    }
  } catch {
    // invalid token: continue without user
  }
  next();
}
