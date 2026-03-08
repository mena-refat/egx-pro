import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.ts';
import { UserController } from '../controllers/user.controller.ts';

const router = Router();

router.get('/profile', authenticate, UserController.getProfile);
router.put('/profile', authenticate, UserController.updateProfile);
router.get('/username/check', authenticate, UserController.checkUsername);
router.get('/profile/stats', authenticate, UserController.getProfileStats);
router.get('/unseen-achievements', authenticate, UserController.getUnseenAchievements);
router.post('/mark-achievements-seen', authenticate, UserController.markAchievementsSeen);
router.get('/achievements', authenticate, UserController.getAchievements);
router.get('/referral', authenticate, UserController.getReferral);
router.post('/referral/redeem', authenticate, UserController.redeemReferral);
router.post('/referral/use', authenticate, UserController.applyReferralCode);
router.get('/security', authenticate, UserController.getSecurity);
router.get('/sessions', authenticate, UserController.getSessions);
router.delete('/sessions/:id', authenticate, UserController.revokeSession);
router.post('/sessions/revoke-all-other', authenticate, UserController.revokeAllOtherSessions);
router.post('/avatar', authenticate, UserController.uploadAvatar);
router.delete('/account', authenticate, UserController.deleteAccount);

export default router;
