import { Router, Request } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { authenticate } from '../middleware/auth.middleware.ts';
import { PredictionsController } from '../controllers/predictions.controller.ts';
import type { AuthRequest } from './types.ts';
import { ONE_MINUTE_MS } from '../lib/constants.ts';
import { PREDICTION_LIMITS } from '../lib/constants.ts';

const router = Router();

const createLimiter = rateLimit({
  windowMs: ONE_MINUTE_MS,
  max: PREDICTION_LIMITS.createRatePerMin,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const uid = (req as AuthRequest).userId;
    if (uid) return uid;
    return ipKeyGenerator(req.ip ?? 'unknown');
  },
  handler: (_req, res) => {
    res.set('Retry-After', '60');
    res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' });
  },
});

router.post('/', authenticate, createLimiter, PredictionsController.create);
router.delete('/:id', authenticate, PredictionsController.delete);

router.get('/feed', authenticate, PredictionsController.getFeed);
router.get('/my', authenticate, PredictionsController.getMy);
router.get('/leaderboard', authenticate, PredictionsController.getLeaderboard);
router.get('/limits', authenticate, PredictionsController.getLimits);
router.get('/stats/:username', authenticate, PredictionsController.getStats);
router.get('/stock/:ticker', authenticate, PredictionsController.getByTicker);

router.post('/:id/like', authenticate, PredictionsController.like);

export default router;
