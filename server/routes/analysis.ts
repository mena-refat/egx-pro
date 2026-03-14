import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { AuthRequest } from './types.ts';
import { ONE_HOUR_MS } from '../lib/constants.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { AnalysisController } from '../controllers/analysis.controller.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { compareStocksBodySchema, recommendationsBodySchema } from '../schemas/analysis.schema.ts';
import { tickerParamSchema } from '../schemas/params.ts';

const router = Router();

const analysisLimiter = rateLimit({
  windowMs: ONE_HOUR_MS,
  max: 20,
  message: { error: 'RATE_LIMIT_EXCEEDED' },
  keyGenerator: (req, res) => {
    const userId = (req as AuthRequest).user?.id;
    if (userId) return userId;
    return (req.ip ?? 'unknown').replace(/^::ffff:/, '');
  },
  validate: {
    xForwardedForHeader: false,
    trustProxy: false,
    ip: false,
  },
});

router.post('/compare', authenticate, analysisLimiter, validate(compareStocksBodySchema, 'body'), AnalysisController.compare);
router.post('/recommendations', authenticate, analysisLimiter, validate(recommendationsBodySchema, 'body'), AnalysisController.recommendations);
router.post('/:ticker', authenticate, analysisLimiter, validate(tickerParamSchema, 'params'), AnalysisController.create);

export default router;
