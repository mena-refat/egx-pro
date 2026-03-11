import { getStockHistory, getFinancials, searchEgxStocks } from '../lib/yahoo.ts';
import { getStockNews } from '../lib/news.ts';
import { EGX_TICKERS } from '../lib/egxTickers.ts';
import { prisma } from '../lib/prisma.ts';
import type { GicsSector } from '@prisma/client';
import { marketDataService } from './market-data/market-data.service.ts';

const GICS_VALUES: GicsSector[] = [
  'INFORMATION_TECHNOLOGY', 'HEALTH_CARE', 'FINANCIALS', 'CONSUMER_DISCRETIONARY',
  'CONSUMER_STAPLES', 'ENERGY', 'INDUSTRIALS', 'MATERIALS', 'UTILITIES',
  'REAL_ESTATE', 'COMMUNICATION_SERVICES',
];

function quoteToPriceRow(q: { symbol: string; price: number; change: number; changePercent: number; volume: number }, sector: GicsSector | null) {
  return {
    ticker: q.symbol,
    price: q.price,
    change: q.change,
    changePercent: q.changePercent,
    volume: q.volume,
    sector,
    isDelayed: false,
    priceTime: new Date().toISOString().slice(11, 19),
  };
}

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
    const quotes = await marketDataService.getQuotes(tickers);
    const sectorMap = new Map<string, GicsSector>();
    const allStocks = await prisma.stock.findMany({ select: { ticker: true, sector: true } });
    allStocks.forEach((s) => { if (s.sector) sectorMap.set(s.ticker, s.sector); });
    return Array.from(quotes.values()).map((q) => {
      const sec = sectorMap.get(q.symbol) ?? null;
      return quoteToPriceRow(q, sec);
    });
  },

  search(q: string) {
    return searchEgxStocks(q);
  },

  async getPrice(ticker: string, _delayed: boolean) {
    const quote = await marketDataService.getQuote(ticker);
    if (!quote) return null;
    return {
      ticker: quote.symbol,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      volume: quote.volume,
      high: quote.high,
      low: quote.low,
      open: quote.open,
      previousClose: quote.previousClose,
      name: quote.symbol,
      isDelayed: false,
      priceTime: new Date().toISOString().slice(11, 19),
    };
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
