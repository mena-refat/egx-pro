import YahooFinance from 'yahoo-finance2';
import pLimit from 'p-limit';
import type { IMarketDataSource, DataSourceResult, StockQuote } from '../types.ts';
import { logger } from '../../../lib/logger.ts';

const CONCURRENCY_LIMIT = 5;
const BATCH_SIZE        = 20;

// EGX symbol → Yahoo Finance symbol (verified mappings)
const EGX_TO_YAHOO_MAP: Record<string, string> = {
  'COMI':  'COMI.CA',
  'ADIB':  'ADIB.CA',
  'CIBE':  'CIBE.CA',
  'DCBL':  'DCBL.CA',
  'FAWB':  'FAWB.CA',
  'HRHO':  'HRHO.CA',
  'MCQE':  'MCQE.CA',
  'ABUK':  'ABUK.CA',
  'MOPCO': 'MOPCO.CA',
  'EFIC':  'EFIC.CA',
  'TMGH':  'TMGH.CA',
  'OCDI':  'OCDI.CA',
  'MNHD':  'MNHD.CA',
  'PHDC':  'PHDC.CA',
  'IGAS':  'IGAS.CA',
  'ETEL':  'ETEL.CA',
  'ORTE':  'ORTE.CA',
  'JUFO':  'JUFO.CA',
  'DOMTY': 'DOMTY.CA',
  'OLFI':  'OLFI.CA',
};

const YAHOO_TO_EGX_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(EGX_TO_YAHOO_MAP).map(([egx, yahoo]) => [yahoo, egx])
);

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
    return EGX_TO_YAHOO_MAP[symbol] ?? `${symbol}.CA`;
  }

  private fromYahooSymbol(yahooSymbol: string): string {
    return YAHOO_TO_EGX_MAP[yahooSymbol] ?? yahooSymbol.replace(/\.(CA|EGX)$/i, '');
  }

  private isStaleQuote(quote: Record<string, unknown>): boolean {
    const price = quote.regularMarketPrice as number;

    if (!price || price <= 0) return true;

    const lastUpdate = quote.regularMarketTime as number | undefined;
    if (lastUpdate) {
      const ageHours = (Date.now() / 1000 - lastUpdate) / 3600;
      if (ageHours > 120) {
        logger.warn(`Yahoo very stale: ${quote.symbol ?? '?'} last updated ${ageHours.toFixed(0)}h ago`);
        return true;
      }
    }

    return false;
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
              const currency = quote.currency as string | undefined;
              const price = quote.regularMarketPrice as number;

              if (currency === 'USD') {
                logger.warn(`Yahoo returned USD price for ${originalSymbol}, rejecting`);
                return;
              }
              if (price < 0.01 || price > 500_000) {
                logger.warn(`Yahoo price out of EGP range for ${originalSymbol}: ${price} ${currency ?? '?'}`);
                return;
              }

              if (this.isStaleQuote(quote)) {
                logger.warn(`Yahoo stale data rejected for ${originalSymbol}: volume=${quote.regularMarketVolume}, price=${quote.regularMarketPrice}`);
                return;
              }

              quotes.set(originalSymbol, {
                symbol:        originalSymbol,
                price,
                change:        (quote.regularMarketChange as number) ?? 0,
                changePercent: (quote.regularMarketChangePercent as number) ?? 0,
                open:          (quote.regularMarketOpen as number) ?? price,
                high:          (quote.regularMarketDayHigh as number) ?? price,
                low:           (quote.regularMarketDayLow as number) ?? price,
                volume:        (quote.regularMarketVolume as number) ?? 0,
                previousClose: (quote.regularMarketPreviousClose as number) ?? price,
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
