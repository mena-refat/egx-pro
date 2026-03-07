import { Response } from 'express';
import { StocksService } from '../services/stocks.service.ts';
import { isPro } from '../lib/plan.ts';
import type { AuthRequest } from '../routes/types.ts';

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

export const StocksController = {
  root: (_req: AuthRequest, res: Response) => {
    res.json({ message: 'Stocks API root. Use /prices, /market/overview, etc.' });
  },

  getPrices: async (req: AuthRequest, res: Response) => {
    try {
      const delayed = await useDelayed(req);
      const prices = await StocksService.getBulkPrices(delayed);
      res.json(prices);
    } catch {
      res.status(500).json({ error: 'Failed to fetch bulk prices' });
    }
  },

  search: async (req: AuthRequest, res: Response) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      const results = await StocksService.search(q);
      res.json(results);
    } catch (error) {
      console.error('Error in /stocks/search:', error);
      res.status(500).json({ error: 'Failed to search stocks' });
    }
  },

  getPrice: async (req: AuthRequest, res: Response) => {
    try {
      const { ticker } = req.params;
      const delayed = await useDelayed(req);
      const price = await StocksService.getPrice(ticker, delayed);
      if (!price) return res.status(404).json({ error: 'Stock not found' });
      res.json(price);
    } catch {
      res.status(500).json({ error: 'Failed to fetch stock price' });
    }
  },

  getHistory: async (req: AuthRequest, res: Response) => {
    try {
      const { ticker } = req.params;
      const { range } = req.query;
      const history = await StocksService.getHistory(ticker, range as string);
      res.json(history);
    } catch {
      res.status(500).json({ error: 'Failed to fetch stock history' });
    }
  },

  getFinancials: async (req: AuthRequest, res: Response) => {
    try {
      const { ticker } = req.params;
      const financials = await StocksService.getFinancials(ticker);
      if (!financials) return res.status(404).json({ error: 'Financials not found' });
      res.json(financials);
    } catch {
      res.status(500).json({ error: 'Failed to fetch stock financials' });
    }
  },

  getNews: async (req: AuthRequest, res: Response) => {
    try {
      const { ticker } = req.params;
      const news = await StocksService.getNews(ticker);
      res.json(news);
    } catch {
      res.status(500).json({ error: 'Failed to fetch stock news' });
    }
  },

  orderDepth: (_req: AuthRequest, res: Response) => {
    res.json({ available: false, message: 'Order depth data not available' });
  },

  investorCategories: (_req: AuthRequest, res: Response) => {
    res.json({ available: false, message: 'Investor categories not available' });
  },

  tradingStats: (_req: AuthRequest, res: Response) => {
    res.json({ available: false, message: 'Trading stats not available' });
  },
};
