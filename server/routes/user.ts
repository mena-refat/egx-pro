import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.ts';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware.ts';
import { UserController } from '../controllers/user.controller.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { updateProfileBodySchema } from '../schemas/user.schema.ts';
import { idParamSchema } from '../schemas/params.ts';

const router = Router();

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
router.post('/avatar', authenticate, idempotencyMiddleware, UserController.uploadAvatar);
router.delete('/account', authenticate, idempotencyMiddleware, UserController.deleteAccount);

export default router;
