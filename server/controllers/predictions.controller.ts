import { Response, NextFunction } from 'express';
import { PredictionsService } from '../services/predictions.service.ts';
import type { AuthRequest } from '../routes/types.ts';
import { prisma } from '../lib/prisma.ts';

function run(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const PredictionsController = {
  create: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, plan: true, planExpiresAt: true, referralProExpiresAt: true, createdAt: true },
    });
    if (!user) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const prediction = await PredictionsService.create(userId, user, req.body);
    res.status(201).json({ data: prediction });
  }),

  delete: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    await PredictionsService.delete(userId, req.params.id);
    res.status(204).send();
  }),

  getFeed: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const filter = (req.query.filter as string) || 'all';
    const validFilter = ['all', 'following', 'top'].includes(filter) ? filter as 'all' | 'following' | 'top' : 'all';
    const ticker = typeof req.query.ticker === 'string' ? req.query.ticker : undefined;
    const page = Math.max(1, parseInt(String(req.query.page || 1), 10));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || 20), 10)));
    const data = await PredictionsService.getFeed(userId, validFilter, ticker, page, limit);
    res.json({ items: data.items, pagination: data.pagination });
  }),

  getMy: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const page = Math.max(1, parseInt(String(req.query.page || 1), 10));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || 20), 10)));
    const data = await PredictionsService.getMy(userId, status, page, limit);
    res.json({ items: data.items, pagination: data.pagination });
  }),

  getLeaderboard: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const period = (req.query.period as string) || 'alltime';
    const validPeriod = ['alltime', 'month', 'week'].includes(period) ? period as 'alltime' | 'month' | 'week' : 'alltime';
    const list = await PredictionsService.getLeaderboard(validPeriod, 50);
    res.json({ items: list });
  }),

  getStats: run(async (req, res) => {
    const viewerId = req.user?.id ?? req.userId;
    if (!viewerId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const username = req.params.username;
    if (!username) {
      res.status(400).json({ error: 'VALIDATION_ERROR' });
      return;
    }
    const data = await PredictionsService.getStatsByUsername(username, viewerId);
    res.json({ data });
  }),

  getByTicker: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const ticker = req.params.ticker;
    if (!ticker) {
      res.status(400).json({ error: 'VALIDATION_ERROR' });
      return;
    }
    const data = await PredictionsService.getByTicker(ticker, userId);
    res.json(data);
  }),

  like: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const liked = await PredictionsService.toggleLike(req.params.id, userId);
    res.json({ data: { liked } });
  }),

  getLimits: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const data = await PredictionsService.getLimits(userId, user);
    res.json({ data });
  }),
};
