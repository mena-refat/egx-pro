import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { BillingService } from '../services/billing.service.ts';
import { GooglePlayService } from '../services/googlePlay.service.ts';
import { PaymobService } from '../services/paymob.service.ts';
import { DiscountRepository } from '../repositories/discount.repository.ts';
import { UserRepository } from '../repositories/user.repository.ts';
import type { AuthRequest } from '../routes/types.ts';
import { auditLog } from '../lib/audit.ts';
import { sendSuccess, sendError } from '../lib/apiResponse.ts';
import { prisma } from '../lib/prisma.ts';

const pubsubClient = new OAuth2Client();

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

    const VALID_PLANS = ['pro', 'annual', 'ultra', 'ultra_yearly', 'yearly'] as const;
    if (plan !== undefined && !VALID_PLANS.includes(plan as typeof VALID_PLANS[number])) {
      sendError(res, 'INVALID_PLAN', 400); return;
    }

    const data = await BillingService.validateDiscount(
      userId,
      String(code ?? '').trim().slice(0, 64),
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

  // ─── Paymob web checkout initiation ─────────────────────────────────────────
  paymobInitiate: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) { sendError(res, 'UNAUTHORIZED', 401); return; }

    const { plan, discountCode } = req.body as { plan?: string; discountCode?: string };
    const PRICES: Record<string, number> = {
      pro_monthly: 189, pro_yearly: 1890, ultra_monthly: 397, ultra_yearly: 3970,
    };
    if (!plan || !PRICES[plan]) { sendError(res, 'INVALID_PLAN', 400); return; }

    let finalPrice = PRICES[plan];

    // Apply discount if provided
    if (discountCode?.trim()) {
      try {
        const d = await BillingService.validateDiscount(userId, discountCode.trim());
        if (d.valid && typeof d.percent === 'number' && d.percent > 0) {
          finalPrice = Math.round(PRICES[plan] * (1 - d.percent / 100));
        }
      } catch { /* invalid code — proceed at full price */ }
    }

    if (finalPrice <= 0) {
      sendError(res, 'USE_FREE_UPGRADE', 400); return;
    }

    const appUrl = (process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const returnUrl = `${appUrl}/settings/subscription?paymob_return=1&plan=${encodeURIComponent(plan)}${discountCode ? `&dc=${encodeURIComponent(discountCode)}` : ''}`;

    const result = await PaymobService.initiateWebCheckout(finalPrice, plan, returnUrl);
    sendSuccess(res, result);
  }),

  // ─── Google Play: first purchase ────────────────────────────────────────────
  verifyGooglePlayPurchase: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) { sendError(res, 'UNAUTHORIZED', 401); return; }

    const { purchaseToken, productId } = req.body as {
      purchaseToken?: string; productId?: string;
    };

    if (!purchaseToken || typeof purchaseToken !== 'string' || purchaseToken.trim().length === 0) {
      sendError(res, 'INVALID_PURCHASE', 400); return;
    }

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
  googlePlayWebhook: async (req: Request, res: Response) => {
    // Verify the Pub/Sub push JWT sent by Google in the Authorization header.
    // Google signs the JWT with the service account specified in the Pub/Sub subscription.
    const EXPECTED_AUDIENCE = process.env.GOOGLE_PUBSUB_AUDIENCE ?? process.env.VITE_API_URL ?? '';
    const authHeader = req.headers.authorization ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      res.sendStatus(401);
      return;
    }
    try {
      const token = authHeader.slice(7);
      // Full cryptographic verification using Google's public keys (RS256)
      const ticket = await pubsubClient.verifyIdToken({
        idToken: token,
        audience: EXPECTED_AUDIENCE || undefined,
      });
      const payload = ticket.getPayload();
      if (!payload?.email?.endsWith('@gcp-sa-pubsub.iam.gserviceaccount.com')) {
        res.sendStatus(401);
        return;
      }
    } catch {
      res.sendStatus(401);
      return;
    }

    // Always respond 200 so Google doesn't retry endlessly
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

      } else if (notificationType === GP_NOTIF.REVOKED) {
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: 'free', planExpiresAt: null, googlePlayToken: null },
        });

      } else if (notificationType === GP_NOTIF.EXPIRED) {
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: 'free', planExpiresAt: null, googlePlayToken: null },
        });
      }
      // GP_NOTIF.CANCELED: keep active until planExpiresAt — no action needed

    } catch {
      // Swallow errors — we already sent 200 to Google to prevent retries
    }
  },
};
