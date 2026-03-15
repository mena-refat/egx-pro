import { Response, NextFunction } from 'express';
import type { AuthRequest } from '../routes/types.ts';

export function requirePro(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'UNAUTHORIZED' });
    return;
  }
  const hasPro =
    user.plan === 'pro' ||
    user.plan === 'yearly' ||
    (user.referralProExpiresAt && new Date(user.referralProExpiresAt) > new Date());

  if (!hasPro) {
    res.status(403).json({
      error: 'pro_required',
      message: 'هذه الميزة متاحة في Pro',
    });
    return;
  }
  next();
}
