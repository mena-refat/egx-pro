import webpush from 'web-push';
import { logger } from './logger.ts';

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  ?? '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT     ?? 'mailto:support@borsa.app';

let initialized = false;

export function initWebPush(): void {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    logger.warn('[webPush] VAPID keys not set — web push disabled. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.');
    return;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  initialized = true;
  logger.info('[webPush] Initialized ✓');
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC;
}

export async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: { title: string; body: string; route?: string; tag?: string },
): Promise<'ok' | 'expired'> {
  if (!initialized) return 'ok';
  try {
    await webpush.sendNotification(
      { endpoint, keys: { p256dh, auth } },
      JSON.stringify({ ...payload, icon: '/borsa-logo-96.webp', badge: '/borsa-logo-96.webp' }),
      { TTL: 86400 },
    );
    return 'ok';
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) return 'expired'; // subscription gone
    logger.warn('[webPush] Send failed', { endpoint: endpoint.slice(0, 60), status });
    return 'ok';
  }
}
