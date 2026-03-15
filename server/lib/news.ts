import { EGX_STOCKS } from '../../src/lib/egxStocks.ts';
import { NewsService } from '../services/news.service.ts';

export async function getStockNews(companyNameOrTicker: string) {
  const normalized = companyNameOrTicker.trim().toUpperCase();
  const stock = EGX_STOCKS.find(
    (item) =>
      item.ticker.toUpperCase() === normalized ||
      item.nameAr === companyNameOrTicker ||
      item.nameEn.toUpperCase() === normalized
  );
  const ticker = stock?.ticker ?? normalized;
  const companyName = stock?.nameAr ?? stock?.nameEn ?? companyNameOrTicker;
  return NewsService.getForAnalysis(ticker, companyName);
}
