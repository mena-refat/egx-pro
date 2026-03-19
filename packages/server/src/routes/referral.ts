import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.ts';
import { ReferralController } from '../controllers/referral.controller.ts';

const router = Router();

router.get('/', authenticate, ReferralController.get);

export default router;
