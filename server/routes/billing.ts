import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.ts';
import { BillingController } from '../controllers/billing.controller.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { validateDiscountBodySchema, upgradeBodySchema } from '../schemas/billing.schema.ts';

const router = Router();

router.get('/plan', authenticate, BillingController.getPlan);
router.post('/discount/validate', authenticate, validate(validateDiscountBodySchema, 'body'), BillingController.validateDiscount);
router.post('/validate-discount', authenticate, validate(validateDiscountBodySchema, 'body'), BillingController.validateDiscount);
router.post('/upgrade', authenticate, validate(upgradeBodySchema, 'body'), BillingController.upgrade);

export default router;
