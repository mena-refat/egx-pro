import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.ts';
import { watchlistTickerSchema, watchlistCheckTargetsSchema } from '../../src/lib/validations.ts';
import { AuthRequest } from './types';
import { getCompletedAchievementIds, addNewlyUnlockedAchievements } from '../lib/achievementCheck.ts';
import { createNotification } from '../lib/createNotification.ts';
import { isPro, FREE_LIMITS } from '../lib/plan.ts';
import { authenticate } from '../middleware/auth.middleware.ts';

const router = Router();

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
    const { ticker, targetPrice: bodyTargetPrice } = parsed.data;

    const userId = req.user?.id ?? req.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId! },
      select: { plan: true, planExpiresAt: true, referralProExpiresAt: true },
    });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!isPro(user)) {
      const count = await prisma.watchlist.count({ where: { userId: req.userId! } });
      if (count >= FREE_LIMITS.watchlistStocks) {
        return res.status(403).json({
          error: 'pro_required',
          code: 'WATCHLIST_LIMIT',
          message: 'هذه الميزة متاحة في Pro',
          limit: FREE_LIMITS.watchlistStocks,
        });
      }
    }
    if (bodyTargetPrice != null && !isPro(user)) {
      return res.status(403).json({
        error: 'pro_required',
        code: 'PRICE_ALERTS_PRO',
        message: 'هذه الميزة متاحة في Pro',
      });
    }

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
        targetPrice: bodyTargetPrice ?? undefined,
      },
    });
    const newAchievements = await addNewlyUnlockedAchievements(req.userId!, completedBefore);
    res.status(201).json({ ...item, newUnseenAchievements: newAchievements });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update watchlist item (e.g. target price) — price alerts are Pro only
router.patch('/:ticker', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const ticker = req.params.ticker?.toUpperCase();
    if (!ticker) return res.status(400).json({ error: 'Invalid ticker' });
    const targetPrice = typeof req.body?.targetPrice === 'number' ? req.body.targetPrice : null;
    if (targetPrice != null) {
      const user = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { plan: true, planExpiresAt: true, referralProExpiresAt: true },
      });
      if (!user || !isPro(user)) {
        return res.status(403).json({
          error: 'pro_required',
          code: 'PRICE_ALERTS_PRO',
          message: 'هذه الميزة متاحة في Pro',
        });
      }
    }
    await prisma.watchlist.updateMany({
      where: { userId: req.userId!, ticker },
      data: targetPrice != null ? { targetPrice } : { targetPrice: null, targetReachedNotifiedAt: null },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check watchlist targets and create notifications when currentPrice >= targetPrice
router.post('/check-targets', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = watchlistCheckTargetsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
    const userId = req.userId!;
    for (const { ticker, targetPrice, currentPrice } of parsed.data.items) {
      if (currentPrice < targetPrice) continue;
      const row = await prisma.watchlist.findFirst({
        where: { userId, ticker: ticker.toUpperCase(), targetPrice, targetReachedNotifiedAt: null },
      });
      if (!row) continue;
      const titleAr = `سهم ${ticker} وصل للسعر المستهدف`;
      const titleEn = `${ticker} reached target price`;
      const bodyAr = `السعر الحالي ${currentPrice} وصل أو تجاوز المستهدف ${targetPrice}`;
      const bodyEn = `Current price ${currentPrice} reached or exceeded target ${targetPrice}`;
      await createNotification(userId, 'stock_target', titleAr, bodyAr);
      await prisma.watchlist.update({
        where: { id: row.id },
        data: { targetReachedNotifiedAt: new Date() },
      });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Check targets error:', err);
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
