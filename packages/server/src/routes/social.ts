import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.ts';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware.ts';
import { SocialController } from '../controllers/social.controller.ts';
import { incrWithExpire } from '../lib/redis.ts';
import type { AuthRequest } from './types.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { updateSocialSettingsBodySchema, usernameSearchQuerySchema } from '../schemas/social.schema.ts';
import { usernameParamSchema, followerIdParamSchema } from '../schemas/params.ts';

const router = Router();

const USERNAME_SEARCH_WINDOW_S = 60;
const USERNAME_SEARCH_RATE = 30;

/** Rate limit: 30 req/min per user for username-search (Redis; in-memory fallback). */
const usernameSearchMemory = new Map<string, { count: number; resetAt: number }>();

function pruneSearchMemory() {
  const now = Date.now();
  for (const [key, entry] of usernameSearchMemory) {
    if (now >= entry.resetAt) usernameSearchMemory.delete(key);
  }
}

const usernameSearchRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as AuthRequest).user?.id ?? (req as AuthRequest).userId;
  if (!userId) return next();
  const window = Math.floor(Date.now() / 1000 / USERNAME_SEARCH_WINDOW_S);
  const redisKey = `rl:username-search:${userId}:${window}`;
  const expireAt = (window + 1) * USERNAME_SEARCH_WINDOW_S;
  const count = await incrWithExpire(redisKey, expireAt);
  let effectiveCount = count;
  if (count <= 0) {
    pruneSearchMemory();
    const now = Date.now();
    const windowStart = Math.floor(now / (USERNAME_SEARCH_WINDOW_S * 1000)) * (USERNAME_SEARCH_WINDOW_S * 1000);
    const memKey = `${userId}:${windowStart}`;
    let entry = usernameSearchMemory.get(memKey);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: windowStart + USERNAME_SEARCH_WINDOW_S * 1000 };
      usernameSearchMemory.set(memKey, entry);
    }
    entry.count += 1;
    effectiveCount = entry.count;
  }
  if (effectiveCount > USERNAME_SEARCH_RATE) {
    res.set('Retry-After', String(USERNAME_SEARCH_WINDOW_S));
    res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' });
    return;
  }
  next();
};

router.post('/follow/:username', authenticate, idempotencyMiddleware, validate(usernameParamSchema, 'params'), SocialController.follow);
router.delete('/unfollow/:username', authenticate, idempotencyMiddleware, validate(usernameParamSchema, 'params'), SocialController.unfollow);

router.get('/followers', authenticate, SocialController.followers);
router.get('/following', authenticate, SocialController.following);

router.get('/requests', authenticate, SocialController.requests);
router.post('/requests/:followerId/accept', authenticate, idempotencyMiddleware, validate(followerIdParamSchema, 'params'), SocialController.acceptRequest);
router.post('/requests/:followerId/decline', authenticate, idempotencyMiddleware, validate(followerIdParamSchema, 'params'), SocialController.declineRequest);

router.get('/profile/:username/followers', authenticate, validate(usernameParamSchema, 'params'), SocialController.profileFollowers);
router.get('/profile/:username/following', authenticate, validate(usernameParamSchema, 'params'), SocialController.profileFollowing);
router.get('/profile/:username', optionalAuth, validate(usernameParamSchema, 'params'), SocialController.profile);

router.patch('/settings', authenticate, idempotencyMiddleware, validate(updateSocialSettingsBodySchema, 'body'), SocialController.settings);

router.get('/search', authenticate, SocialController.search);
router.get('/username-search', authenticate, usernameSearchRateLimit, validate(usernameSearchQuerySchema, 'query'), SocialController.usernameSearch);

export default router;
