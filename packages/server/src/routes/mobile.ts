import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.ts';
import { MobileController } from '../controllers/mobile.controller.ts';

const router = Router();

router.post('/push-token', authenticate, MobileController.registerPushToken);

export default router;

