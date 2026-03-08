import { Response, NextFunction } from 'express';
import { GoalsService } from '../services/goals.service.ts';
import type { AuthRequest } from '../routes/types.ts';

function run(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const GoalsController = {
  getAll: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '50', 10)));
    const data = await GoalsService.getUserGoals(userId, page, limit);
    res.json({ items: data.items, pagination: data.pagination });
  }),

  create: run(async (req, res) => {
    const user = req.user;
    if (!user?.id) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const result = await GoalsService.create(user, req.body);
    res.status(201).json({
      data: { ...result.goal, newUnseenAchievements: result.newUnseenAchievements },
    });
  }),

  update: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const updated = await GoalsService.update(userId, req.params.id, req.body);
    res.json({ data: updated });
  }),

  updateAmount: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const updated = await GoalsService.updateAmount(userId, req.params.id, req.body);
    res.json({ data: updated });
  }),

  complete: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const result = await GoalsService.complete(userId, req.params.id);
    res.json({
      data: { ...result.goal, newUnseenAchievements: result.newUnseenAchievements },
    });
  }),

  delete: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    await GoalsService.delete(userId, req.params.id);
    res.status(204).send();
  }),
};
