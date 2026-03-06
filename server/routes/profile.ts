import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.ts';
import { verifyAccessToken } from '../../src/lib/auth.ts';
import { AuthRequest } from './types';

const router = Router();

const authenticate = async (req: AuthRequest, res: Response, next: () => void) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const decoded = verifyAccessToken(authHeader.split(' ')[1]) as { sub: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, isDeleted: true },
    });
    if (!user || user.isDeleted) return res.status(401).json({ error: 'unauthorized' });
    req.userId = decoded.sub;
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
};

const WEIGHT = 20;

/** GET /api/profile/completion — percentage + missing items with routes */
router.get('/completion', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const [user, goalsCount, watchlistCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, phone: true, username: true },
      }),
      prisma.goal.count({ where: { userId } }),
      prisma.watchlist.count({ where: { userId } }),
    ]);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const hasEmail = Boolean(user.email?.trim());
    const hasPhone = Boolean(user.phone?.trim());
    const hasUsername = Boolean(user.username?.trim());
    const hasGoal = goalsCount >= 1;
    const hasWatchlist = watchlistCount >= 1;

    const checks = [
      { field: 'email' as const, ok: hasEmail },
      { field: 'phone' as const, ok: hasPhone },
      { field: 'username' as const, ok: hasUsername },
      { field: 'goal' as const, ok: hasGoal },
      { field: 'watchlist' as const, ok: hasWatchlist },
    ];

    const percentage = checks.filter((c) => c.ok).length * WEIGHT;
    const missing = checks
      .filter((c) => !c.ok)
      .map((c) => ({
        field: c.field,
        route: c.field === 'goal' ? '/goals' : c.field === 'watchlist' ? '/stocks' : '/profile?tab=settings',
      }));

    res.json({ percentage, missing });
  } catch (err) {
    console.error('Profile completion error:', err);
    res.status(500).json({ error: 'Failed to load completion' });
  }
});

export default router;
