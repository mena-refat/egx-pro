import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.ts';
import { AuthRequest } from './types';
import { authenticate } from '../middleware/auth.middleware.ts';
import { logger } from '../lib/logger.ts';

const router = Router();
const WEIGHT = 20;

/** GET /api/profile/completion — percentage + missing items with routes */
router.get('/completion', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const [user, goalsCount, watchlistCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, phone: true, username: true },
      }),
      prisma.goal.count({ where: { userId } }),
      prisma.watchlist.count({ where: { userId } }),
    ]);

    if (!user) return res.status(404).json({ error: 'NOT_FOUND' });

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

    res.json({ data: { percentage, missing } });
  } catch (err) {
    logger.error('Profile completion error', { err });
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

export default router;
