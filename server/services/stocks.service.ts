import {
  getBulkPrices,
  getBulkPricesDelayed,
  getStockPrice,
  getStockPriceDelayed,
  getStockHistory,
  getFinancials,
  searchEgxStocks,
} from '../lib/yahoo.ts';
import { getStockNews } from '../lib/news.ts';
import { EGX_TICKERS } from '../lib/egxTickers.ts';
import { prisma } from '../lib/prisma.ts';
import type { GicsSector } from '@prisma/client';

const GICS_VALUES: GicsSector[] = [
  'INFORMATION_TECHNOLOGY', 'HEALTH_CARE', 'FINANCIALS', 'CONSUMER_DISCRETIONARY',
  'CONSUMER_STAPLES', 'ENERGY', 'INDUSTRIALS', 'MATERIALS', 'UTILITIES',
  'REAL_ESTATE', 'COMMUNICATION_SERVICES',
];

export const StocksService = {
  async getBulkPrices(delayed: boolean, sector?: string) {
    let tickers = EGX_TICKERS;
    if (sector && GICS_VALUES.includes(sector as GicsSector)) {
      const stocks = await prisma.stock.findMany({
        where: { sector: sector as GicsSector },
        select: { ticker: true },
      });
      tickers = stocks.map((s) => s.ticker);
      if (tickers.length === 0) return [];
    }
    const prices = delayed ? await getBulkPricesDelayed(tickers) : await getBulkPrices(tickers);
    if (!delayed && Array.isArray(prices)) {
      prices.forEach((p: Record<string, unknown>) => {
        p.isDelayed = false;
        p.priceTime = new Date().toISOString().slice(11, 19);
      });
    }
    const sectorMap = new Map<string, GicsSector>();
    const allStocks = await prisma.stock.findMany({ select: { ticker: true, sector: true } });
    allStocks.forEach((s) => { if (s.sector) sectorMap.set(s.ticker, s.sector); });
    return (prices as Record<string, unknown>[]).map((p) => {
      const ticker = String(p.ticker ?? '');
      const sec = sectorMap.get(ticker);
      return { ...p, sector: sec ?? null };
    });
  },

  search(q: string) {
    return searchEgxStocks(q);
  },

  async getPrice(ticker: string, delayed: boolean) {
    const price = delayed ? await getStockPriceDelayed(ticker) : await getStockPrice(ticker);
    if (!price) return null;
    if (!delayed && !('isDelayed' in price)) {
      (price as Record<string, unknown>).isDelayed = false;
      (price as Record<string, unknown>).priceTime = new Date().toISOString().slice(11, 19);
    }
    return price;
  },

  getHistory(ticker: string, range?: string) {
    return getStockHistory(ticker, range);
  },

  getFinancials(ticker: string) {
    return getFinancials(ticker);
  },

  getNews(ticker: string) {
    return getStockNews(ticker);
  },
};
