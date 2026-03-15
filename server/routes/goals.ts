import { Router, Request } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { authenticate } from '../middleware/auth.middleware.ts';
import { GoalsController } from '../controllers/goals.controller.ts';
import type { AuthRequest } from './types.ts';
import { ONE_MINUTE_MS } from '../lib/constants.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware.ts';
import { createGoalBodySchema, updateGoalBodySchema, updateGoalAmountBodySchema } from '../schemas/goals.schema.ts';
import { idParamSchema } from '../schemas/params.ts';

const router = Router();

const GOALS_CREATE_MAX_PER_MIN = 20;
const goalsCreateLimiter = rateLimit({
  windowMs: ONE_MINUTE_MS,
  max: GOALS_CREATE_MAX_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as AuthRequest).userId;
    if (userId) return userId;
    return ipKeyGenerator(req.ip ?? 'unknown');
  },
  handler: (_req, res) => res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' }),
});

router.get('/', authenticate, GoalsController.getAll);
router.post('/', authenticate, goalsCreateLimiter, idempotencyMiddleware, validate(createGoalBodySchema, 'body'), GoalsController.create);
router.put('/:id', authenticate, idempotencyMiddleware, validate(idParamSchema, 'params'), validate(updateGoalBodySchema, 'body'), GoalsController.update);
router.patch('/:id/amount', authenticate, idempotencyMiddleware, validate(idParamSchema, 'params'), validate(updateGoalAmountBodySchema, 'body'), GoalsController.updateAmount);
router.patch('/:id/complete', authenticate, idempotencyMiddleware, validate(idParamSchema, 'params'), GoalsController.complete);
router.delete('/:id', authenticate, idempotencyMiddleware, validate(idParamSchema, 'params'), GoalsController.delete);

export default router;
