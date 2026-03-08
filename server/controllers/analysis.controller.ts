import { Response, NextFunction } from 'express';
import { AnalysisService } from '../services/analysis.service.ts';
import type { AuthRequest } from '../routes/types.ts';

function run(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const AnalysisController = {
  create: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const ticker = req.params.ticker ?? '';
    const result = await AnalysisService.create(userId, ticker);
    res.json({
      data: {
        analysis: result.analysis,
        id: result.id,
        newUnseenAchievements: result.newUnseenAchievements,
      },
    });
  }),
};
