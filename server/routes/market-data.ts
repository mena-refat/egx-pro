import { Router, Request, Response } from 'express';
import { marketDataService } from '../services/market-data/market-data.service.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import type { AuthRequest } from './types.ts';
import { logger } from '../lib/logger.ts';

const router = Router();

router.get('/quotes', authenticate, async (req: Request, res: Response) => {
  const symbolsParam = (req as AuthRequest).query.symbols as string;
  if (!symbolsParam) {
    return res.status(400).json({ error: 'VALIDATION_ERROR' });
  }

  const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  if (symbols.length > 50) {
    return res.status(400).json({ error: 'VALIDATION_ERROR' });
  }

  try {
    const quotes   = await marketDataService.getQuotes(symbols);
    const response = Object.fromEntries(quotes);

    res.json({ data: response, marketOpen: marketDataService.isMarketOpen() });
  } catch (err: unknown) {
    logger.error('Quotes API error', { error: (err as Error).message });
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

router.get('/health', authenticate, async (_req: Request, res: Response) => {
  res.json({
    data:       marketDataService.getHealthReport(),
    marketOpen: marketDataService.isMarketOpen(),
  });
});

if (process.env.NODE_ENV !== 'production') {
  router.get('/debug/:symbol', async (req: Request, res: Response) => {
    const symbol = (req.params.symbol ?? '').toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: 'VALIDATION_ERROR' });
    }
    const results: Record<string, unknown> = {};

    const { YahooFinanceSource } = await import('../services/market-data/sources/yahoo-finance-source.ts');
    const source = new YahooFinanceSource();

    try {
      const r = await source.fetchQuotes([symbol]);
      const quote = r.quotes.get(symbol);
      results[source.name] = quote ?? { error: 'not found', failed: r.failed };
    } catch (err: unknown) {
      results[source.name] = { error: (err as Error).message };
    }

    res.json({ symbol, results });
  });
}

export default router;
