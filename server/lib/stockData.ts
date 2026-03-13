import { getCache } from './redis.ts';
import { EGX_TICKERS } from './egxTickers.ts';
import { prisma } from './prisma.ts';
import { marketDataService } from '../services/market-data/market-data.service.ts';

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

/** Historical OHLCV from Yahoo Finance chart endpoint. */
export async function getStockHistory(ticker: string, range = '1mo'): Promise<Array<{ date: Date; open: number; high: number; low: number; close: number; volume: number }>> {
  const yahooTicker = ticker.endsWith('.CA') ? ticker : `${ticker}.CA`;
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
        date: q.date,
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

/** Financials — stubbed; use Twelve Data or another provider in future if needed. */
export async function getFinancials(_ticker: string) {
  return {
    pe: null as number | null,
    roe: null as number | null,
    roa: null as number | null,
    debtToEquity: null as number | null,
    grossMargin: null as number | null,
    profitMargin: null as number | null,
    revenue: null as number | null,
    netIncome: null as number | null,
    eps: null as number | null,
  };
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
