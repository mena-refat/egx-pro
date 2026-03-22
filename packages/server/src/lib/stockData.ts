import { getCache, setCache } from './redis.ts';
import { EGX_TICKERS } from './egxTickers.ts';
import { prisma } from './prisma.ts';
import { toYahooSymbol } from './yahooSymbolMap.ts';
import { marketDataService } from '../services/market-data/market-data.service.ts';
import { logger } from './logger.ts';
import { getMarketStatus } from './marketHours.ts';

const DELAY_MINUTES = 10;

export type StockPriceData = {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number | null;
  high?: number;
  low?: number;
  high52w?: number;
  low52w?: number;
  open?: number;
  previousClose?: number;
  name: string;
  isDelayed?: boolean;
  delayMinutes?: number;
  priceTime?: string;
};

function quoteToStockPriceData(symbol: string, q: { price: number; change: number; changePercent: number; volume: number; high: number; low: number; open: number; previousClose: number }): StockPriceData {
  return {
    ticker: symbol,
    price: q.price,
    change: q.change,
    changePercent: q.changePercent,
    volume: q.volume,
    high: q.high,
    low: q.low,
    open: q.open,
    previousClose: q.previousClose,
    name: symbol,
  };
}

/** Single source of truth: MarketDataService (Redis + memory cache). */
export async function getStockPrice(ticker: string): Promise<(StockPriceData & { delayedAt?: number }) | null> {
  const quote = await marketDataService.getQuote(ticker);
  if (!quote || !Number.isFinite(quote.price)) return null;
  return quoteToStockPriceData(quote.symbol, quote);
}

/** للخطة المجانية: سعر متأخر 10 دقائق من الكاش */
export async function getStockPriceDelayed(ticker: string): Promise<(StockPriceData & { isDelayed: boolean; delayMinutes: number; priceTime: string }) | null> {
  const delayedKey = `stock:price:delayed:${ticker}`;
  const delayed = await getCache<StockPriceData & { delayedAt: number }>(delayedKey);
  if (delayed && delayed.delayedAt) {
    const priceTime = new Date(delayed.delayedAt).toISOString().slice(11, 19);
    return {
      ...delayed,
      isDelayed: true,
      delayMinutes: DELAY_MINUTES,
      priceTime,
    };
  }
  const live = await getStockPrice(ticker);
  if (!live) return null;
  const tenMinAgo = Date.now() - DELAY_MINUTES * 60 * 1000;
  const priceTime = new Date(tenMinAgo).toISOString().slice(11, 19);
  return {
    ...live,
    isDelayed: true,
    delayMinutes: DELAY_MINUTES,
    priceTime,
  };
}

export async function getBulkPrices(tickers: string[] = EGX_TICKERS) {
  const promises = tickers.map(ticker => getStockPrice(ticker));
  const results = await Promise.allSettled(promises);
  return results
    .filter((r): r is PromiseFulfilledResult<StockPriceData | (StockPriceData & { delayedAt?: number })> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
}

/** أسعار متأخرة للمجانيين */
export async function getBulkPricesDelayed(tickers: string[] = EGX_TICKERS): Promise<(StockPriceData & { isDelayed: boolean; delayMinutes: number; priceTime: string })[]> {
  const promises = tickers.map(ticker => getStockPriceDelayed(ticker));
  const results = await Promise.allSettled(promises);
  return results
    .filter((r): r is PromiseFulfilledResult<StockPriceData & { isDelayed: boolean; delayMinutes: number; priceTime: string }> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
}

const RANGE_DAYS: Record<string, number> = { '1w': 7, '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365 };

type OHLCVRow = { date: Date; open: number; high: number; low: number; close: number; volume: number };

/** Normalize a date to midnight UTC for consistent DB storage. */
function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function fetchHistoryFromYahoo(ticker: string, range: string): Promise<OHLCVRow[]> {
  const yahooTicker = toYahooSymbol(ticker);
  const days = RANGE_DAYS[range] ?? 30;
  const period1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  try {
    const YahooFinance = (await import('yahoo-finance2')).default;
    const yahoo = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
    const chart = await yahoo.chart(yahooTicker, { period1, interval: '1d' }, { validateResult: false }) as { quotes?: Array<{ date: Date; open?: number; high?: number; low?: number; close?: number; volume?: number }> } | null;
    const quotes = chart?.quotes ?? [];
    return quotes
      .filter((q) => q.close != null && Number.isFinite(q.close))
      .map((q) => ({
        date: toDateOnly(q.date),
        open: q.open ?? q.close!,
        high: q.high ?? q.close!,
        low: q.low ?? q.close!,
        close: q.close!,
        volume: q.volume ?? 0,
      }));
  } catch {
    return [];
  }
}

/**
 * Historical OHLCV — DB is source of truth (historical candles never change).
 * Flow: Redis L1 (10 min open / 4 h closed) → DB → Yahoo Finance → save to DB + Redis.
 * Today's candle is always re-fetched during market hours to get the latest price.
 */
export async function getStockHistory(ticker: string, range = '1mo'): Promise<OHLCVRow[]> {
  const { status: marketStatus } = getMarketStatus();
  const isOpen = marketStatus === 'open' || marketStatus === 'pre' || marketStatus === 'auction';
  const cacheKey = `history:${ticker}:${range}`;
  const redisTtl = isOpen ? 600 : 14_400;

  // L1: Redis
  const L1 = await getCache<Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>>(cacheKey);
  if (L1 && L1.length > 0) {
    return L1.map((c) => ({ ...c, date: new Date(c.date) }));
  }

  const days = RANGE_DAYS[range] ?? 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // L2: DB — get all candles in range
  const dbCandles = await prisma.stockCandle.findMany({
    where: { ticker, date: { gte: since } },
    orderBy: { date: 'asc' },
  });

  // Check if DB is up to date: latest candle should be within last 3 calendar days
  const latestDb = dbCandles.length ? dbCandles[dbCandles.length - 1]!.date : null;
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const dbIsFresh = latestDb != null && latestDb >= threeDaysAgo;

  if (dbCandles.length > 0 && dbIsFresh && !isOpen) {
    // Off market hours + DB is fresh → serve from DB
    const result = dbCandles.map((c) => ({ date: c.date, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume }));
    await setCache(cacheKey, result, redisTtl).catch(() => {});
    return result;
  }

  // L3: Yahoo Finance (first fetch, stale DB, or market is open)
  const fresh = await fetchHistoryFromYahoo(ticker, range);

  if (fresh.length > 0) {
    // Bulk-insert new candles — skipDuplicates so historical data is never re-inserted
    await prisma.stockCandle.createMany({
      data: fresh.map((c) => ({ ticker, date: c.date, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume })),
      skipDuplicates: true,
    }).catch((e) => logger.warn('stockCandle insert failed', { ticker, error: (e as Error).message }));

    await setCache(cacheKey, fresh, redisTtl).catch(() => {});
    return fresh;
  }

  // Yahoo failed but DB has partial data — return what we have
  if (dbCandles.length > 0) {
    return dbCandles.map((c) => ({ date: c.date, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume }));
  }

  return [];
}

export type FinancialsData = {
  pe: number | null;
  forwardPe: number | null;
  eps: number | null;
  roe: number | null;
  roa: number | null;
  debtToEquity: number | null;
  grossMargin: number | null;
  profitMargin: number | null;
  operatingMargin: number | null;
  revenue: number | null;
  revenueGrowth: number | null;
  netIncome: number | null;
  freeCashFlow: number | null;
  dividendYield: number | null;
  bookValue: number | null;
  priceToBook: number | null;
  marketCap: number | null;
  beta: number | null;
};

const FINANCIALS_NULLS: FinancialsData = {
  pe: null, forwardPe: null, eps: null, roe: null, roa: null,
  debtToEquity: null, grossMargin: null, profitMargin: null, operatingMargin: null,
  revenue: null, revenueGrowth: null, netIncome: null, freeCashFlow: null,
  dividendYield: null, bookValue: null, priceToBook: null, marketCap: null, beta: null,
};

async function fetchFinancialsFromYahoo(ticker: string): Promise<FinancialsData> {
  const yahooTicker = toYahooSymbol(ticker);
  try {
    const YahooFinance = (await import('yahoo-finance2')).default;
    const yahoo = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

    let summary: Record<string, unknown> | null = null;
    try {
      summary = (await yahoo.quoteSummary(yahooTicker, {
        modules: ['defaultKeyStatistics', 'financialData', 'summaryDetail'] as ('defaultKeyStatistics' | 'financialData' | 'summaryDetail')[],
      })) as Record<string, unknown>;
    } catch {
      logger.info(`quoteSummary unavailable for ${yahooTicker} — Claude will search`);
      return FINANCIALS_NULLS;
    }

    if (!summary) return FINANCIALS_NULLS;

    const fin = summary.financialData as Record<string, unknown> | undefined;
    const keys = summary.defaultKeyStatistics as Record<string, unknown> | undefined;

    const num = (v: unknown): number | null => {
      if (v == null) return null;
      const n = typeof v === 'object' && v !== null && 'raw' in v ? (v as { raw: number }).raw : Number(v);
      return Number.isFinite(n) ? n : null;
    };

    return {
      pe: num(keys?.trailingPE),
      forwardPe: num(keys?.forwardPE),
      eps: num(keys?.trailingEps),
      roe: num(fin?.returnOnEquity),
      roa: num(fin?.returnOnAssets),
      debtToEquity: num(fin?.debtToEquity),
      grossMargin: num(fin?.grossMargins),
      profitMargin: num(fin?.profitMargins),
      operatingMargin: num(fin?.operatingMargins),
      revenue: num(fin?.totalRevenue),
      revenueGrowth: num(fin?.revenueGrowth),
      netIncome: null,
      freeCashFlow: num(fin?.freeCashflow),
      dividendYield: num(keys?.dividendYield),
      bookValue: num(keys?.bookValue),
      priceToBook: num(keys?.priceToBook),
      marketCap: null,
      beta: num(keys?.beta),
    };
  } catch (err) {
    logger.warn('getFinancials failed completely', { ticker, error: (err as Error).message });
    return FINANCIALS_NULLS;
  }
}

function dbRowToFinancials(row: {
  pe: number | null; forwardPe: number | null; eps: number | null; roe: number | null;
  roa: number | null; debtToEquity: number | null; grossMargin: number | null;
  profitMargin: number | null; operatingMargin: number | null; revenue: number | null;
  revenueGrowth: number | null; freeCashFlow: number | null; dividendYield: number | null;
  bookValue: number | null; priceToBook: number | null; beta: number | null;
}): FinancialsData {
  return { ...row, netIncome: null, marketCap: null };
}

/**
 * Fundamentals — DB is source of truth (survives Redis restarts).
 * Flow: Redis L1 (5 min) → DB (24 h TTL on updatedAt) → Yahoo Finance → save to DB + Redis.
 */
export async function getFinancials(ticker: string): Promise<FinancialsData> {
  const cacheKey = `fin:${ticker}`;
  const L1 = await getCache<FinancialsData>(cacheKey);
  if (L1) return L1;

  const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

  // L2: DB
  const dbRow = await prisma.stockFundamentals.findUnique({ where: { ticker } });
  if (dbRow && Date.now() - dbRow.updatedAt.getTime() < STALE_MS) {
    const data = dbRowToFinancials(dbRow);
    await setCache(cacheKey, data, 300).catch(() => {}); // warm L1 for 5 min
    return data;
  }

  // L3: Yahoo Finance
  const fresh = await fetchFinancialsFromYahoo(ticker);

  // Persist to DB (upsert — overwrites stale row or creates new).
  // netIncome and marketCap are not in the DB schema (always null from Yahoo) — strip them.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { netIncome: _ni, marketCap: _mc, ...dbFields } = fresh;
  await prisma.stockFundamentals.upsert({
    where: { ticker },
    create: { ticker, ...dbFields },
    update: { ...dbFields },
  }).catch((e) => logger.warn('stockFundamentals upsert failed', { ticker, error: (e as Error).message }));

  // Warm L1 — 5 min if data exists, 1 h if all nulls (avoid hammering Yahoo)
  const hasData = Object.values(fresh).some((v) => v !== null);
  await setCache(cacheKey, fresh, hasData ? 300 : 3_600).catch(() => {});

  return fresh;
}

/** Search EGX stocks by name from database. */
export async function searchEgxStocks(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const stocks = await prisma.stock.findMany({
    where: {
      OR: [
        { nameAr: { contains: trimmed, mode: 'insensitive' } },
        { nameEn: { contains: trimmed, mode: 'insensitive' } },
        { ticker: { contains: trimmed, mode: 'insensitive' } },
      ],
    },
    take: 30,
    select: { ticker: true, nameAr: true, nameEn: true },
  });

  return stocks.map((s) => ({
    ticker: s.ticker,
    name: s.nameEn || s.nameAr || s.ticker,
    price: 0,
    change: 0,
    changePercent: 0,
    volume: 0,
    marketCap: 0,
    sector: '',
    description: '',
  }));
}
