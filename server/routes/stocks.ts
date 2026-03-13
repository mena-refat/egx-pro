import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.ts';
import { MarketController } from '../controllers/market.controller.ts';
import { StocksController } from '../controllers/stocks.controller.ts';

const router = Router();

router.get('/', StocksController.root);
router.get('/market/status', MarketController.getStatus);
router.get('/market-status', StocksController.getMarketStatus);
router.get('/market/overview', optionalAuth, MarketController.getOverview);
router.get('/prices', optionalAuth, StocksController.getPrices);
router.get('/search', StocksController.search);
router.get('/quote/:ticker', authenticate, StocksController.getQuote);
router.post('/quotes', authenticate, StocksController.postQuotes);
router.get('/:ticker/price', optionalAuth, StocksController.getPrice);
router.get('/:ticker/history', StocksController.getHistory);
router.get('/:ticker/financials', StocksController.getFinancials);
router.get('/:ticker/news', StocksController.getNews);
router.get('/:ticker/order-depth', StocksController.orderDepth);
router.get('/:ticker/investor-categories', StocksController.investorCategories);
router.get('/:ticker/trading-stats', StocksController.tradingStats);

export default router;
