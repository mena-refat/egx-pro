import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../src/lib/auth.ts';
import { UserRepository } from '../repositories/user.repository.ts';
import type { AuthRequest } from '../routes/types.ts';

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  try {
    const payload = verifyAccessToken(token) as { sub: string };
    const user = await UserRepository.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        isDeleted: true,
        plan: true,
        planExpiresAt: true,
        referralProExpiresAt: true,
      },
    });
    if (!user || user.isDeleted) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    req.user = user;
    req.userId = user.id;
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
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
    const user = await UserRepository.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        isDeleted: true,
        plan: true,
        planExpiresAt: true,
        referralProExpiresAt: true,
      },
    });
    if (user && !user.isDeleted) {
      req.user = user;
      req.userId = user.id;
    }
  } catch {
    // invalid token: continue without user
  }
  next();
}
