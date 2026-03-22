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

/** Historical OHLCV from Yahoo Finance chart endpoint — cached in Redis. */
export async function getStockHistory(ticker: string, range = '1mo'): Promise<OHLCVRow[]> {
  const cacheKey = `history:${ticker}:${range}`;
  const { status: marketStatus } = getMarketStatus();
  const isOpen = marketStatus === 'open' || marketStatus === 'pre' || marketStatus === 'auction';
  // During market hours: 10 min TTL (intraday candle updates). Off hours: 4 hours.
  const ttl = isOpen ? 600 : 14_400;

  const cached = await getCache<Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>>(cacheKey);
  if (cached && cached.length > 0) {
    return cached.map((c) => ({ ...c, date: new Date(c.date) }));
  }

  const yahooTicker = toYahooSymbol(ticker);
  const days = RANGE_DAYS[range] ?? 30;
  const period1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  try {
    const YahooFinance = (await import('yahoo-finance2')).default;
    const yahoo = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
    const chart = await yahoo.chart(yahooTicker, { period1, interval: '1d' }, { validateResult: false }) as { quotes?: Array<{ date: Date; open?: number; high?: number; low?: number; close?: number; volume?: number }> } | null;
    const quotes = chart?.quotes ?? [];
    const result: OHLCVRow[] = quotes
      .filter((q) => q.close != null && Number.isFinite(q.close))
      .map((q) => ({
        date: q.date,
        open: q.open ?? q.close!,
        high: q.high ?? q.close!,
        low: q.low ?? q.close!,
        close: q.close!,
        volume: q.volume ?? 0,
      }));
    if (result.length > 0) {
      await setCache(cacheKey, result, ttl).catch(() => {});
    }
    return result;
  } catch {
    return [];
  }
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

/** Financials from yahoo-finance2 quoteSummary — cached 24 h in Redis (fundamentals change quarterly). */
export async function getFinancials(ticker: string): Promise<FinancialsData> {
  const cacheKey = `fin:${ticker}`;
  const cached = await getCache<FinancialsData>(cacheKey);
  if (cached) return cached;

  const yahooTicker = toYahooSymbol(ticker);

  const fetchedData = await (async (): Promise<FinancialsData> => {
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
  })();

  // Cache 24 hours — fundamentals change quarterly, not daily
  const hasAnyData = Object.values(fetchedData).some((v) => v !== null);
  await setCache(cacheKey, fetchedData, hasAnyData ? 86_400 : 3_600).catch(() => {});

  return fetchedData;
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
