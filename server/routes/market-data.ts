import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { marketDataQuotesQuerySchema } from '../schemas/params.ts';
import { MarketDataController } from '../controllers/market-data.controller.ts';

const router = Router();

router.get(
  '/quotes',
  authenticate,
  validate(marketDataQuotesQuerySchema, 'query'),
  (req, res, next) => {
    void MarketDataController.quotes(req, res).catch(next);
  }
);
router.get('/health', authenticate, MarketDataController.health);

if (process.env.NODE_ENV !== 'production') {
  router.get('/debug/:symbol', (req, res, next) => {
    void MarketDataController.debug(req, res).catch(next);
  });
}

export default router;
