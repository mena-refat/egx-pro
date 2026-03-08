import { Response, NextFunction } from 'express';
import { WatchlistService } from '../services/watchlist.service.ts';
import type { AuthRequest } from '../routes/types.ts';

function run(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const WatchlistController = {
  list: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const result = await WatchlistService.list(userId);
    res.json({ items: result.items, pagination: result.pagination });
  }),

  add: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const result = await WatchlistService.add(userId, req.body);
    res.status(201).json({
      data: { ...result.item, newUnseenAchievements: result.newUnseenAchievements },
    });
  }),

  update: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const ticker = req.params.ticker;
    const targetPrice = typeof req.body?.targetPrice === 'number' ? req.body.targetPrice : null;
    await WatchlistService.update(userId, ticker ?? '', { targetPrice });
    res.json({ success: true });
  }),

  checkTargets: run(async (req, res) => {
    const userId = req.userId ?? req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    await WatchlistService.checkTargets(userId, req.body);
    res.json({ success: true });
  }),

  remove: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    await WatchlistService.remove(userId, req.params.ticker ?? '');
    res.status(204).send();
  }),
};
