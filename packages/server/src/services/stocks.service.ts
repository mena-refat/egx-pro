import { getStockHistory, getFinancials, searchEgxStocks } from '../lib/stockData.ts';
import { EGX_STOCKS } from '../lib/egxStocks.ts';
import { EGX_TICKERS } from '../lib/egxTickers.ts';
import { StockRepository } from '../repositories/stock.repository.ts';
import type { GicsSector } from '@prisma/client';
import { marketDataService } from './market-data/market-data.service.ts';
import { NewsService } from './news.service.ts';
import { getCache, setCache } from '../lib/redis.ts';
import { isInEGX30, isInEGX70, isInEGX100, isInEGX35LV, isInEGX33 } from '../lib/egxIndices.ts';

const GICS_VALUES: GicsSector[] = [
  'INFORMATION_TECHNOLOGY', 'HEALTH_CARE', 'FINANCIALS', 'CONSUMER_DISCRETIONARY',
  'CONSUMER_STAPLES', 'ENERGY', 'INDUSTRIALS', 'MATERIALS', 'UTILITIES',
  'REAL_ESTATE', 'COMMUNICATION_SERVICES',
];

const BULK_PRICES_TTL_MS = 2_500;
const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

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
export type FilterId = 'all' | 'egx30' | 'egx70' | 'egx100' | 'egx35lv' | 'egx33' | 'topGainers' | 'topLosers';
export type SortId = 'ticker' | 'price' | 'change' | 'volume';

export interface BulkPricesResult {
  stocks: PriceRow[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

// Cache always stores the full unfiltered list — filtering/sorting/pagination is in-memory
const bulkPricesCache = new Map<string, { expiresAt: number; value: PriceRow[] }>();
const bulkPricesInFlight = new Map<string, Promise<PriceRow[]>>();

// Pre-build name lookup from EGX_STOCKS for fast search
const egxNameMap = new Map<string, { nameAr: string; nameEn: string }>();
EGX_STOCKS.forEach((s) => egxNameMap.set(s.ticker, s));

export const StocksService = {
  async getBulkPrices(
    _delayed: boolean,
    options: {
      q?: string;
      filter?: string;
      sector?: string;
      sort?: string;
      order?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<BulkPricesResult> {
    // Step 1: Get full unfiltered list from cache (always key = delayed:all / realtime:all)
    const cacheKey = `${_delayed ? 'delayed' : 'realtime'}:all`;
    const now = Date.now();

    let allRows: PriceRow[] = [];
    const hit = bulkPricesCache.get(cacheKey);
    if (hit && hit.expiresAt > now) {
      allRows = hit.value;
    } else {
      const inflight = bulkPricesInFlight.get(cacheKey);
      if (inflight) {
        allRows = await inflight;
      } else {
        const buildPromise = (async () => {
          const [cached, allStocks] = await Promise.all([
            marketDataService.getCachedQuotes(EGX_TICKERS),
            StockRepository.findAllWithSector(),
          ]);
          // Only serve from cache — never fire live API calls from the HTTP endpoint.
          // The polling loop (startPolling) is the sole writer to the cache.
          // Firing live calls here too causes concurrent Yahoo Finance requests → 429.
          const quotes = cached;

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
          allRows = await buildPromise;
          // Don't cache empty results — let the next request retry once polling warms up
          if (allRows.length > 0) {
            bulkPricesCache.set(cacheKey, { value: allRows, expiresAt: now + BULK_PRICES_TTL_MS });
          }
        } finally {
          bulkPricesInFlight.delete(cacheKey);
        }
      }
    }

    // Step 2: Apply filtering, sorting, pagination in memory
    const {
      q,
      filter = 'all',
      sector,
      sort = 'ticker',
      order = 'asc',
      page: rawPage = 1,
      limit: rawLimit = PAGE_SIZE_DEFAULT,
    } = options;

    const limit = Math.min(PAGE_SIZE_MAX, Math.max(1, Number(rawLimit) || PAGE_SIZE_DEFAULT));

    let rows = allRows;

    // Text search (ticker or stock name)
    if (q?.trim()) {
      const qLower = q.trim().toLowerCase();
      const qUpper = q.trim().toUpperCase();
      rows = rows.filter((r) => {
        const info = egxNameMap.get(r.ticker);
        return (
          r.ticker.includes(qUpper) ||
          info?.nameAr.toLowerCase().includes(qLower) ||
          info?.nameEn.toLowerCase().includes(qLower)
        );
      });
    }

    // GICS sector filter
    if (sector && GICS_VALUES.includes(sector as GicsSector)) {
      rows = rows.filter((r) => r.sector === sector);
    }

    // Index / special filter
    if (filter === 'egx30')       rows = rows.filter((r) => isInEGX30(r.ticker));
    else if (filter === 'egx70')  rows = rows.filter((r) => isInEGX70(r.ticker));
    else if (filter === 'egx100') rows = rows.filter((r) => isInEGX100(r.ticker));
    else if (filter === 'egx35lv') rows = rows.filter((r) => isInEGX35LV(r.ticker));
    else if (filter === 'egx33')  rows = rows.filter((r) => isInEGX33(r.ticker));
    else if (filter === 'topGainers') {
      rows = [...rows].sort((a, b) => b.changePercent - a.changePercent).slice(0, 50);
    } else if (filter === 'topLosers') {
      rows = [...rows].sort((a, b) => a.changePercent - b.changePercent).slice(0, 50);
    }

    // Sort (skip for topGainers/topLosers — already sorted above)
    if (filter !== 'topGainers' && filter !== 'topLosers') {
      const dir = order === 'desc' ? -1 : 1;
      rows = [...rows].sort((a, b) => {
        switch (sort) {
          case 'price':  return dir * (a.price - b.price);
          case 'change': return dir * (a.changePercent - b.changePercent);
          case 'volume': return dir * (a.volume - b.volume);
          default:       return dir * a.ticker.localeCompare(b.ticker);
        }
      });
    }

    // Paginate
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const page  = Math.min(Math.max(1, Number(rawPage) || 1), pages);
    const stocks = rows.slice((page - 1) * limit, page * limit);

    return { stocks, total, page, pages, limit };
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
