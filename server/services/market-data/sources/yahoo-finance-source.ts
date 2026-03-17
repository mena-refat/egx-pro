/**
 * Yahoo Finance data source — uses the CHART endpoint (not quote).
 *
 * Why chart instead of quote?
 * The quote endpoint (regularMarketPrice) is BROKEN for many EGX stocks:
 * it returns prices from months/years ago (e.g. ABUK.CA shows 58.32 from Jul 2024).
 * The chart endpoint returns accurate historical OHLCV data — the last close
 * matches the actual market price (e.g. ABUK.CA chart close = 88.06 ✓).
 *
 * Interval strategy:
 * - Market hours   (10:00–15:00 Cairo, Sun–Thu): 15m interval, 2 days back
 *   → most recent 15m candle close = live intraday price
 *   → last candle from a different date = previousClose (yesterday's close)
 * - Outside hours / weekend: 1d interval, 5 days back
 *   → last daily close = accurate settlement price
 *
 * Symbol mapping:
 * Most EGX tickers map to TICKER.CA on Yahoo Finance.
 * A small set use non-standard identifiers (see SYMBOL_MAP).
 * ~65 EGX tickers are simply not listed on Yahoo Finance (delisted / unlisted).
 */
import YahooFinance from 'yahoo-finance2';
import type { IMarketDataSource, DataSourceResult, StockQuote } from '../types.ts';
import { logger } from '../../../lib/logger.ts';
import { STOCK_QUOTE, MARKET_DATA } from '../../../lib/constants.ts';
import { withRetry } from '../../../lib/retry.ts';
import { toYahooSymbol } from '../../../lib/yahooSymbolMap.ts';

/** yahoo-finance2 v3 requires an instance; static methods throw. */
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

/** عدة رموز للـ probe — لو أحدها نجح نعتبر المصدر متاح */
const PROBE_SYMBOLS = ['COMI.CA', 'HRHO.CA', 'ETEL.CA'];
/** أقصى عدد طلبات متزامنة لتفادي حظر IP من Yahoo */
const CONCURRENCY_LIMIT = 8;
/** نجيب 5 أيام عشان نضمن إن فيه يومين على الأقل بعد العطلة (للـ 1d interval) */
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

/** Check if Cairo market is currently open (Sun–Thu, 10:00–15:00 EET/EEST). */
function isMarketOpen(): boolean {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MARKET_DATA.CAIRO_TZ,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    weekday: 'short',
  });
  const parts = formatter.formatToParts(new Date());
  let hour = 0, minute = 0, weekday = '';
  for (const p of parts) {
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
    if (p.type === 'weekday') weekday = p.value;
  }
  if (weekday === 'Fri' || weekday === 'Sat') return false;
  const minutesSinceMidnight = hour * 60 + minute;
  const openMinute = MARKET_DATA.MARKET_OPEN_HOUR * 60;
  const closeMinute =
    MARKET_DATA.MARKET_CLOSE_HOUR * 60 +
    (MARKET_DATA as { MARKET_CLOSE_MINUTE?: number }).MARKET_CLOSE_MINUTE ?? 0;
  return minutesSinceMidnight >= openMinute && minutesSinceMidnight < closeMinute;
}

type ChartQuote = {
  date?: Date;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
};

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

  async fetchQuotes(symbols: string[]): Promise<DataSourceResult> {
    const start = Date.now();
    const quotes = new Map<string, StockQuote>();
    const failed: string[] = [];

    const marketOpen = isMarketOpen();

    // During market hours: 15m candles over 2 days (captures yesterday's close + today's intraday)
    // Outside market hours: daily candles over 5 days (ensures ≥2 trading days after weekends)
    const period1 = marketOpen
      ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - CHART_RANGE_DAYS * 24 * 60 * 60 * 1000);
    const interval = marketOpen ? '5m' : '1d';

    await mapWithConcurrency(symbols, CONCURRENCY_LIMIT, async (egxSymbol) => {
      const yahooSymbol = toYahooSymbol(egxSymbol);

      try {
        const chart = await withRetry(
          () =>
            yahooFinance.chart(
              yahooSymbol,
              { period1, interval },
              { validateResult: false },
            ) as Promise<{ quotes?: ChartQuote[] } | null>,
          { maxAttempts: 2, baseDelayMs: 500 }
        );

        const chartQuotes = chart?.quotes;
        if (!chartQuotes || chartQuotes.length === 0) {
          failed.push(egxSymbol);
          return;
        }

        // Most recent candle with a valid close price
        const last = [...chartQuotes].reverse().find(
          q => q.close != null && Number.isFinite(q.close) && q.close > 0,
        );
        if (!last || !last.close) {
          failed.push(egxSymbol);
          return;
        }

        const price = last.close;

        // previousClose:
        // - 15m mode: last candle from a DIFFERENT calendar date (= yesterday's close)
        // - 1d  mode: second-most-recent daily close
        let prev: ChartQuote | undefined;
        if (marketOpen && last.date) {
          const lastDateStr = new Date(last.date).toDateString();
          prev = [...chartQuotes].reverse().find(
            q =>
              q !== last &&
              q.close != null &&
              Number.isFinite(q.close) &&
              q.close > 0 &&
              q.date != null &&
              new Date(q.date).toDateString() !== lastDateStr,
          );
        } else {
          prev = [...chartQuotes].reverse().find(
            q => q !== last && q.close != null && Number.isFinite(q.close) && q.close > 0,
          );
        }
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
      interval,
    });

    return { quotes, failed, source: this.name, latency };
  }
}
