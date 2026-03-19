import { Response, NextFunction } from 'express';
import { GoalsService } from '../services/goals.service.ts';
import type { AuthRequest } from '../routes/types.ts';
import { sendSuccess, sendError } from '../lib/apiResponse.ts';

function run(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const GoalsController = {
  getAll: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '50', 10)));
    const data = await GoalsService.getUserGoals(userId, page, limit);
    sendSuccess(res, { items: data.items, pagination: data.pagination });
  }),

  create: run(async (req, res) => {
    const user = req.user;
    if (!user?.id) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const result = await GoalsService.create(user, req.body);
    sendSuccess(res, { ...result.goal, newUnseenAchievements: result.newUnseenAchievements }, 201);
  }),

  update: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const updated = await GoalsService.update(userId, req.params.id, req.body);
    sendSuccess(res, updated);
  }),

  updateAmount: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const updated = await GoalsService.updateAmount(userId, req.params.id, req.body);
    sendSuccess(res, updated);
  }),

  complete: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const result = await GoalsService.complete(userId, req.params.id);
    sendSuccess(res, { ...result.goal, newUnseenAchievements: result.newUnseenAchievements });
  }),

  delete: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    await GoalsService.delete(userId, req.params.id);
    res.status(204).send();
  }),
};
