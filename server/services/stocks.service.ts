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

export const StocksService = {
  async getBulkPrices(delayed: boolean) {
    const prices = delayed ? await getBulkPricesDelayed(EGX_TICKERS) : await getBulkPrices(EGX_TICKERS);
    if (!delayed && Array.isArray(prices)) {
      prices.forEach((p: Record<string, unknown>) => {
        p.isDelayed = false;
        p.priceTime = new Date().toISOString().slice(11, 19);
      });
    }
    return prices;
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
