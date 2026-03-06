import { Router } from 'express';
import { getBulkPrices, getStockPrice, getStockHistory, getFinancials, searchEgxStocks } from '../lib/yahoo.ts';
import { getStockNews } from '../lib/news.ts';
import { getMarketOverview } from '../lib/macro.ts';
import { EGX_TICKERS } from '../lib/egxTickers.ts';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Stocks API root. Use /prices, /market/overview, etc.' });
});

router.get('/prices', async (req, res) => {
  try {
    const prices = await getBulkPrices(EGX_TICKERS);
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
    if (!overview) {
      // رجّع قيم افتراضية بدال ما ترجع 500 علشان الواجهة ما تبوظش
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
      };
      return res.json(fallback);
    }
    res.json(overview);
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
    };
    res.json(fallback);
  }
});

router.get('/:ticker/price', async (req, res) => {
  try {
    const { ticker } = req.params;
    const price = await getStockPrice(ticker);
    if (!price) return res.status(404).json({ error: 'Stock not found' });
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
