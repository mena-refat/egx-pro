/**
 * Yahoo Finance (yahoo-finance2) + Prisma cache for EGX stock quotes.
 * - Cache TTL = 5 min during market hours (Sun–Thu 10:00–14:15 Cairo).
 * - Outside market hours: return cache only, no Yahoo call.
 * - If Yahoo fails: return stale cache with { stale: true }.
 */

import YahooFinance from 'yahoo-finance2';
import { prisma } from '../lib/prisma.ts';
import { logger } from '../lib/logger.ts';

/** yahoo-finance2 v3 requires an instance; static methods throw. */
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const CAIRO_TZ = 'Africa/Cairo';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;

export type QuoteResult = {
  ticker: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  previousClose: number | null;
  volume: number | null;
  currency: string | null;
  symbol: string | null;
  longName: string | null;
  marketTime: string | null;
  cachedAt: string;
  stale?: boolean;
};

function getCairoNow(): { minutesSinceMidnight: number; weekday: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TZ,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    weekday: 'short',
  });
  const parts = formatter.formatToParts(now);
  let hour = 0, minute = 0, weekday = '';
  for (const p of parts) {
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
    if (p.type === 'weekday') weekday = p.value;
  }
  const minutesSinceMidnight = hour * 60 + minute;
  return { minutesSinceMidnight, weekday };
}

/** Sun–Thu 10:00–14:15 Cairo */
export function isMarketOpen(): boolean {
  const { minutesSinceMidnight, weekday } = getCairoNow();
  if (weekday === 'Fri' || weekday === 'Sat') return false;
  return minutesSinceMidnight >= 10 * 60 && minutesSinceMidnight < 14 * 60 + 15;
}

/** Normalize app ticker to Yahoo symbol (e.g. COMI → COMI.CA, ^CASE30 as-is). */
function toYahooTicker(ticker: string): string {
  const t = ticker.trim();
  if (t.startsWith('^')) return t;
  if (t.endsWith('.CA')) return t;
  return `${t}.CA`;
}

function cacheRowToResult(row: {
  ticker: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  previousClose: number | null;
  volume: number | null;
  currency: string | null;
  symbol: string | null;
  longName: string | null;
  marketTime: Date | null;
  cachedAt: Date;
}): QuoteResult {
  return {
    ticker: row.ticker,
    price: row.price ?? null,
    change: row.change ?? null,
    changePercent: row.changePercent ?? null,
    high: row.high ?? null,
    low: row.low ?? null,
    open: row.open ?? null,
    previousClose: row.previousClose ?? null,
    volume: row.volume ?? null,
    currency: row.currency ?? null,
    symbol: row.symbol ?? null,
    longName: row.longName ?? null,
    marketTime: row.marketTime ? row.marketTime.toISOString() : null,
    cachedAt: row.cachedAt.toISOString(),
  };
}

/**
 * Get single quote: check cache → if stale/missing and (market open or no cache) fetch Yahoo → upsert → return.
 * If Yahoo fails and we have cache, return cache with stale: true.
 */
export async function getQuote(ticker: string): Promise<QuoteResult | null> {
  const yahooTicker = toYahooTicker(ticker);
  const cached = await prisma.stockQuoteCache.findUnique({
    where: { ticker: yahooTicker },
  });

  const now = Date.now();
  const cacheAgeMs = cached ? now - cached.updatedAt.getTime() : Infinity;
  const cacheFresh = cacheAgeMs < CACHE_TTL_MS;
  const marketOpen = isMarketOpen();

  // Outside market hours: return cache only, do not hit Yahoo
  if (!marketOpen && cached) {
    return cacheRowToResult(cached);
  }

  // During market hours: use cache if fresh
  if (marketOpen && cached && cacheFresh) {
    return cacheRowToResult(cached);
  }

  // Fetch from Yahoo
  try {
    const quote = await yahooFinance.quote(yahooTicker) as Record<string, unknown> | null;
    if (!quote) {
      if (cached) {
        return { ...cacheRowToResult(cached), stale: true };
      }
      return null;
    }

    const price = typeof quote.regularMarketPrice === 'number' && Number.isFinite(quote.regularMarketPrice)
      ? quote.regularMarketPrice
      : null;
    const change = typeof quote.regularMarketChange === 'number' && Number.isFinite(quote.regularMarketChange)
      ? quote.regularMarketChange
      : null;
    const changePercent = typeof quote.regularMarketChangePercent === 'number' && Number.isFinite(quote.regularMarketChangePercent)
      ? quote.regularMarketChangePercent
      : null;
    const high = typeof quote.regularMarketDayHigh === 'number' && Number.isFinite(quote.regularMarketDayHigh)
      ? quote.regularMarketDayHigh
      : null;
    const low = typeof quote.regularMarketDayLow === 'number' && Number.isFinite(quote.regularMarketDayLow)
      ? quote.regularMarketDayLow
      : null;
    const open = typeof quote.regularMarketOpen === 'number' && Number.isFinite(quote.regularMarketOpen)
      ? quote.regularMarketOpen
      : null;
    const previousClose = typeof quote.regularMarketPreviousClose === 'number' && Number.isFinite(quote.regularMarketPreviousClose)
      ? quote.regularMarketPreviousClose
      : null;
    const vol = quote.regularMarketVolume ?? quote.volume;
    const volume = typeof vol === 'number' && Number.isFinite(vol) ? Math.round(vol) : null;
    const currency = typeof quote.currency === 'string' ? quote.currency : null;
    const symbol = typeof quote.symbol === 'string' ? quote.symbol : null;
    const longName = typeof quote.longName === 'string' ? quote.longName : null;
    const marketTimeRaw = quote.regularMarketTime;
    const marketTime = typeof marketTimeRaw === 'number' && Number.isFinite(marketTimeRaw)
      ? new Date(marketTimeRaw * 1000)
      : null;

    await prisma.stockQuoteCache.upsert({
      where: { ticker: yahooTicker },
      create: {
        ticker: yahooTicker,
        price,
        change,
        changePercent,
        high,
        low,
        open,
        previousClose,
        volume,
        currency,
        symbol,
        longName,
        marketTime,
      },
      update: {
        price,
        change,
        changePercent,
        high,
        low,
        open,
        previousClose,
        volume,
        currency,
        symbol,
        longName,
        marketTime,
      },
    });

    const updated = await prisma.stockQuoteCache.findUnique({
      where: { ticker: yahooTicker },
    });
    return updated ? cacheRowToResult(updated) : null;
  } catch (err) {
    logger.error('Yahoo Finance getQuote failed', { ticker: yahooTicker, error: (err as Error).message });
    if (cached) {
      return { ...cacheRowToResult(cached), stale: true };
    }
    return null;
  }
}

/**
 * Get multiple quotes. Uses Promise.allSettled; never throws for a single ticker.
 */
export async function getMultipleQuotes(tickers: string[]): Promise<{ ticker: string; quote: QuoteResult | null }[]> {
  const results = await Promise.allSettled(tickers.map(async (t) => ({ ticker: t, quote: await getQuote(t) })));
  return results.map((r) => {
    if (r.status === 'fulfilled') return r.value;
    return { ticker: (r.reason as { ticker?: string })?.ticker ?? 'unknown', quote: null };
  });
}

/**
 * Next market open/close in Cairo. Returns ISO strings for display.
 */
function getNextOpenClose(): { nextOpen: string; nextClose: string } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TZ,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  let weekday = '', hour = 0, minute = 0, year = 0, month = 0, day = 0;
  for (const p of parts) {
    if (p.type === 'weekday') weekday = p.value;
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
    if (p.type === 'year') year = parseInt(p.value, 10);
    if (p.type === 'month') month = parseInt(p.value, 10);
    if (p.type === 'day') day = parseInt(p.value, 10);
  }
  const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
  const totalMinutes = hour * 60 + minute;
  const closeMinutes = 14 * 60 + 15;

  // 10:00 Cairo = 08:00 UTC; 14:15 Cairo = 12:15 UTC (EET UTC+2)
  let nextOpen = new Date(Date.UTC(year, month - 1, day, 8, 0, 0, 0));
  let nextClose = new Date(Date.UTC(year, month - 1, day, 12, 15, 0, 0));

  if (dayIndex === 5 || dayIndex === 6) {
    const daysToAdd = dayIndex === 5 ? 2 : 1;
    nextOpen.setUTCDate(nextOpen.getUTCDate() + daysToAdd);
    nextClose.setUTCDate(nextClose.getUTCDate() + daysToAdd);
  } else if (totalMinutes >= closeMinutes) {
    nextOpen.setUTCDate(nextOpen.getUTCDate() + 1);
    nextClose.setUTCDate(nextClose.getUTCDate() + 1);
    if (nextOpen.getUTCDay() === 5) {
      nextOpen.setUTCDate(nextOpen.getUTCDate() + 2);
      nextClose.setUTCDate(nextClose.getUTCDate() + 2);
    }
  }

  return {
    nextOpen: nextOpen.toISOString(),
    nextClose: nextClose.toISOString(),
  };
}

export function getMarketStatus(): { isOpen: boolean; nextOpen: string; nextClose: string } {
  const open = isMarketOpen();
  const { nextOpen, nextClose } = getNextOpenClose();
  return { isOpen: open, nextOpen, nextClose };
}

/**
 * Prefetch all EGX stocks in batches of 10 with 500ms delay between batches.
 */
export async function prefetchAllEGXStocks(tickers: string[]): Promise<void> {
  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(batch.map((t) => getQuote(t)));
    if (i + BATCH_SIZE < tickers.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }
}

const BULK_BATCH_SIZE = 20;
const BULK_BATCH_DELAY_MS = 400;

/**
 * Fetch quotes for many tickers in batches (for screener/listing). Returns a map of ticker → quote
 * only for tickers that have at least a price. Used by GET /stocks/prices.
 */
export async function getBulkQuotesForScreener(tickers: string[]): Promise<Map<string, QuoteResult>> {
  const result = new Map<string, QuoteResult>();
  for (let i = 0; i < tickers.length; i += BULK_BATCH_SIZE) {
    const batch = tickers.slice(i, i + BULK_BATCH_SIZE);
    const rows = await getMultipleQuotes(batch);
    for (const { ticker, quote } of rows) {
      if (quote && quote.price != null && Number.isFinite(quote.price)) {
        result.set(ticker, quote);
      }
    }
    if (i + BULK_BATCH_SIZE < tickers.length) {
      await new Promise((r) => setTimeout(r, BULK_BATCH_DELAY_MS));
    }
  }
  return result;
}
