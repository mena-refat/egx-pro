import { getStockHistory, getFinancials, searchEgxStocks } from '../lib/stockData.ts';
import { EGX_STOCKS } from '../lib/egxStocks.ts';
import { EGX_TICKERS } from '../lib/egxTickers.ts';
import { StockRepository } from '../repositories/stock.repository.ts';
import type { GicsSector } from '@prisma/client';
import { marketDataService } from './market-data/market-data.service.ts';
import { NewsService } from './news.service.ts';
import { getCache, setCache } from '../lib/redis.ts';

const GICS_VALUES: GicsSector[] = [
  'INFORMATION_TECHNOLOGY', 'HEALTH_CARE', 'FINANCIALS', 'CONSUMER_DISCRETIONARY',
  'CONSUMER_STAPLES', 'ENERGY', 'INDUSTRIALS', 'MATERIALS', 'UTILITIES',
  'REAL_ESTATE', 'COMMUNICATION_SERVICES',
];

const BULK_PRICES_TTL_MS = 2_500;

function quoteToPriceRow(
  q: { ticker: string; price: number; change: number; changePercent: number; volume: number },
  sector: GicsSector | null,
  description?: string | null,
) {
  return {
    ticker: q.ticker,
    price: q.price,
    change: q.change,
    changePercent: q.changePercent,
    volume: q.volume,
    sector,
    description: description ?? null,
    isDelayed: !marketDataService.isMarketOpen(),
    priceTime: new Date().toISOString().slice(11, 19),
  };
}

type PriceRow = ReturnType<typeof quoteToPriceRow>;
const bulkPricesCache = new Map<string, { expiresAt: number; value: PriceRow[] }>();
const bulkPricesInFlight = new Map<string, Promise<PriceRow[]>>();

export const StocksService = {
  async getBulkPrices(_delayed: boolean, sector?: string) {
    const cacheKey = `${_delayed ? 'delayed' : 'realtime'}:${sector ?? 'all'}`;
    const now = Date.now();
    const hit = bulkPricesCache.get(cacheKey);
    if (hit && hit.expiresAt > now) return hit.value;
    const inflight = bulkPricesInFlight.get(cacheKey);
    if (inflight) return inflight;

    const buildPromise = (async () => {
    let tickers = EGX_TICKERS;
    if (sector && GICS_VALUES.includes(sector as GicsSector)) {
      const stocks = await StockRepository.findTickersBySector(sector as GicsSector);
      tickers = stocks.map((s) => s.ticker);
      if (tickers.length === 0) return [];
    }

    const [cached, allStocks] = await Promise.all([
      marketDataService.getCachedQuotes(tickers),
      StockRepository.findAllWithSector(),
    ]);

    // If cache is warm, serve instantly. If completely cold (server just started),
    // fall back to a live fetch so the first page load always has data.
    const quotes = cached.size > 0 ? cached : await marketDataService.getQuotes(tickers);

    const sectorMap = new Map<string, GicsSector>();
    const descriptionMap = new Map<string, string>();
    allStocks.forEach((s) => {
      if (s.sector) sectorMap.set(s.ticker, s.sector);
      if (s.description) descriptionMap.set(s.ticker, s.description);
    });

    const rows: PriceRow[] = [];
    for (const [ticker, q] of quotes.entries()) {
      if (q.price > 0) {
        rows.push(quoteToPriceRow(
          { ticker, price: q.price, change: q.change, changePercent: q.changePercent, volume: q.volume },
          sectorMap.get(ticker) ?? null,
          descriptionMap.get(ticker) ?? null,
        ));
      }
    }
    return rows;
    })();

    bulkPricesInFlight.set(cacheKey, buildPromise);
    try {
      const value = await buildPromise;
      bulkPricesCache.set(cacheKey, { value, expiresAt: now + BULK_PRICES_TTL_MS });
      return value;
    } finally {
      bulkPricesInFlight.delete(cacheKey);
    }
  },

  async search(q: string) {
    const results = await searchEgxStocks(q);
    if (results.length === 0) return [];

    const tickers = results.map(r => r.ticker);
    const cached = await marketDataService.getCachedQuotes(tickers);

    // If cache is cold (server just started), return all results unfiltered
    // rather than returning an empty list.
    if (cached.size === 0) return results;

    return results.filter(r => cached.has(r.ticker));
  },

  async getPrice(ticker: string, delayed: boolean) {
    const { getStockPrice, getStockPriceDelayed } = await import('../lib/stockData.ts');
    const [priceData, stockInfo] = await Promise.all([
      delayed ? getStockPriceDelayed(ticker) : getStockPrice(ticker),
      StockRepository.findByTicker(ticker),
    ]);
    if (!priceData) return null;
    return {
      ticker: priceData.ticker,
      price: priceData.price,
      change: priceData.change,
      changePercent: priceData.changePercent,
      volume: priceData.volume ?? 0,
      high: priceData.high,
      low: priceData.low,
      open: priceData.open,
      previousClose: priceData.previousClose,
      name: priceData.name,
      description: stockInfo?.description ?? null,
      isDelayed: 'isDelayed' in priceData ? priceData.isDelayed : !marketDataService.isMarketOpen(),
      priceTime: 'priceTime' in priceData ? priceData.priceTime : new Date().toISOString().slice(11, 19),
    };
  },

  getHistory(ticker: string, range?: string) {
    return getStockHistory(ticker, range);
  },

  getFinancials(ticker: string) {
    return getFinancials(ticker);
  },

  getNews(ticker: string) {
    return NewsService.getByTicker(ticker);
  },

  async gainersLosers(period: 'day' | 'week' | 'month' | 'year', limit = 10) {
    const cacheKey = `gainers-losers:${period}`;
    const ttlMap = { day: 60, week: 1_800, month: 14_400, year: 43_200 };

    // Day: derive directly from live quotes
    if (period === 'day') {
      const quotes = await marketDataService.getCachedQuotes(EGX_TICKERS);
      const rows = Array.from(quotes.entries())
        .filter(([, q]) => q.price > 0 && Number.isFinite(q.changePercent))
        .map(([ticker, q]) => ({ ticker, changePercent: q.changePercent, price: q.price }))
        .sort((a, b) => b.changePercent - a.changePercent);
      return { gainers: rows.slice(0, limit), losers: [...rows].reverse().slice(0, limit) };
    }

    // Try Redis cache first
    const cached = await getCache<{ gainers: unknown[]; losers: unknown[] }>(cacheKey);
    if (cached) return cached;

    // Compute from history — batch 25 at a time to avoid overwhelming Yahoo Finance
    const rangeMap = { week: '5d', month: '1mo', year: '1y' } as const;
    const range = rangeMap[period];
    const BATCH = 25;
    const results: Array<{ ticker: string; changePercent: number; price: number }> = [];

    for (let i = 0; i < EGX_TICKERS.length; i += BATCH) {
      const batch = EGX_TICKERS.slice(i, i + BATCH);
      const settled = await Promise.allSettled(
        batch.map(async (ticker) => {
          const h = await getStockHistory(ticker, range);
          if (h.length < 2) return null;
          const first = h[0].close;
          const last = h[h.length - 1].close;
          if (!first || !last) return null;
          const changePercent = ((last - first) / first) * 100;
          return { ticker, changePercent, price: last };
        }),
      );
      for (const r of settled) {
        if (r.status === 'fulfilled' && r.value) results.push(r.value);
      }
    }

    results.sort((a, b) => b.changePercent - a.changePercent);
    const data = { gainers: results.slice(0, limit), losers: [...results].reverse().slice(0, limit) };
    await setCache(cacheKey, data, ttlMap[period]);
    return data;
  },
};
