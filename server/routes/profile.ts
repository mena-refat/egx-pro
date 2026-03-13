import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.ts';
import { UserRepository } from '../repositories/user.repository.ts';
import { AuthRequest } from './types';
import { authenticate } from '../middleware/auth.middleware.ts';
import { logger } from '../lib/logger.ts';

const router = Router();

/** GET /api/profile/completion — percentage + missing items with routes */
router.get('/completion', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const [user, goalsCount, watchlistCount] = await Promise.all([
      UserRepository.findUnique({
        where: { id: userId },
        select: { email: true, phone: true, username: true, usernameChangeCount: true },
      }),
      prisma.goal.count({ where: { userId } }),
      prisma.watchlist.count({ where: { userId } }),
    ]);

    if (!user) return res.status(404).json({ error: 'NOT_FOUND' });

    const hasEmail = Boolean(user.email?.trim());
    const hasPhone = Boolean(user.phone?.trim());
    const hasUsernameManual = Boolean(user.username?.trim()) && (user.usernameChangeCount ?? 0) > 0;
    const hasGoal = goalsCount >= 1;
    const hasWatchlist = watchlistCount >= 1;

    const checks = [
      { field: 'email' as const, ok: hasEmail },
      { field: 'phone' as const, ok: hasPhone },
      { field: 'username' as const, ok: hasUsernameManual },
      { field: 'goal' as const, ok: hasGoal },
      { field: 'watchlist' as const, ok: hasWatchlist },
    ];

    // توزيع النقاط:
    // username manual change: 10%
    // email: 25%
    // phone: 25%
    // goal: 20%
    // watchlist: 20%
    const percentage = checks.reduce((sum, c) => {
      if (!c.ok) return sum;
      if (c.field === 'username') return sum + 10;
      if (c.field === 'email') return sum + 25;
      if (c.field === 'phone') return sum + 25;
      if (c.field === 'goal') return sum + 20;
      if (c.field === 'watchlist') return sum + 20;
      return sum;
    }, 0);

    const missing = checks
      .filter((c) => !c.ok)
      .map((c) => ({
        field: c.field,
        route:
          c.field === 'goal'
            ? '/goals'
            : c.field === 'watchlist'
              ? '/stocks'
              : '/profile?tab=account',
      }));

    res.json({ data: { percentage, missing } });
  } catch (err) {
    logger.error('Profile completion error', { err });
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

export default router;
