import YahooFinance from 'yahoo-finance2';
import { getCache, setCache } from './redis.ts';
import { EGX_TICKERS } from './egxTickers.ts';

const yahooFinance = new YahooFinance();

export async function getStockPrice(ticker: string) {
  const cacheKey = `stock:price:${ticker}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  try {
    const result = await yahooFinance.quote(`${ticker}.CA`);
    const data = {
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
    await setCache(cacheKey, data, 60); // Cache for 60 seconds
    return data;
  } catch (error) {
    console.error(`Error fetching price for ${ticker}:`, error);
    return null;
  }
}

export async function getBulkPrices(tickers: string[] = EGX_TICKERS) {
  const promises = tickers.map(ticker => getStockPrice(ticker));
  const results = await Promise.allSettled(promises);
  
  return results
    .filter((r): r is PromiseFulfilledResult<unknown> => r.status === 'fulfilled' && r.value !== null)
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
    console.error(`Error fetching history for ${ticker}:`, error);
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
    console.error(`Error fetching financials for ${ticker}:`, error);
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
      .filter((q) => q.symbol && q.symbol.endsWith('.CA'))
      .map((q) => ({
        ticker: q.symbol!.replace('.CA', ''),
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
    console.error('Error searching EGX stocks:', error);
    return [];
  }
}
