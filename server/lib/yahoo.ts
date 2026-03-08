import YahooFinance from 'yahoo-finance2';
import { getCache, setCache } from './redis.ts';
import { EGX_TICKERS } from './egxTickers.ts';
import { logger } from './logger.ts';

const yahooFinance = new YahooFinance();

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

export async function getStockPrice(ticker: string): Promise<(StockPriceData & { delayedAt?: number }) | null> {
  const cacheKey = `stock:price:${ticker}`;
  const cached = await getCache<StockPriceData & { delayedAt?: number }>(cacheKey);
  if (cached) return cached;

  try {
    const result = await yahooFinance.quote(`${ticker}.CA`);
    const data: StockPriceData & { delayedAt?: number } = {
      ticker,
      price: result.regularMarketPrice,
      change: result.regularMarketChange,
      changePercent: result.regularMarketChangePercent,
      volume: result.regularMarketVolume,
      high: result.regularMarketDayHigh,
      low: result.regularMarketDayLow,
      high52w: result.fiftyTwoWeekHigh,
      low52w: result.fiftyTwoWeekLow,
      open: result.regularMarketOpen,
      previousClose: result.regularMarketPreviousClose,
      name: result.longName || result.shortName || ticker,
    };
    await setCache(cacheKey, data, 60);
    return data;
  } catch (error) {
    logger.error('Error fetching price', { ticker, error });
    return null;
  }
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

export async function getStockHistory(ticker: string, range: string = '1mo') {
  const cacheKey = `stock:history:${ticker}:${range}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  try {
    const period1 = new Date();
    const period2 = new Date();
    let interval: '1d' | '1wk' | '1mo' = '1d';

    switch (range) {
      case '1d': period1.setDate(period1.getDate() - 1); break;
      case '1w': period1.setDate(period1.getDate() - 7); break;
      case '1mo': period1.setMonth(period1.getMonth() - 1); break;
      case '3mo': period1.setMonth(period1.getMonth() - 3); break;
      case '6mo': period1.setMonth(period1.getMonth() - 6); break;
      case '1y': period1.setFullYear(period1.getFullYear() - 1); interval = '1wk'; break;
      case '5y': period1.setFullYear(period1.getFullYear() - 5); interval = '1mo'; break;
      default: period1.setMonth(period1.getMonth() - 1);
    }

    const result = await yahooFinance.historical(`${ticker}.CA`, {
      period1,
      period2,
      interval
    });

    const data = result.map(item => ({
      date: item.date.toISOString().split('T')[0],
      price: item.close
    }));

    await setCache(cacheKey, data, 300); // Cache for 5 minutes
    return data;
  } catch (error) {
    logger.error('Error fetching history', { ticker, error });
    return [];
  }
}

export async function getFinancials(ticker: string) {
  const cacheKey = `stock:financials:${ticker}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  try {
    const result = await yahooFinance.quoteSummary(`${ticker}.CA`, {
      modules: ['financialData', 'defaultKeyStatistics', 'incomeStatementHistory']
    });

    const fd = result.financialData;
    const ks = result.defaultKeyStatistics;
    const is = result.incomeStatementHistory?.incomeStatementHistory?.[0];

    const data = {
      pe: ks?.trailingPE || fd?.currentPrice / ks?.trailingEps || null,
      roe: fd?.returnOnEquity,
      roa: fd?.returnOnAssets,
      debtToEquity: fd?.debtToEquity,
      grossMargin: fd?.grossMargins,
      profitMargin: fd?.profitMargins,
      revenue: fd?.totalRevenue,
      netIncome: is?.netIncome,
      eps: ks?.trailingEps,
    };

    await setCache(cacheKey, data, 86400); // Cache for 24 hours
    return data;
  } catch (error) {
    logger.error('Error fetching financials', { ticker, error });
    return null;
  }
}

export async function searchEgxStocks(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const result = await yahooFinance.search(trimmed, {
      quotesCount: 30,
      newsCount: 0,
    });

    const quotes = (result.quotes || []) as Array<{ symbol?: string; shortname?: string; longname?: string }>;

    return quotes
      .filter((q): q is typeof q & { symbol: string } => !!q.symbol && q.symbol.endsWith('.CA'))
      .map((q) => ({
        ticker: q.symbol.replace('.CA', ''),
        name: q.shortname || q.longname || q.symbol,
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        marketCap: 0,
        sector: '',
        description: '',
      }));
  } catch (error) {
    logger.error('Error searching EGX stocks', { error });
    return [];
  }
}
