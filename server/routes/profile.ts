import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.ts';
import { UserRepository } from '../repositories/user.repository.ts';
import { AuthRequest } from './types.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { logger } from '../lib/logger.ts';
import { sendSuccess, sendError } from '../lib/apiResponse.ts';

const router = Router();

/** GET /api/profile/completion — percentage + missing items with routes */
router.get('/completion', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return sendError(res, 'UNAUTHORIZED', 401);
    const [user, goalsCount, watchlistCount] = await Promise.all([
      UserRepository.findUnique({
        where: { id: userId },
        select: { email: true, phone: true, username: true, usernameChangeCount: true },
      }),
      prisma.goal.count({ where: { userId } }),
      prisma.watchlist.count({ where: { userId } }),
    ]);

    if (!user) return sendError(res, 'NOT_FOUND', 404);

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

    sendSuccess(res, { percentage, missing });
  } catch (err) {
    logger.error('Profile completion error', { err });
    sendError(res, 'INTERNAL_ERROR', 500);
  }
});

export default router;
