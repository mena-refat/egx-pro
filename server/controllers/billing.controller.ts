import { Response, NextFunction } from 'express';
import { BillingService } from '../services/billing.service.ts';
import { GooglePlayService } from '../services/googlePlay.service.ts';
import { DiscountRepository } from '../repositories/discount.repository.ts';
import type { AuthRequest } from '../routes/types.ts';
import { auditLog } from '../lib/audit.ts';
import { sendSuccess, sendError } from '../lib/apiResponse.ts';

function run(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

type GooglePlayProductId = 'borsa_pro_monthly' | 'borsa_pro_yearly' | 'borsa_ultra_monthly' | 'borsa_ultra_yearly';

const PRODUCT_PLAN_MAP: Record<GooglePlayProductId, { planValue: 'pro' | 'yearly' | 'ultra' | 'ultra_yearly' }> = {
  borsa_pro_monthly: { planValue: 'pro' },
  borsa_pro_yearly: { planValue: 'yearly' },
  borsa_ultra_monthly: { planValue: 'ultra' },
  borsa_ultra_yearly: { planValue: 'ultra_yearly' },
};

export const BillingController = {
  getPlan: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const data = await BillingService.getPlan(userId);
    sendSuccess(res, data);
  }),

  validateDiscount: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const { code, plan } = req.body as { code?: string; plan?: string };
    const data = await BillingService.validateDiscount(
      userId,
      String(code ?? '').trim(),
      plan as 'pro' | 'annual' | undefined
    );
    sendSuccess(res, data);
  }),

  upgrade: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const { plan, discountCode, paymentToken } = req.body as {
      plan?: string;
      discountCode?: string;
      paymentToken?: string;
    };
    const data = await BillingService.upgrade(userId, plan as import('../services/billing.service.ts').PlanUpgrade, {
      discountCode,
      paymentToken,
    });
    await auditLog({
      userId,
      action: 'SUBSCRIPTION_UPGRADE',
      details: `Upgraded to ${plan}${discountCode ? ` with discount ${discountCode}` : ''}`,
      result: 'success',
      req: { ip: req.ip, headers: req.headers as { 'user-agent'?: string } },
    });
    sendSuccess(res, data);
  }),

  verifyGooglePlayPurchase: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }

    const { purchaseToken, productId, plan } = req.body as {
      purchaseToken?: string;
      productId?: string;
      plan?: string;
    };

    if (!plan || !['pro_monthly', 'pro_yearly', 'ultra_monthly', 'ultra_yearly'].includes(plan)) {
      sendError(res, 'INVALID_PLAN', 400);
      return;
    }

    const mapping = PRODUCT_PLAN_MAP[productId as GooglePlayProductId];
    if (!mapping) {
      sendError(res, 'INVALID_PLAN', 400);
      return;
    }

    const verification = await GooglePlayService.verifySubscription(
      'com.borsa.mobile',
      productId as string,
      purchaseToken as string
    );

    if (!verification.valid) {
      sendError(res, 'INVALID_PURCHASE', 400);
      return;
    }

    const planExpiresAt = new Date(verification.expiryTimeMillis);
    await DiscountRepository.applyUpgrade(userId, mapping.planValue, planExpiresAt);

    await auditLog({
      userId,
      action: 'SUBSCRIPTION_UPGRADE',
      details: `Google Play purchase verified: ${productId} → ${mapping.planValue}`,
      result: 'success',
      req: { ip: req.ip, headers: req.headers as { 'user-agent'?: string } },
    });

    sendSuccess(res, { success: true });
  }),
};
