import { Response, NextFunction } from 'express';
import { NewsService } from '../services/news.service.ts';
import { logger } from '../lib/logger.ts';

function run(fn: (req: { params: { ticker?: string } }, res: Response) => Promise<void>) {
  return (req: { params: { ticker?: string } }, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const NewsController = {
  getMarket: run(async (_req, res) => {
    const items = await NewsService.getMarket();
    res.json({ data: items });
  }),

  getByTicker: run(async (req, res) => {
    const ticker = req.params.ticker ?? '';
    const items = await NewsService.getByTicker(ticker);
    res.json({ data: items });
  }),
};

export function newsErrorHandler(err: unknown, _req: unknown, res: Response, next: NextFunction): void {
  if (res.headersSent) return next(err);
  logger.error('News API error', { message: err instanceof Error ? err.message : err });
  const message = err instanceof Error ? err.message : '';
  if (message === 'NEWS_API_MISSING') {
    res.status(503).json({ error: 'NEWS_API_MISSING' });
    return;
  }
  res.status(500).json({ error: 'INTERNAL_ERROR' });
}
