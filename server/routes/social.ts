import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.ts';
import { SocialController } from '../controllers/social.controller.ts';

const router = Router();

router.post('/follow/:username', authenticate, SocialController.follow);
router.delete('/unfollow/:username', authenticate, SocialController.unfollow);

router.get('/followers', authenticate, SocialController.followers);
router.get('/following', authenticate, SocialController.following);

router.get('/requests', authenticate, SocialController.requests);
router.post('/requests/:followerId/accept', authenticate, SocialController.acceptRequest);
router.post('/requests/:followerId/decline', authenticate, SocialController.declineRequest);

router.get('/profile/:username/followers', authenticate, SocialController.profileFollowers);
router.get('/profile/:username/following', authenticate, SocialController.profileFollowing);
router.get('/profile/:username', optionalAuth, SocialController.profile);

router.patch('/settings', authenticate, SocialController.settings);

router.get('/search', authenticate, SocialController.search);

export default router;

