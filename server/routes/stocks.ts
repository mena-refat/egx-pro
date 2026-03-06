import { Router, Request } from 'express';
import { getBulkPrices, getBulkPricesDelayed, getStockPrice, getStockPriceDelayed, getStockHistory, getFinancials, searchEgxStocks } from '../lib/yahoo.ts';
import { getStockNews } from '../lib/news.ts';
import { getMarketOverview } from '../lib/macro.ts';
import { EGX_TICKERS } from '../lib/egxTickers.ts';
import { getMarketStatus, getGoldMarketStatus } from '../lib/marketHours.ts';
import { prisma } from '../lib/prisma.ts';
import { isPro } from '../lib/plan.ts';

const router = Router();

async function useDelayedPrices(req: Request): Promise<boolean> {
  const userId = (req as Request & { user?: { id?: string } }).user?.id;
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, subscriptionPlan: true, referralProExpiresAt: true },
  });
  return user ? !isPro(user) : false;
}

router.get('/', (req, res) => {
  res.json({ message: 'Stocks API root. Use /prices, /market/overview, etc.' });
});

router.get('/market/status', (_req, res) => {
  try {
    const egx = getMarketStatus();
    const gold = getGoldMarketStatus();
    res.json({ egx, gold });
  } catch {
    res.status(500).json({ error: 'Failed to get market status' });
  }
});

router.get('/prices', async (req, res) => {
  try {
    const delayed = await useDelayedPrices(req);
    const prices = delayed ? await getBulkPricesDelayed(EGX_TICKERS) : await getBulkPrices(EGX_TICKERS);
    if (!delayed && Array.isArray(prices)) {
      prices.forEach((p: Record<string, unknown>) => {
        p.isDelayed = false;
        p.priceTime = new Date().toISOString().slice(11, 19);
      });
    }
    res.json(prices);
  } catch {
    res.status(500).json({ error: 'Failed to fetch bulk prices' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const results = await searchEgxStocks(q);
    res.json(results);
  } catch (error) {
    console.error('Error in /stocks/search:', error);
    res.status(500).json({ error: 'Failed to search stocks' });
  }
});

router.get('/market/overview', async (req, res) => {
  try {
    const overview = await getMarketOverview();
    const egxStatus = getMarketStatus();
    const goldStatus = getGoldMarketStatus();
    if (!overview) {
      const fallback = {
        usdEgp: { value: 0, change: 0, changePercent: 0 },
        egx30: { value: 0, change: 0, changePercent: 0 },
        egx30Capped: { value: 0, change: 0, changePercent: 0 },
        egx70: { value: 0, change: 0, changePercent: 0 },
        egx100: { value: 0, change: 0, changePercent: 0 },
        egx33: { value: 0, change: 0, changePercent: 0 },
        egx35: { value: 0, change: 0, changePercent: 0 },
        gold: { value: 0, change: 0, changePercent: 0, valueEgxPerGram: 0, buyEgxPerGram: 0, sellEgxPerGram: 0 },
        silver: { value: 0, change: 0, changePercent: 0, valueEgxPerGram: 0, buyEgxPerGram: 0, sellEgxPerGram: 0 },
        lastUpdated: Date.now(),
        egxStatus,
        goldMarketStatus: goldStatus,
      };
      return res.json(fallback);
    }
    const delayed = await useDelayedPrices(req);
    const payload = { ...overview, egxStatus, goldMarketStatus: goldStatus };
    if (delayed && goldStatus.isOpen) {
      payload.gold = { ...overview.gold, isDelayed: true } as typeof overview.gold & { isDelayed?: boolean };
      payload.silver = { ...overview.silver, isDelayed: true } as typeof overview.silver & { isDelayed?: boolean };
    }
    res.json(payload);
  } catch (error) {
    console.error('Stocks /market/overview error:', error);
    const fallback = {
      usdEgp: { value: 0, change: 0, changePercent: 0 },
      egx30: { value: 0, change: 0, changePercent: 0 },
      egx30Capped: { value: 0, change: 0, changePercent: 0 },
      egx70: { value: 0, change: 0, changePercent: 0 },
      egx100: { value: 0, change: 0, changePercent: 0 },
      egx33: { value: 0, change: 0, changePercent: 0 },
      egx35: { value: 0, change: 0, changePercent: 0 },
      gold: { value: 0, change: 0, changePercent: 0, valueEgxPerGram: 0, buyEgxPerGram: 0, sellEgxPerGram: 0 },
      silver: { value: 0, change: 0, changePercent: 0, valueEgxPerGram: 0, buyEgxPerGram: 0, sellEgxPerGram: 0 },
      lastUpdated: Date.now(),
      egxStatus: getMarketStatus(),
      goldMarketStatus: getGoldMarketStatus(),
    };
    res.json(fallback);
  }
});

router.get('/:ticker/price', async (req, res) => {
  try {
    const { ticker } = req.params;
    const delayed = await useDelayedPrices(req);
    const price = delayed ? await getStockPriceDelayed(ticker) : await getStockPrice(ticker);
    if (!price) return res.status(404).json({ error: 'Stock not found' });
    if (!delayed && !('isDelayed' in price)) {
      (price as Record<string, unknown>).isDelayed = false;
      (price as Record<string, unknown>).priceTime = new Date().toISOString().slice(11, 19);
    }
    res.json(price);
  } catch {
    res.status(500).json({ error: 'Failed to fetch stock price' });
  }
});

router.get('/:ticker/history', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { range } = req.query;
    const history = await getStockHistory(ticker, range as string);
    res.json(history);
  } catch {
    res.status(500).json({ error: 'Failed to fetch stock history' });
  }
});

router.get('/:ticker/financials', async (req, res) => {
  try {
    const { ticker } = req.params;
    const financials = await getFinancials(ticker);
    if (!financials) return res.status(404).json({ error: 'Financials not found' });
    res.json(financials);
  } catch {
    res.status(500).json({ error: 'Failed to fetch stock financials' });
  }
});

router.get('/:ticker/news', async (req, res) => {
  try {
    const { ticker } = req.params;
    const news = await getStockNews(ticker);
    res.json(news);
  } catch {
    res.status(500).json({ error: 'Failed to fetch stock news' });
  }
});

/** Order depth — not available from current API; placeholder */
router.get('/:ticker/order-depth', async (_req, res) => {
  res.json({ available: false, message: 'Order depth data not available' });
});

/** Investor categories (Egyptian market) — placeholder */
router.get('/:ticker/investor-categories', async (_req, res) => {
  res.json({ available: false, message: 'Investor categories not available' });
});

/** Trading stats (market-wide or per stock) — placeholder */
router.get('/:ticker/trading-stats', async (_req, res) => {
  res.json({ available: false, message: 'Trading stats not available' });
});

export default router;
