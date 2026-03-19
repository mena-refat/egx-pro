import { Router, Request } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { authenticate } from '../middleware/auth.middleware.ts';
import { PredictionsController } from '../controllers/predictions.controller.ts';
import type { AuthRequest } from './types.ts';
import { ONE_MINUTE_MS } from '../lib/constants.ts';
import { PREDICTION_LIMITS } from '../lib/constants.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware.ts';
import { createPredictionBodySchema, predictionsFeedQuerySchema, predictionsMyQuerySchema, leaderboardQuerySchema } from '../schemas/predictions.schema.ts';
import { idParamSchema, usernameParamSchema, tickerParamSchema } from '../schemas/params.ts';

const router = Router();

const createLimiter = rateLimit({
  windowMs: ONE_MINUTE_MS,
  max: PREDICTION_LIMITS.createRatePerMin,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const uid = (req as AuthRequest).userId;
    if (uid) return String(uid);
    return ipKeyGenerator(req.ip ?? 'unknown');
  },
  handler: (_req, res) => {
    res.set('Retry-After', '60');
    res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' });
  },
});

router.post('/', authenticate, createLimiter, idempotencyMiddleware, validate(createPredictionBodySchema, 'body'), PredictionsController.create);
router.delete('/:id', authenticate, idempotencyMiddleware, validate(idParamSchema, 'params'), PredictionsController.delete);

router.get('/feed', authenticate, validate(predictionsFeedQuerySchema, 'query'), PredictionsController.getFeed);
router.get('/my', authenticate, validate(predictionsMyQuerySchema, 'query'), PredictionsController.getMy);
router.get('/leaderboard', authenticate, validate(leaderboardQuerySchema, 'query'), PredictionsController.getLeaderboard);
router.get('/limits', authenticate, PredictionsController.getLimits);
router.get('/stats/:username', authenticate, validate(usernameParamSchema, 'params'), PredictionsController.getStats);
router.get('/stock/:ticker', authenticate, validate(tickerParamSchema, 'params'), PredictionsController.getByTicker);

router.post('/:id/like', authenticate, idempotencyMiddleware, validate(idParamSchema, 'params'), PredictionsController.like);

export default router;
