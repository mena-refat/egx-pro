import { Response, NextFunction } from 'express';
import { WatchlistService } from '../services/watchlist.service.ts';
import type { AuthRequest } from '../routes/types.ts';
import { sendSuccess, sendError } from '../lib/apiResponse.ts';

function run(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const WatchlistController = {
  list: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const result = await WatchlistService.list(userId);
    sendSuccess(res, { items: result.items, pagination: result.pagination });
  }),

  add: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const result = await WatchlistService.add(userId, req.body);
    sendSuccess(res, { ...result.item, newUnseenAchievements: result.newUnseenAchievements }, 201);
  }),

  update: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const ticker = req.params.ticker;
    const targetPrice = typeof req.body?.targetPrice === 'number' ? req.body.targetPrice : null;
    await WatchlistService.update(userId, ticker ?? '', { targetPrice });
    sendSuccess(res, { success: true });
  }),

  checkTargets: run(async (req, res) => {
    const userId = req.userId ?? req.user?.id;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    await WatchlistService.checkTargets(userId, req.body);
    sendSuccess(res, { success: true });
  }),

  remove: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    await WatchlistService.remove(userId, req.params.ticker ?? '');
    res.status(204).send();
  }),
};
