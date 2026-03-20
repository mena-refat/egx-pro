import { Request, Response } from 'express';
import { marketDataService } from '../services/market-data/market-data.service.ts';
import type { AuthRequest } from '../routes/types.ts';
import { logger } from '../lib/logger.ts';
import { sendError, sendSuccess } from '../lib/apiResponse.ts';

export const MarketDataController = {
  async quotes(req: Request, res: Response): Promise<void> {
    try {
      const symbolsParam = (req as AuthRequest).query.symbols as string;
      const symbols = symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
      if (symbols.length > 50) {
        sendError(res, 'VALIDATION_ERROR', 400);
        return;
      }
      const quotes = await marketDataService.getQuotes(symbols);
      const response = Object.fromEntries(quotes);
      sendSuccess(res, {
        quotes: response,
        marketOpen: marketDataService.isMarketOpen(),
      });
    } catch (err: unknown) {
      logger.error('Quotes API error', { error: (err as Error).message });
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },

  health(_req: Request, res: Response): void {
    sendSuccess(res, {
      health: marketDataService.getHealthReport(),
      marketOpen: marketDataService.isMarketOpen(),
    });
  },

  async debug(req: Request, res: Response): Promise<void> {
    const symbol = (req.params.symbol ?? '').toUpperCase();
    if (!symbol) {
      sendError(res, 'VALIDATION_ERROR', 400);
      return;
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
    sendSuccess(res, { symbol, results });
  },
};
