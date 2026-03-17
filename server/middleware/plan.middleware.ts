import { Response, NextFunction } from 'express';
import type { AuthRequest } from '../routes/types.ts';
import { isPro, isUltra } from '../lib/plan.ts';

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
  if (!isPro(user)) {
    res.status(403).json({
      error: 'pro_required',
      message: 'هذه الميزة متاحة في Pro',
    });
    return;
  }
  next();
}

export function requireUltra(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'UNAUTHORIZED' });
    return;
  }
  if (!isUltra(user)) {
    res.status(403).json({
      error: 'ultra_required',
      message: 'هذه الميزة متاحة في Ultra',
    });
    return;
  }
  next();
}

export function requirePaid(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'UNAUTHORIZED' });
    return;
  }
  if (!isPro(user) && !isUltra(user)) {
    res.status(403).json({
      error: 'paid_required',
      message: 'هذه الميزة متاحة في الخطط المدفوعة',
    });
    return;
  }
  next();
}
