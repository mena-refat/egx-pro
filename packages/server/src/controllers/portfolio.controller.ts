import { Response, NextFunction } from 'express';
import { PortfolioService } from '../services/portfolio.service.ts';
import type { AuthRequest } from '../routes/types.ts';
import { sendSuccess, sendError } from '../lib/apiResponse.ts';

function run(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const PortfolioController = {
  getAll: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const page = req.query.page != null ? Math.max(1, parseInt(String(req.query.page), 10)) : undefined;
    const limit = req.query.limit != null ? Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10))) : undefined;
    const data = await PortfolioService.getPortfolio(userId, page, limit);
    sendSuccess(res, data);
  }),

  add: run(async (req, res) => {
    const user = req.user;
    if (!user?.id) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const result = await PortfolioService.addHolding(user, req.body);
    sendSuccess(res, { ...result.holding, newUnseenAchievements: result.newUnseenAchievements }, 201);
  }),

  update: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    await PortfolioService.updateHolding(userId, req.params.id, req.body);
    sendSuccess(res, { success: true });
  }),

  delete: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    await PortfolioService.deleteHolding(userId, req.params.id);
    sendSuccess(res, { success: true });
  }),

  performance: async (_req: AuthRequest, res: Response) => {
    sendSuccess(res, { message: 'Performance calculation not yet fully implemented' });
  },
};
