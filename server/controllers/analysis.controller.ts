import { Response, NextFunction } from 'express';
import { AnalysisService } from '../services/analysis.service.ts';
import { AnalysisRepository } from '../repositories/analysis.repository.ts';
import type { AuthRequest } from '../routes/types.ts';
import { sendSuccess, sendError } from '../lib/apiResponse.ts';

function run(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const AnalysisController = {
  create: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const ticker = req.params.ticker ?? '';
    const result = await AnalysisService.create(userId, ticker);
    sendSuccess(res, {
      analysis: result.analysis,
      id: result.id,
      newUnseenAchievements: result.newUnseenAchievements,
    });
  }),

  compare: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const { ticker1, ticker2 } = req.body ?? {};
    const t1 = typeof ticker1 === 'string' ? ticker1.trim().toUpperCase() : '';
    const t2 = typeof ticker2 === 'string' ? ticker2.trim().toUpperCase() : '';
    const result = await AnalysisService.compare(userId, t1, t2);
    sendSuccess(res, { comparison: result.comparison, id: result.id });
  }),

  recommendations: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const result = await AnalysisService.recommendations(userId, req.body);
    sendSuccess(res, { recommendations: result.recommendations, id: result.id });
  }),

  accuracy: run(async (_req, res) => {
    const stats = await AnalysisRepository.getAccuracyStats();
    const recentChecked = await AnalysisRepository.findRecentChecked(10);
    sendSuccess(res, { stats, recentChecked });
  }),
};
