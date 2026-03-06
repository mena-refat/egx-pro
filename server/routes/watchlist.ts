import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.ts';
import { verifyAccessToken } from '../../src/lib/auth.ts';
import { watchlistTickerSchema } from '../../src/lib/validations.ts';
import { AuthRequest } from './types';
import { getCompletedAchievementIds, addNewlyUnlockedAchievements } from '../lib/achievementCheck.ts';

const router = Router();

const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token) as { sub: string };
    req.userId = decoded.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get watchlist
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const watchlist = await prisma.watchlist.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(watchlist);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add to watchlist
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = watchlistTickerSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Invalid ticker';
      return res.status(400).json({ error: msg });
    }
    const { ticker } = parsed.data;

    // Check if already exists
    const existing = await prisma.watchlist.findFirst({
      where: { userId: req.userId!, ticker }
    });
    
    if (existing) return res.status(400).json({ error: 'Already in watchlist' });

    const completedBefore = await getCompletedAchievementIds(req.userId!);
    const item = await prisma.watchlist.create({
      data: {
        userId: req.userId!,
        ticker,
      },
    });
    const newAchievements = await addNewlyUnlockedAchievements(req.userId!, completedBefore);
    res.status(201).json({ ...item, newUnseenAchievements: newAchievements });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove from watchlist
router.delete('/:ticker', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.watchlist.deleteMany({
      where: { userId: req.userId, ticker: req.params.ticker },
    });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
