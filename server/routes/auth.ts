import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';

const router = Router();

router.post('/verify-email/send', authenticate, AuthController.sendVerifyEmail);
router.post('/verify-email/confirm', authenticate, AuthController.confirmVerifyEmail);

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/2fa/authenticate', AuthController.twoFaAuthenticate);
router.post('/2fa/setup', AuthController.twoFaSetup);
router.post('/2fa/verify', AuthController.twoFaVerify);
router.post('/2fa/disable', AuthController.twoFaDisable);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.post('/logout-all', AuthController.logoutAll);
router.delete('/sessions/:tokenId', authenticate, AuthController.revokeSession);
router.post('/change-password', authenticate, AuthController.changePassword);
router.get('/me', AuthController.getMe);
router.get('/sessions', authenticate, AuthController.getSessions);
router.get('/google/url', AuthController.getGoogleUrl);
router.get('/google/callback', AuthController.googleCallback);

export default router;
