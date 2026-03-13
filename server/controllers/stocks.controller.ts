import { Response, NextFunction } from 'express';
import { StocksService } from '../services/stocks.service.ts';
import * as stockQuoteService from '../services/stockQuote.service.ts';
import { isPro } from '../lib/plan.ts';
import type { AuthRequest } from '../routes/types.ts';

async function useDelayed(req: AuthRequest): Promise<boolean> {
  const userId = req.user?.id ?? req.userId;
  if (!userId) return false;
  const { UserRepository } = await import('../repositories/user.repository.ts');
  const user = await UserRepository.getPlanUser(userId);
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
    if (!ticker?.trim()) {
      res.status(400).json({ error: 'VALIDATION_ERROR' });
      return;
    }
    const quote = await stockQuoteService.getQuote(ticker.trim());
    if (!quote) {
      res.status(404).json({ error: 'Ticker not found', ticker: ticker.trim() });
      return;
    }
    res.json({ data: quote });
  }),

  /** POST /api/stocks/quotes — body: { tickers: string[] }, max 50 */
  postQuotes: run(async (req, res) => {
    const body = req.body as { tickers?: unknown };
    const raw = Array.isArray(body?.tickers) ? body.tickers : [];
    const tickers = raw
      .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim())
      .slice(0, 50);
    if (tickers.length === 0) {
      res.status(400).json({ error: 'VALIDATION_ERROR' });
      return;
    }
    const results = await stockQuoteService.getMultipleQuotes(tickers);
    const quotes = Object.fromEntries(
      results.map((r) => [r.ticker, r.quote])
    );
    res.json({ data: quotes });
  }),

  /** GET /api/stocks/market-status — { isOpen, nextOpen, nextClose } */
  getMarketStatus: run(async (_req, res) => {
    const status = stockQuoteService.getMarketStatus();
    res.json({ data: status });
  }),
};
