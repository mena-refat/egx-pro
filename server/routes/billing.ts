import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.ts';
import { BillingController } from '../controllers/billing.controller.ts';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { validateDiscountBodySchema, upgradeBodySchema, googlePlayVerifySchema } from '../schemas/billing.schema.ts';

const router = Router();

router.get('/plan', authenticate, BillingController.getPlan);
router.post('/discount/validate', authenticate, idempotencyMiddleware, validate(validateDiscountBodySchema, 'body'), BillingController.validateDiscount);
router.post('/validate-discount', authenticate, idempotencyMiddleware, validate(validateDiscountBodySchema, 'body'), BillingController.validateDiscount);
router.post('/upgrade', authenticate, idempotencyMiddleware, validate(upgradeBodySchema, 'body'), BillingController.upgrade);
router.post('/google-play/verify', authenticate, idempotencyMiddleware, validate(googlePlayVerifySchema, 'body'), BillingController.verifyGooglePlayPurchase);

export default router;
