import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { authenticate } from '../middleware/auth.middleware.ts';
import { BillingController } from '../controllers/billing.controller.ts';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { validateDiscountBodySchema, upgradeBodySchema, googlePlayVerifySchema } from '../schemas/billing.schema.ts';
import type { AuthRequest } from './types.ts';

const router = Router();

// 10 محاولات كل ساعة لكل مستخدم — يمنع brute-force على كودات الخصم
const discountValidateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `user:${(req as AuthRequest).user!.id}`,
  validate: { keyGeneratorIpFallback: false },
  handler: (_req, res) => res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' }),
});

// 5 عمليات ترقية كل ساعة لكل مستخدم
const upgradeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `user:${(req as AuthRequest).user!.id}`,
  validate: { keyGeneratorIpFallback: false },
  handler: (_req, res) => res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' }),
});

// 20 طلب كل ساعة لكل IP — webhook من Google (JWT-verified)
const webhookLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? 'unknown'),
  handler: (_req, res) => res.sendStatus(429),
});

router.get('/plan', authenticate, BillingController.getPlan);
router.post('/discount/validate', authenticate, discountValidateLimiter, idempotencyMiddleware, validate(validateDiscountBodySchema, 'body'), BillingController.validateDiscount);
router.post('/validate-discount', authenticate, discountValidateLimiter, idempotencyMiddleware, validate(validateDiscountBodySchema, 'body'), BillingController.validateDiscount);
router.post('/upgrade', authenticate, upgradeLimiter, idempotencyMiddleware, validate(upgradeBodySchema, 'body'), BillingController.upgrade);
router.post('/google-play/verify', authenticate, idempotencyMiddleware, validate(googlePlayVerifySchema, 'body'), BillingController.verifyGooglePlayPurchase);
// Pub/Sub push endpoint — called by Google, JWT-verified inside controller
router.post('/google-play/webhook', webhookLimiter, BillingController.googlePlayWebhook);

export default router;
