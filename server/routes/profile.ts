import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.ts';
import { ProfileController } from '../controllers/profile.controller.ts';

const router = Router();

router.get('/completion', authenticate, ProfileController.completion);

export default router;
