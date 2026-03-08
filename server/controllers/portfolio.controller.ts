import { Response, NextFunction } from 'express';
import { PortfolioService } from '../services/portfolio.service.ts';
import type { AuthRequest } from '../routes/types.ts';
function run(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const PortfolioController = {
  getAll: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const page = req.query.page != null ? Math.max(1, parseInt(String(req.query.page), 10)) : undefined;
    const limit = req.query.limit != null ? Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10))) : undefined;
    const data = await PortfolioService.getPortfolio(userId, page, limit);
    res.json({ data });
  }),

  add: run(async (req, res) => {
    const user = req.user;
    if (!user?.id) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const result = await PortfolioService.addHolding(user, req.body);
    res.status(201).json({
      data: { ...result.holding, newUnseenAchievements: result.newUnseenAchievements },
    });
  }),

  update: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    await PortfolioService.updateHolding(userId, req.params.id, req.body);
    res.json({ success: true });
  }),

  delete: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    await PortfolioService.deleteHolding(userId, req.params.id);
    res.status(204).send();
  }),

  performance: async (_req: AuthRequest, res: Response) => {
    res.json({ data: { message: 'Performance calculation not yet fully implemented' } });
  },
};
