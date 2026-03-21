import { Response, NextFunction } from 'express';
import { NewsService } from '../services/news.service.ts';
import { NewsAnalysisService } from '../services/news-analysis.service.ts';
import { logger } from '../lib/logger.ts';
import { sendSuccess, sendError } from '../lib/apiResponse.ts';
import type { AuthRequest } from '../routes/types.ts';

function run(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const NewsController = {
  getMarket: run(async (_req, res) => {
    const items = await NewsService.getMarket();
    sendSuccess(res, items);
  }),

  getInterests: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) { sendError(res, 'UNAUTHORIZED', 401); return; }
    const items = await NewsService.getForWatchlist(Number(userId));
    sendSuccess(res, items);
  }),

  getByTicker: run(async (req, res) => {
    const ticker = req.params.ticker ?? '';
    const items = await NewsService.getByTicker(ticker);
    sendSuccess(res, items);
  }),

  analyze: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const body = req.body as { title?: string; description?: string };
    const result = await NewsAnalysisService.analyzeSmart({
      title: body.title ?? '',
      description: body.description,
    });
    sendSuccess(res, result);
  }),
};

export function newsErrorHandler(err: unknown, _req: unknown, res: Response, next: NextFunction): void {
  if (res.headersSent) return next(err);
  logger.error('News API error', { message: err instanceof Error ? err.message : err });
  const message = err instanceof Error ? err.message : '';
  if (message === 'NEWS_API_MISSING') {
    sendError(res, 'NEWS_API_MISSING', 503);
    return;
  }
  sendError(res, 'INTERNAL_ERROR', 500);
}
