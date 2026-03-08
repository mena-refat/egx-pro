import { Router, Request } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate } from '../middleware/auth.middleware.ts';
import { GoalsController } from '../controllers/goals.controller.ts';
import type { AuthRequest } from './types.ts';
import { ONE_MINUTE_MS } from '../lib/constants.ts';

const router = Router();

const GOALS_CREATE_MAX_PER_MIN = 20;
const goalsCreateLimiter = rateLimit({
  windowMs: ONE_MINUTE_MS,
  max: GOALS_CREATE_MAX_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as AuthRequest).userId ?? (req as Request).ip ?? 'anon',
  handler: (_req, res) => res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' }),
});

router.get('/', authenticate, GoalsController.getAll);
router.post('/', authenticate, goalsCreateLimiter, GoalsController.create);
router.put('/:id', authenticate, GoalsController.update);
router.patch('/:id/amount', authenticate, GoalsController.updateAmount);
router.patch('/:id/complete', authenticate, GoalsController.complete);
router.delete('/:id', authenticate, GoalsController.delete);

export default router;
