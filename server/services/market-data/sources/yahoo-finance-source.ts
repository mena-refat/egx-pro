import yahooFinance from 'yahoo-finance2';
import type { IMarketDataSource, DataSourceResult, StockQuote } from '../types.ts';
import { logger } from '../../../lib/logger.ts';

export class YahooFinanceSource implements IMarketDataSource {
  name = 'YAHOO';
  priority = 0;

  async isAvailable(): Promise<boolean> {
    // لو حابين نضيف checks لاحقاً ممكن نعمل ping بسيط هنا
    return true;
  }

  private toYahooSymbol(symbol: string): string {
    // أغلب أسهم البورصة المصرية على ياهو بتكون بالشكل ده (COMI.CA)
    return `${symbol}.CA`;
  }

  async fetchQuotes(symbols: string[]): Promise<DataSourceResult> {
    const start = Date.now();
    const quotes = new Map<string, StockQuote>();
    const failed: string[] = [];

    await Promise.all(
      symbols.map(async (egxSymbol) => {
        const yahooSymbol = this.toYahooSymbol(egxSymbol);

        try {
          const quote: any = await yahooFinance.quote(yahooSymbol);

          if (!quote || quote.regularMarketPrice == null || quote.regularMarketPrice <= 0) {
            failed.push(egxSymbol);
            return;
          }

          const price = Number(quote.regularMarketPrice) || 0;
          if (!Number.isFinite(price) || price <= 0) {
            failed.push(egxSymbol);
            return;
          }

          const toNumber = (value: unknown, fallback: number): number => {
            const n = Number(value);
            return Number.isFinite(n) ? n : fallback;
          };

          const timestampMs =
            typeof quote.regularMarketTime === 'number'
              ? quote.regularMarketTime * 1000
              : Date.now();

          quotes.set(egxSymbol, {
            symbol: egxSymbol,
            price,
            change: toNumber(quote.regularMarketChange, 0),
            changePercent: toNumber(quote.regularMarketChangePercent, 0),
            open: toNumber(quote.regularMarketOpen, price),
            high: toNumber(quote.regularMarketDayHigh, price),
            low: toNumber(quote.regularMarketDayLow, price),
            volume: toNumber(quote.regularMarketVolume ?? quote.volume, 0),
            previousClose: toNumber(quote.regularMarketPreviousClose, price),
            timestamp: new Date(timestampMs),
            source: 'YAHOO',
          });
        } catch (err: unknown) {
          failed.push(egxSymbol);
          logger.error('YahooFinance: quote failed', {
            symbol: egxSymbol,
            error: (err as Error).message,
          });
        }
      })
    );

    const latency = Date.now() - start;

    logger.info('YahooFinance: fetchQuotes complete', {
      requested: symbols.length,
      success: quotes.size,
      failed: failed.length,
      latency,
    });

    return {
      quotes,
      failed,
      source: this.name,
      latency,
    };
  }
}

