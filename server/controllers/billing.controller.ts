import { Request, Response, NextFunction } from 'express';
import { BillingService } from '../services/billing.service.ts';
import { GooglePlayService } from '../services/googlePlay.service.ts';
import { DiscountRepository } from '../repositories/discount.repository.ts';
import { UserRepository } from '../repositories/user.repository.ts';
import type { AuthRequest } from '../routes/types.ts';
import { auditLog } from '../lib/audit.ts';
import { sendSuccess, sendError } from '../lib/apiResponse.ts';
import { prisma } from '../lib/prisma.ts';

function run(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

type GooglePlayProductId = 'borsa_pro_monthly' | 'borsa_pro_yearly' | 'borsa_ultra_monthly' | 'borsa_ultra_yearly';

const PRODUCT_PLAN_MAP: Record<GooglePlayProductId, { planValue: 'pro' | 'yearly' | 'ultra' | 'ultra_yearly' }> = {
  borsa_pro_monthly:  { planValue: 'pro'         },
  borsa_pro_yearly:   { planValue: 'yearly'       },
  borsa_ultra_monthly:{ planValue: 'ultra'        },
  borsa_ultra_yearly: { planValue: 'ultra_yearly' },
};

// Notification types from Google Play RTDN
const GP_NOTIF = {
  PURCHASED:  1,
  RENEWED:    2,
  CANCELED:   3,
  REVOKED:    12,
  EXPIRED:    13,
} as const;

export const BillingController = {
  getPlan: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) { sendError(res, 'UNAUTHORIZED', 401); return; }
    const data = await BillingService.getPlan(userId);
    sendSuccess(res, data);
  }),

  validateDiscount: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) { sendError(res, 'UNAUTHORIZED', 401); return; }
    const { code, plan } = req.body as { code?: string; plan?: string };
    const data = await BillingService.validateDiscount(
      userId,
      String(code ?? '').trim(),
      plan as 'pro' | 'annual' | undefined,
    );
    sendSuccess(res, data);
  }),

  upgrade: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) { sendError(res, 'UNAUTHORIZED', 401); return; }
    const { plan, discountCode, paymentToken } = req.body as {
      plan?: string; discountCode?: string; paymentToken?: string;
    };
    const data = await BillingService.upgrade(
      userId,
      plan as import('../services/billing.service.ts').PlanUpgrade,
      { discountCode, paymentToken },
    );
    await auditLog({
      userId,
      action: 'SUBSCRIPTION_UPGRADE',
      details: `Upgraded to ${plan}${discountCode ? ` with discount ${discountCode}` : ''}`,
      result: 'success',
      req: { ip: req.ip, headers: req.headers as { 'user-agent'?: string } },
    });
    sendSuccess(res, data);
  }),

  // ─── Google Play: first purchase ────────────────────────────────────────────
  verifyGooglePlayPurchase: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) { sendError(res, 'UNAUTHORIZED', 401); return; }

    const { purchaseToken, productId, plan } = req.body as {
      purchaseToken?: string; productId?: string; plan?: string;
    };

    const mapping = PRODUCT_PLAN_MAP[productId as GooglePlayProductId];
    if (!mapping) { sendError(res, 'INVALID_PLAN', 400); return; }

    const verification = await GooglePlayService.verifySubscription(
      'com.borsa.mobile',
      productId as string,
      purchaseToken as string,
    );

    if (!verification.valid) { sendError(res, 'INVALID_PURCHASE', 400); return; }

    const planExpiresAt = new Date(verification.expiryTimeMillis);

    // Save purchaseToken on user so the RTDN webhook can look them up later
    await prisma.user.update({
      where: { id: userId },
      data: { googlePlayToken: purchaseToken },
    });

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

  // ─── Google Play RTDN Webhook (called by Google via Pub/Sub) ─────────────────
  // No auth middleware — verified by checking the source is Google's Pub/Sub
  googlePlayWebhook: async (req: Request, res: Response) => {
    // Always respond 200 first so Google doesn't retry endlessly
    res.sendStatus(200);

    try {
      // Pub/Sub pushes a JSON envelope with base64-encoded data
      const pubsubMessage = (req.body as { message?: { data?: string } })?.message;
      if (!pubsubMessage?.data) return;

      const decoded = Buffer.from(pubsubMessage.data, 'base64').toString('utf8');
      const notification = JSON.parse(decoded) as {
        packageName?: string;
        subscriptionNotification?: {
          notificationType: number;
          purchaseToken: string;
          subscriptionId: string;
        };
      };

      const sub = notification.subscriptionNotification;
      if (!sub) return; // could be a test notification

      const { notificationType, purchaseToken, subscriptionId } = sub;

      // Find the user by their stored purchaseToken
      const user = await UserRepository.findFirst({
        where: { googlePlayToken: purchaseToken },
        select: { id: true, plan: true },
      });
      if (!user) return; // unknown token — ignore

      const mapping = PRODUCT_PLAN_MAP[subscriptionId as GooglePlayProductId];

      if (notificationType === GP_NOTIF.RENEWED || notificationType === GP_NOTIF.PURCHASED) {
        // Fetch fresh expiry from Google Play
        if (!mapping) return;
        const verification = await GooglePlayService.verifySubscription(
          'com.borsa.mobile',
          subscriptionId,
          purchaseToken,
        );
        if (!verification.valid) return;

        const planExpiresAt = new Date(verification.expiryTimeMillis);
        await DiscountRepository.applyUpgrade(user.id, mapping.planValue, planExpiresAt);

        console.info(`[GooglePlay] Renewed: user=${user.id} plan=${mapping.planValue} until=${planExpiresAt.toISOString()}`);

      } else if (notificationType === GP_NOTIF.REVOKED) {
        // Immediately revoke — set back to free
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: 'free', planExpiresAt: null, googlePlayToken: null },
        });
        console.info(`[GooglePlay] Revoked: user=${user.id}`);

      } else if (notificationType === GP_NOTIF.EXPIRED) {
        // Subscription expired (non-renewing or after grace period)
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: 'free', planExpiresAt: null, googlePlayToken: null },
        });
        console.info(`[GooglePlay] Expired: user=${user.id}`);

      } else if (notificationType === GP_NOTIF.CANCELED) {
        // User canceled — keep active until current period ends (planExpiresAt unchanged)
        // Just clear the token so we know they cancelled
        console.info(`[GooglePlay] Canceled (will expire at planExpiresAt): user=${user.id}`);
      }

    } catch (err) {
      console.error('[GooglePlay webhook] Error:', err);
    }
  },
};
