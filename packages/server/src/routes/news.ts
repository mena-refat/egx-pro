import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { NewsController, newsErrorHandler } from '../controllers/news.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { analyzeNewsBodySchema } from '../schemas/news.schema.ts';
import type { AuthRequest } from './types.ts';

const router = Router();

// 5 طلبات تحليل AI كل دقيقة لكل مستخدم — Claude API مكلف
const newsAnalyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `user:${(req as AuthRequest).user!.id}`,
  validate: { keyGeneratorIpFallback: false },
  handler: (_req, res) => res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' }),
});

router.post('/analyze', authenticate, newsAnalyzeLimiter, idempotencyMiddleware, validate(analyzeNewsBodySchema, 'body'), NewsController.analyze);
router.get('/market', NewsController.getMarket);
router.get('/interests', authenticate, NewsController.getInterests);
router.get('/:ticker', NewsController.getByTicker);

router.use(newsErrorHandler);

export default router;
