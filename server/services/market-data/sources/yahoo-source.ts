import YahooFinance from 'yahoo-finance2';
import pLimit from 'p-limit';
import type { IMarketDataSource, DataSourceResult, StockQuote } from '../types.ts';
import { logger } from '../../../lib/logger.ts';

const CONCURRENCY_LIMIT = 5;
const BATCH_SIZE        = 20;

const yahooFinance = new YahooFinance();

export class YahooFinanceSource implements IMarketDataSource {
  name     = 'YAHOO';
  priority = 2;

  private consecutiveFailures = 0;
  private lastFailureAt       = 0;

  async isAvailable(): Promise<boolean> {
    if (this.consecutiveFailures >= 5) {
      const COOLDOWN = 10 * 60 * 1000;
      if (Date.now() - this.lastFailureAt < COOLDOWN) {
        return false;
      }
      this.consecutiveFailures = 0;
    }
    return true;
  }

  private toYahooSymbol(symbol: string): string {
    if (symbol.includes('.')) return symbol;
    return `${symbol}.CA`;
  }

  private fromYahooSymbol(yahooSymbol: string): string {
    return yahooSymbol.replace('.CA', '').replace('.EGX', '');
  }

  async fetchQuotes(symbols: string[]): Promise<DataSourceResult> {
    const start   = Date.now();
    const quotes  = new Map<string, StockQuote>();
    const failed: string[] = [];
    const limit   = pLimit(CONCURRENCY_LIMIT);

    const batches: string[][] = [];
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      batches.push(symbols.slice(i, i + BATCH_SIZE));
    }

    await Promise.allSettled(
      batches.map(batch =>
        limit(async () => {
          try {
            await new Promise(r => setTimeout(r, Math.random() * 500));

            const results = await Promise.allSettled(
              batch.map(s => yahooFinance.quote(this.toYahooSymbol(s)))
            );

            const now = new Date();
            results.forEach((result, idx) => {
              if (result.status !== 'fulfilled' || !result.value) {
                failed.push(batch[idx]);
                return;
              }
              const quote = result.value as Record<string, unknown>;
              if (!quote || typeof quote.regularMarketPrice !== 'number') {
                failed.push(batch[idx]);
                return;
              }
              const originalSymbol = batch[idx];
              quotes.set(originalSymbol, {
                symbol:        originalSymbol,
                price:         quote.regularMarketPrice as number,
                change:        (quote.regularMarketChange as number) ?? 0,
                changePercent: (quote.regularMarketChangePercent as number) ?? 0,
                open:          (quote.regularMarketOpen as number) ?? (quote.regularMarketPrice as number),
                high:          (quote.regularMarketDayHigh as number) ?? (quote.regularMarketPrice as number),
                low:           (quote.regularMarketDayLow as number) ?? (quote.regularMarketPrice as number),
                volume:        (quote.regularMarketVolume as number) ?? 0,
                previousClose: (quote.regularMarketPreviousClose as number) ?? (quote.regularMarketPrice as number),
                timestamp:     now,
                source:        'YAHOO',
              });
            });

            this.consecutiveFailures = 0;

          } catch (err: unknown) {
            logger.warn('Yahoo batch failed', {
              batch: batch.slice(0, 3),
              error: (err as Error).message,
            });
            failed.push(...batch);
            this.consecutiveFailures++;
            this.lastFailureAt = Date.now();
          }
        })
      )
    );

    symbols.forEach(s => { if (!quotes.has(s)) failed.push(s); });

    logger.info(`Yahoo: ${quotes.size} quotes, ${failed.length} failed, ${Date.now() - start}ms`);

    return { quotes, failed, source: this.name, latency: Date.now() - start };
  }
}
