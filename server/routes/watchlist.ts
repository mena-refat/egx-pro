import { Router, Request } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { authenticate } from '../middleware/auth.middleware.ts';
import { WatchlistController } from '../controllers/watchlist.controller.ts';
import type { AuthRequest } from './types.ts';
import { ONE_MINUTE_MS } from '../lib/constants.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { addWatchlistBodySchema, updateWatchlistBodySchema, checkTargetsBodySchema } from '../schemas/watchlist.schema.ts';
import { tickerParamSchema } from '../schemas/params.ts';

const router = Router();

const WATCHLIST_CREATE_MAX_PER_MIN = 20;
const watchlistAddLimiter = rateLimit({
  windowMs: ONE_MINUTE_MS,
  max: WATCHLIST_CREATE_MAX_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as AuthRequest).userId;
    if (userId) return userId;
    return ipKeyGenerator(req.ip ?? 'unknown');
  },
  handler: (_req, res) => res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' }),
});

router.get('/', authenticate, WatchlistController.list);
router.post('/', authenticate, watchlistAddLimiter, validate(addWatchlistBodySchema, 'body'), WatchlistController.add);
router.patch('/:ticker', authenticate, validate(tickerParamSchema, 'params'), validate(updateWatchlistBodySchema, 'body'), WatchlistController.update);
router.post('/check-targets', authenticate, validate(checkTargetsBodySchema, 'body'), WatchlistController.checkTargets);
router.delete('/:ticker', authenticate, validate(tickerParamSchema, 'params'), WatchlistController.remove);

export default router;
