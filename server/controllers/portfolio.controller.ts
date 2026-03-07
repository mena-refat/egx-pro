import { Response } from 'express';
import { PortfolioService } from '../services/portfolio.service.ts';
import type { AuthRequest } from '../routes/types.ts';

export const PortfolioController = {
  getAll: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const page = req.query.page != null ? Math.max(1, parseInt(String(req.query.page), 10)) : undefined;
    const limit = req.query.limit != null ? Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10))) : undefined;
    try {
      const data = await PortfolioService.getPortfolio(userId, page, limit);
      res.json(data);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
  },

  add: async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user?.id) return res.status(401).json({ error: 'Unauthorized' });
      const result = await PortfolioService.addHolding(user, req.body);
      res.status(201).json({ ...result.holding, newUnseenAchievements: result.newUnseenAchievements });
    } catch (err) {
      const e = err as Error & { code?: string; limit?: number };
      if (e.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
      if (e.message === 'pro_required') {
        return res.status(403).json({
          error: 'pro_required',
          code: e.code ?? 'PORTFOLIO_LIMIT',
          message: 'هذه الميزة متاحة في Pro',
          limit: e.limit,
        });
      }
      console.error('Error adding holding:', err);
      res.status(400).json({ error: e.message ?? 'Failed to add holding' });
    }
  },

  update: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    try {
      const updated = await PortfolioService.updateHolding(userId, id, req.body);
      if (!updated) return res.status(404).json({ error: 'Holding not found or unauthorized' });
      res.json({ message: 'Holding updated successfully' });
    } catch (error) {
      console.error('Error updating holding:', error);
      res.status(500).json({ error: 'Failed to update holding' });
    }
  },

  delete: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    try {
      const deleted = await PortfolioService.deleteHolding(userId, id);
      if (!deleted) return res.status(404).json({ error: 'Holding not found or unauthorized' });
      res.json({ message: 'Holding deleted successfully' });
    } catch (error) {
      console.error('Error deleting holding:', error);
      res.status(500).json({ error: 'Failed to delete holding' });
    }
  },

  performance: async (_req: AuthRequest, res: Response) => {
    res.json({ message: 'Performance calculation not yet fully implemented' });
  },
};
