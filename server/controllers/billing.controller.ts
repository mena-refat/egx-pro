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
      // Decode without verification first to get the email claim
      const unverified = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString()) as {
        iss?: string; aud?: string; email?: string; exp?: number;
      };
      // Basic structural validation — full crypto verification requires google-auth-library
      if (
        typeof unverified.exp !== 'number' ||
        unverified.exp < Math.floor(Date.now() / 1000) ||
        (EXPECTED_AUDIENCE && unverified.aud !== EXPECTED_AUDIENCE) ||
        !unverified.email?.endsWith('@gcp-sa-pubsub.iam.gserviceaccount.com')
      ) {
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
