import { getStockHistory, getFinancials, searchEgxStocks } from '../lib/stockData.ts';
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

function quoteToPriceRow(
  q: { ticker: string; price: number; change: number; changePercent: number; volume: number },
  sector: GicsSector | null
) {
  return {
    ticker: q.ticker,
    price: q.price,
    change: q.change,
    changePercent: q.changePercent,
    volume: q.volume,
    sector,
    isDelayed: !marketDataService.isMarketOpen(),
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

    const [cached, allStocks] = await Promise.all([
      marketDataService.getCachedQuotes(tickers),
      prisma.stock.findMany({ select: { ticker: true, sector: true } }),
    ]);

    // If cache is warm, serve instantly. If completely cold (server just started),
    // fall back to a live fetch so the first page load always has data.
    const quotes = cached.size > 0 ? cached : await marketDataService.getQuotes(tickers);

    const sectorMap = new Map<string, GicsSector>();
    allStocks.forEach((s) => { if (s.sector) sectorMap.set(s.ticker, s.sector); });

    const rows = [];
    for (const [ticker, q] of quotes.entries()) {
      if (q.price > 0) {
        rows.push(quoteToPriceRow(
          { ticker, price: q.price, change: q.change, changePercent: q.changePercent, volume: q.volume },
          sectorMap.get(ticker) ?? null
        ));
      }
    }
    return rows;
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
