import { getStockHistory, getFinancials, searchEgxStocks } from '../lib/stockData.ts';
import { getStockNews } from '../lib/news.ts';
import { EGX_TICKERS } from '../lib/egxTickers.ts';
import { prisma } from '../lib/prisma.ts';
import type { GicsSector } from '@prisma/client';
import { getBulkQuotesForScreener } from './stockQuote.service.ts';

const GICS_VALUES: GicsSector[] = [
  'INFORMATION_TECHNOLOGY', 'HEALTH_CARE', 'FINANCIALS', 'CONSUMER_DISCRETIONARY',
  'CONSUMER_STAPLES', 'ENERGY', 'INDUSTRIALS', 'MATERIALS', 'UTILITIES',
  'REAL_ESTATE', 'COMMUNICATION_SERVICES',
];

function quoteToPriceRow(
  q: { ticker: string; price: number | null; change: number | null; changePercent: number | null; volume: number | null },
  sector: GicsSector | null
) {
  return {
    ticker: q.ticker,
    price: q.price ?? 0,
    change: q.change ?? 0,
    changePercent: q.changePercent ?? 0,
    volume: q.volume ?? 0,
    sector,
    isDelayed: true,
    priceTime: new Date().toISOString().slice(11, 19),
  };
}

export const StocksService = {
  async getBulkPrices(_delayed: boolean, sector?: string) {
    let tickers = EGX_TICKERS;
    if (sector && GICS_VALUES.includes(sector as GicsSector)) {
      const stocks = await prisma.stock.findMany({
        where: { sector: sector as GicsSector },
        select: { ticker: true },
      });
      tickers = stocks.map((s) => s.ticker);
      if (tickers.length === 0) return [];
    }
    const quotes = await getBulkQuotesForScreener(tickers);
    const sectorMap = new Map<string, GicsSector>();
    const allStocks = await prisma.stock.findMany({ select: { ticker: true, sector: true } });
    allStocks.forEach((s) => { if (s.sector) sectorMap.set(s.ticker, s.sector); });
    return Array.from(quotes.entries()).map(([ticker, q]) => {
      const sec = sectorMap.get(ticker) ?? null;
      return quoteToPriceRow(
        { ticker, price: q.price, change: q.change, changePercent: q.changePercent, volume: q.volume },
        sec
      );
    });
  },

  search(q: string) {
    return searchEgxStocks(q);
  },

  async getPrice(ticker: string, _delayed: boolean) {
    const { getQuote } = await import('./stockQuote.service.ts');
    const quote = await getQuote(ticker);
    if (!quote || quote.price == null) return null;
    return {
      ticker: quote.ticker,
      price: quote.price,
      change: quote.change ?? 0,
      changePercent: quote.changePercent ?? 0,
      volume: quote.volume ?? 0,
      high: quote.high ?? undefined,
      low: quote.low ?? undefined,
      open: quote.open ?? undefined,
      previousClose: quote.previousClose ?? undefined,
      name: quote.symbol ?? quote.ticker,
      isDelayed: true,
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
