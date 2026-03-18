import { generateQuickAnalysis } from '../../lib/quickAnalysis.ts';
import { getPriceForAnalysis, getStockHistory, getFinancials } from './analysis.helpers.ts';

export async function quickAnalysis(ticker: string) {
  const [priceResult, historyResult, financialsResult] = await Promise.allSettled([
    getPriceForAnalysis(ticker),
    getStockHistory(ticker, '3mo').catch(() => []),
    getFinancials(ticker),
  ]);

  const price = priceResult.status === 'fulfilled' ? priceResult.value : null;
  const history = historyResult.status === 'fulfilled' ? historyResult.value : [];
  const financials = financialsResult.status === 'fulfilled' ? financialsResult.value : null;

  return generateQuickAnalysis(ticker, price, history, financials);
}
