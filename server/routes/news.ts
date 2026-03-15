import { Router } from 'express';
import { NewsController, newsErrorHandler } from '../controllers/news.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { analyzeNewsBodySchema } from '../schemas/news.schema.ts';

const router = Router();

router.post('/analyze', authenticate, idempotencyMiddleware, validate(analyzeNewsBodySchema, 'body'), NewsController.analyze);
router.get('/market', NewsController.getMarket);
router.get('/:ticker', NewsController.getByTicker);

router.use(newsErrorHandler);

export default router;
