import { Response, NextFunction } from 'express';
import { StocksService } from '../services/stocks.service.ts';
import { isPro } from '../lib/plan.ts';
import type { AuthRequest } from '../routes/types.ts';
import { logger } from '../lib/logger.ts';

async function useDelayed(req: AuthRequest): Promise<boolean> {
  const userId = req.user?.id ?? req.userId;
  if (!userId) return false;
  const { prisma } = await import('../lib/prisma.ts');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true, referralProExpiresAt: true },
  });
  return user ? !isPro(user) : false;
}

function run(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const StocksController = {
  root: (_req: AuthRequest, res: Response) => {
    res.json({ data: { message: 'Stocks API root. Use /prices, /market/overview, etc.' } });
  },

  getPrices: run(async (req, res) => {
    const delayed = await useDelayed(req);
    const sector = typeof req.query.sector === 'string' ? req.query.sector : undefined;
    const prices = await StocksService.getBulkPrices(delayed, sector);
    res.json({ data: prices });
  }),

  search: run(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const results = await StocksService.search(q);
    res.json({ data: results });
  }),

  getPrice: run(async (req, res) => {
    const { ticker } = req.params;
    const delayed = await useDelayed(req);
    const price = await StocksService.getPrice(ticker, delayed);
    if (!price) {
      res.status(404).json({ error: 'NOT_FOUND' });
      return;
    }
    res.json({ data: price });
  }),

  getHistory: run(async (req, res) => {
    const { ticker } = req.params;
    const { range } = req.query;
    const history = await StocksService.getHistory(ticker, range as string);
    res.json({ data: history });
  }),

  getFinancials: run(async (req, res) => {
    const { ticker } = req.params;
    const financials = await StocksService.getFinancials(ticker);
    if (!financials) {
      res.status(404).json({ error: 'NOT_FOUND' });
      return;
    }
    res.json({ data: financials });
  }),

  getNews: run(async (req, res) => {
    const { ticker } = req.params;
    const news = await StocksService.getNews(ticker);
    res.json({ data: news });
  }),

  orderDepth: (_req: AuthRequest, res: Response) => {
    res.json({ data: { available: false, message: 'Order depth data not available' } });
  },

  investorCategories: (_req: AuthRequest, res: Response) => {
    res.json({ data: { available: false, message: 'Investor categories not available' } });
  },

  tradingStats: (_req: AuthRequest, res: Response) => {
    res.json({ data: { available: false, message: 'Trading stats not available' } });
  },

  getQuote: run(async (req, res) => {
    const { ticker } = req.params;
    const quote = await StocksService.getQuote(ticker);
    if (!quote) {
      res.status(500).json({ error: 'Failed to fetch quote' });
      return;
    }
    res.json({ data: quote });
  }),
};
