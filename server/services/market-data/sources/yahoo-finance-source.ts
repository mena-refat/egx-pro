import YahooFinance from 'yahoo-finance2';

/** yahoo-finance2 v3 requires an instance; static methods throw. */
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
import type { IMarketDataSource, DataSourceResult, StockQuote } from '../types.ts';
import { logger } from '../../../lib/logger.ts';

const AVAILABILITY_TIMEOUT_MS = 5000;
/** عدة رموز للـ probe — لو أحدها نجح نعتبر المصدر متاح */
const PROBE_SYMBOLS = ['COMI.CA', 'HRHO.CA', 'ETEL.CA'];
/** أقصى عدد طلبات متزامنة لتفادي حظر IP من Yahoo */
const CONCURRENCY_LIMIT = 5;

/** تشغيل دالة async على مصفوفة مع تحديد عدد الطلبات المتزامنة */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

export class YahooFinanceSource implements IMarketDataSource {
  name = 'YAHOO';
  priority = 1;

  async isAvailable(): Promise<boolean> {
    const timeout = <T>() =>
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), AVAILABILITY_TIMEOUT_MS),
      );
    for (const probe of PROBE_SYMBOLS) {
      try {
        await Promise.race([
          yahooFinance.quote(probe),
          timeout(),
        ]);
        return true;
      } catch {
        // جرب الرمز التالي
      }
    }
    return false;
  }

  private toYahooSymbol(symbol: string): string {
    // أغلب أسهم البورصة المصرية على ياهو بتكون بالشكل ده (COMI.CA)
    return `${symbol}.CA`;
  }

  async fetchQuotes(symbols: string[]): Promise<DataSourceResult> {
    const start = Date.now();
    const quotes = new Map<string, StockQuote>();
    const failed: string[] = [];

    await mapWithConcurrency(symbols, CONCURRENCY_LIMIT, async (egxSymbol) => {
        const yahooSymbol = this.toYahooSymbol(egxSymbol);

        try {
          const quote = await yahooFinance.quote(yahooSymbol) as Record<string, unknown> | null;

          if (!quote || quote.regularMarketPrice == null || Number(quote.regularMarketPrice) <= 0) {
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
    });

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

