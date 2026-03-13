/**
 * Yahoo Finance data source — uses the CHART endpoint (not quote).
 *
 * Why chart instead of quote?
 * The quote endpoint (regularMarketPrice) is BROKEN for many EGX stocks:
 * it returns prices from months/years ago (e.g. ABUK.CA shows 58.32 from Jul 2024).
 * The chart endpoint returns accurate historical OHLCV data — the last close
 * matches the actual market price (e.g. ABUK.CA chart close = 88.06 ✓).
 *
 * Strategy: fetch 5-day daily chart → use last close as price, second-to-last
 * close as previousClose → accurate change/changePercent.
 */
import YahooFinance from 'yahoo-finance2';
import type { IMarketDataSource, DataSourceResult, StockQuote } from '../types.ts';
import { logger } from '../../../lib/logger.ts';
import { STOCK_QUOTE } from '../../../lib/constants.ts';

/** yahoo-finance2 v3 requires an instance; static methods throw. */
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

/** عدة رموز للـ probe — لو أحدها نجح نعتبر المصدر متاح */
const PROBE_SYMBOLS = ['COMI.CA', 'HRHO.CA', 'ETEL.CA'];
/** أقصى عدد طلبات متزامنة لتفادي حظر IP من Yahoo */
const CONCURRENCY_LIMIT = 5;
/** نجيب 5 أيام عشان نضمن إن فيه يومين على الأقل بعد العطلة */
const CHART_RANGE_DAYS = 5;

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
        setTimeout(() => reject(new Error('timeout')), STOCK_QUOTE.AVAILABILITY_TIMEOUT_MS),
      );
    for (const probe of PROBE_SYMBOLS) {
      try {
        const period1 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        await Promise.race([
          yahooFinance.chart(probe, { period1, interval: '1d' }, { validateResult: false }),
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
    return `${symbol}.CA`;
  }

  async fetchQuotes(symbols: string[]): Promise<DataSourceResult> {
    const start = Date.now();
    const quotes = new Map<string, StockQuote>();
    const failed: string[] = [];

    const period1 = new Date(Date.now() - CHART_RANGE_DAYS * 24 * 60 * 60 * 1000);

    await mapWithConcurrency(symbols, CONCURRENCY_LIMIT, async (egxSymbol) => {
      const yahooSymbol = this.toYahooSymbol(egxSymbol);

      try {
        const chart = await yahooFinance.chart(yahooSymbol, {
          period1,
          interval: '1d',
        }, { validateResult: false }) as { quotes?: Array<{ date?: Date; open?: number | null; high?: number | null; low?: number | null; close?: number | null; volume?: number | null }> } | null;

        const chartQuotes = chart?.quotes;
        if (!chartQuotes || chartQuotes.length === 0) {
          failed.push(egxSymbol);
          return;
        }

        // Take the most recent entry with a valid close price
        const last = [...chartQuotes].reverse().find(q => q.close != null && Number.isFinite(q.close) && q.close > 0);
        if (!last || !last.close) {
          failed.push(egxSymbol);
          return;
        }

        const price = last.close;

        // previousClose = the trading day before last
        const prev = [...chartQuotes].reverse().find(q => q !== last && q.close != null && Number.isFinite(q.close) && q.close > 0);
        const previousClose = prev?.close ?? last.open ?? price;

        const change        = price - previousClose;
        const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

        const toNum = (v: number | null | undefined, fallback: number) =>
          v != null && Number.isFinite(v) ? v : fallback;

        quotes.set(egxSymbol, {
          symbol:        egxSymbol,
          price,
          change,
          changePercent,
          open:          toNum(last.open, price),
          high:          toNum(last.high, price),
          low:           toNum(last.low,  price),
          volume:        toNum(last.volume, 0),
          previousClose,
          timestamp:     last.date ?? new Date(),
          source:        'YAHOO',
        });
      } catch (err: unknown) {
        failed.push(egxSymbol);
        const msg = (err as Error).message;
        const isDelisted = msg.includes('No data found') || msg.includes('symbol may be delisted');
        if (isDelisted) {
          logger.warn('YahooFinance: symbol unavailable (delisted?)', { symbol: egxSymbol });
        } else {
          logger.error('YahooFinance: chart failed', { symbol: egxSymbol, error: msg });
        }
      }
    });

    const latency = Date.now() - start;
    logger.info('YahooFinance: fetchQuotes complete', {
      requested: symbols.length,
      success:   quotes.size,
      failed:    failed.length,
      latency,
    });

    return { quotes, failed, source: this.name, latency };
  }
}
