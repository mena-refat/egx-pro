import { z } from 'zod';
import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { tickerParamSchema } from '../schemas/params.ts';
import { MarketController } from '../controllers/market.controller.ts';
import { StocksController } from '../controllers/stocks.controller.ts';

const searchQuerySchema = z.object({ q: z.string().min(1).max(50) });
const router = Router();

router.get('/', StocksController.root);
router.get('/market/status', MarketController.getStatus);
router.get('/market-status', StocksController.getMarketStatus);
router.get('/market/overview', optionalAuth, MarketController.getOverview);
router.get('/prices', optionalAuth, StocksController.getPrices);
router.get('/search', validate(searchQuerySchema, 'query'), StocksController.search);
router.get('/quote/:ticker', authenticate, validate(tickerParamSchema, 'params'), StocksController.getQuote);
router.post('/quotes', authenticate, StocksController.postQuotes);
router.get('/:ticker/price', optionalAuth, validate(tickerParamSchema, 'params'), StocksController.getPrice);
router.get('/:ticker/history', validate(tickerParamSchema, 'params'), StocksController.getHistory);
router.get('/:ticker/financials', validate(tickerParamSchema, 'params'), StocksController.getFinancials);
router.get('/:ticker/news', validate(tickerParamSchema, 'params'), StocksController.getNews);
router.get('/:ticker/order-depth', validate(tickerParamSchema, 'params'), StocksController.orderDepth);
router.get('/:ticker/investor-categories', validate(tickerParamSchema, 'params'), StocksController.investorCategories);
router.get('/:ticker/trading-stats', validate(tickerParamSchema, 'params'), StocksController.tradingStats);

export default router;
