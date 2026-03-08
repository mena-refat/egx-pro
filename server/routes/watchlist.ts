import { Router, Request } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate } from '../middleware/auth.middleware.ts';
import { WatchlistController } from '../controllers/watchlist.controller.ts';
import type { AuthRequest } from './types.ts';
import { ONE_MINUTE_MS } from '../lib/constants.ts';

const router = Router();

const WATCHLIST_CREATE_MAX_PER_MIN = 20;
const watchlistAddLimiter = rateLimit({
  windowMs: ONE_MINUTE_MS,
  max: WATCHLIST_CREATE_MAX_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as AuthRequest).userId ?? (req as Request).ip ?? 'anon',
  handler: (_req, res) => res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' }),
});

router.get('/', authenticate, WatchlistController.list);
router.post('/', authenticate, watchlistAddLimiter, WatchlistController.add);
router.patch('/:ticker', authenticate, WatchlistController.update);
router.post('/check-targets', authenticate, WatchlistController.checkTargets);
router.delete('/:ticker', authenticate, WatchlistController.remove);

export default router;
