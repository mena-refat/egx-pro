import { Response } from 'express';
import { ZodError } from 'zod';
import { GoalsService } from '../services/goals.service.ts';
import type { AuthRequest } from '../routes/types.ts';

export const GoalsController = {
  getAll: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id ?? req.userId;
      if (!userId) return res.status(401).json({ error: 'unauthorized' });
      const goals = await GoalsService.getUserGoals(userId);
      res.json(goals);
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  create: async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user?.id) return res.status(401).json({ error: 'unauthorized' });
      const result = await GoalsService.create(user, req.body);
      res.status(201).json({ ...result.goal, newUnseenAchievements: result.newUnseenAchievements });
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: err.issues[0]?.message ?? 'Validation failed' });
      }
      const e = err as Error & { code?: string; limit?: number };
      if (e.message === 'pro_required') {
        return res.status(403).json({
          error: 'pro_required',
          code: e.code ?? 'GOALS_LIMIT',
          message: 'هذه الميزة متاحة في Pro',
          limit: e.limit,
        });
      }
      if (e.message === 'Unauthorized') return res.status(401).json({ error: 'unauthorized' });
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  update: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id ?? req.userId;
      if (!userId) return res.status(401).json({ error: 'unauthorized' });
      const { id } = req.params;
      const updated = await GoalsService.update(userId, id, req.body);
      if (!updated) return res.status(404).json({ error: 'Goal not found' });
      res.json(updated);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: err.issues[0]?.message ?? 'Validation failed' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  updateAmount: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id ?? req.userId;
      if (!userId) return res.status(401).json({ error: 'unauthorized' });
      const { id } = req.params;
      const updated = await GoalsService.updateAmount(userId, id, req.body);
      if (!updated) return res.status(404).json({ error: 'Goal not found' });
      res.json(updated);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: err.issues[0]?.message ?? 'Validation failed' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  complete: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id ?? req.userId;
      if (!userId) return res.status(401).json({ error: 'unauthorized' });
      const { id } = req.params;
      const result = await GoalsService.complete(userId, id);
      if (!result) return res.status(404).json({ error: 'Goal not found' });
      res.json({ ...result.goal, newUnseenAchievements: result.newUnseenAchievements });
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  delete: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id ?? req.userId;
      if (!userId) return res.status(401).json({ error: 'unauthorized' });
      const { id } = req.params;
      const deleted = await GoalsService.delete(userId, id);
      if (!deleted) return res.status(404).json({ error: 'Goal not found' });
      res.status(204).send();
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};
