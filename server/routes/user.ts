import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate } from '../middleware/auth.middleware.ts';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware.ts';
import { UserController } from '../controllers/user.controller.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { updateProfileBodySchema } from '../schemas/user.schema.ts';
import { idParamSchema } from '../schemas/params.ts';
import type { AuthRequest } from './types.ts';

const router = Router();

// 5 avatar uploads per user per hour — prevent storage exhaustion
const avatarLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `avatar:${(req as AuthRequest).user?.id ?? req.ip}`,
  handler: (_req, res) => res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' }),
});

router.get('/profile', authenticate, UserController.getProfile);
router.put('/profile', authenticate, idempotencyMiddleware, validate(updateProfileBodySchema, 'body'), UserController.updateProfile);
router.get('/username/check', authenticate, UserController.checkUsername);
router.get('/profile/stats', authenticate, UserController.getProfileStats);
router.get('/unseen-achievements', authenticate, UserController.getUnseenAchievements);
router.post('/mark-achievements-seen', authenticate, idempotencyMiddleware, UserController.markAchievementsSeen);
router.get('/achievements', authenticate, UserController.getAchievements);
router.get('/referral', authenticate, UserController.getReferral);
router.post('/referral/redeem', authenticate, idempotencyMiddleware, UserController.redeemReferral);
router.post('/referral/use', authenticate, idempotencyMiddleware, UserController.applyReferralCode);
router.get('/security', authenticate, UserController.getSecurity);
router.get('/sessions', authenticate, UserController.getSessions);
router.delete('/sessions/:id', authenticate, idempotencyMiddleware, validate(idParamSchema, 'params'), UserController.revokeSession);
router.post('/sessions/revoke-all-other', authenticate, idempotencyMiddleware, UserController.revokeAllOtherSessions);
router.post('/avatar', authenticate, avatarLimiter, idempotencyMiddleware, UserController.uploadAvatar);
router.delete('/account', authenticate, idempotencyMiddleware, UserController.deleteAccount);

export default router;
