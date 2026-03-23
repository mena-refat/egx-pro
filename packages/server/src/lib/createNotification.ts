import { prisma } from './prisma.ts';
import { logger } from './logger.ts';
import { sendWebPush } from './webPush.ts';

export type NotificationType =
  | 'achievement'
  | 'stock_target'
  | 'referral'
  | 'goal'
  | 'portfolio'
  | 'social_follow'
  | 'social_request'
  | 'social_accept'
  | 'prediction_hit'
  | 'prediction_missed'
  | 'prediction_liked'
  | 'rank_up'
  | 'support_reply'
  | 'support_escalated'
  | 'account_suspended'
  | 'abuse_warning';

/** Send an Expo push notification — non-critical, never throws. */
async function sendExpoPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!token.startsWith('ExponentPushToken[')) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: token, title, body, data: data ?? {}, sound: 'default', priority: 'high' }),
    });
  } catch {
    // non-critical — ignore silently
  }
}

export async function createNotification(
  userId: number,
  type: NotificationType,
  title: string,
  body: string,
  options?: { route?: string; pushToken?: string }
): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId, type, title, body, route: options?.route ?? undefined },
    });

    // ── Expo push (mobile) ──
    if (options?.pushToken) {
      await sendExpoPush(options.pushToken, title, body, { route: options.route });
    }

    // ── Web push (browser) ──
    const webSubs = await prisma.webPushSubscription.findMany({ where: { userId } });
    const expiredIds: number[] = [];
    await Promise.all(
      webSubs.map(async (sub) => {
        const result = await sendWebPush(sub.endpoint, sub.p256dh, sub.auth, {
          title, body, route: options?.route, tag: type,
        });
        if (result === 'expired') expiredIds.push(sub.id);
      }),
    );
    if (expiredIds.length > 0) {
      await prisma.webPushSubscription.deleteMany({ where: { id: { in: expiredIds } } });
    }
  } catch (err) {
    logger.error('Create notification error', { err });
  }
}
