import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { validate } from '../middleware/validate.middleware.ts';
import {
  registerBodySchema,
  loginBodySchema,
  verifyEmailConfirmBodySchema,
  changePasswordBodySchema,
  twoFaVerifyBodySchema,
  twoFaSetupBodySchema,
  twoFaAuthenticateBodySchema,
} from '../schemas/auth.schema.ts';
import { tokenIdParamSchema } from '../schemas/params.ts';

const router = Router();

router.post('/verify-email/send', authenticate, AuthController.sendVerifyEmail);
router.post('/verify-email/confirm', authenticate, validate(verifyEmailConfirmBodySchema, 'body'), AuthController.confirmVerifyEmail);

router.post('/register', validate(registerBodySchema, 'body'), AuthController.register);
router.post('/login', validate(loginBodySchema, 'body'), AuthController.login);
router.post('/2fa/authenticate', validate(twoFaAuthenticateBodySchema, 'body'), AuthController.twoFaAuthenticate);
router.post('/2fa/setup', authenticate, validate(twoFaSetupBodySchema, 'body'), AuthController.twoFaSetup);
router.post('/2fa/verify', authenticate, validate(twoFaVerifyBodySchema, 'body'), AuthController.twoFaVerify);
router.post('/2fa/disable', authenticate, AuthController.twoFaDisable);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.post('/logout-all', AuthController.logoutAll);
router.delete('/sessions/:tokenId', authenticate, validate(tokenIdParamSchema, 'params'), AuthController.revokeSession);
router.post('/change-password', authenticate, validate(changePasswordBodySchema, 'body'), AuthController.changePassword);
router.get('/me', AuthController.getMe);
router.get('/sessions', authenticate, AuthController.getSessions);
router.get('/google/url', AuthController.getGoogleUrl);
router.get('/google/callback', AuthController.googleCallback);

export default router;
