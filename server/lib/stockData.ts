import { getCache, setCache } from './redis.ts';
import { EGX_TICKERS } from './egxTickers.ts';
import { prisma } from './prisma.ts';

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

/** Reads from market-data cache only. Price updates come from MarketDataService (Twelve Data) polling. */
export async function getStockPrice(ticker: string): Promise<(StockPriceData & { delayedAt?: number }) | null> {
  const cacheKey = `stock:quote:${ticker}`;
  const cached = await getCache<{ symbol: string; price: number; change: number; changePercent: number; volume: number; high?: number; low?: number; open?: number; previousClose?: number }>(cacheKey);
  if (!cached) return null;
  return {
    ticker: cached.symbol,
    price: cached.price,
    change: cached.change,
    changePercent: cached.changePercent,
    volume: cached.volume ?? null,
    high: cached.high,
    low: cached.low,
    open: cached.open,
    previousClose: cached.previousClose,
    name: cached.symbol,
  };
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

/** Historical prices — stubbed; use Twelve Data time_series in future if needed. */
export async function getStockHistory(_ticker: string, _range: string = '1mo') {
  return [];
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
