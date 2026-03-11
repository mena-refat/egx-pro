import { Router } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import type { AuthRequest } from './types.ts';
import { ONE_HOUR_MS } from '../lib/constants.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { AnalysisController } from '../controllers/analysis.controller.ts';

const router = Router();

const analysisLimiter = rateLimit({
  windowMs: ONE_HOUR_MS,
  max: 20,
  message: { error: 'RATE_LIMIT_EXCEEDED' },
  keyGenerator: (req, res) => {
    const userId = (req as AuthRequest).user?.id;
    if (userId) return userId;
    return ipKeyGenerator(req.ip ?? 'unknown');
  },
  validate: {
    xForwardedForHeader: false,
    trustProxy: false,
    ip: false,
  },
});

router.post('/:ticker', authenticate, analysisLimiter, AnalysisController.create);

export default router;
