import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.ts';
import { BillingController } from '../controllers/billing.controller.ts';

const router = Router();

router.get('/plan', authenticate, BillingController.getPlan);
router.post('/discount/validate', authenticate, BillingController.validateDiscount);
router.post('/validate-discount', authenticate, BillingController.validateDiscount);
router.post('/upgrade', authenticate, BillingController.upgrade);

export default router;
