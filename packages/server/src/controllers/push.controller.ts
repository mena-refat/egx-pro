import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.ts';
import { getVapidPublicKey } from '../lib/webPush.ts';
import { AppError } from '../lib/errors.ts';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh:   z.string().min(1),
  auth:     z.string().min(1),
});

export const PushController = {
  /** GET /notifications/push/vapid-key — public, no auth needed */
  vapidKey(_req: Request, res: Response) {
    res.json({ ok: true, publicKey: getVapidPublicKey() });
  },

  /** GET /notifications/push/status — is this user subscribed on any device? */
  async status(req: Request, res: Response) {
    const userId = (req as Request & { user?: { id: number } }).user?.id;
    if (!userId) throw new AppError('UNAUTHORIZED', 401);
    const count = await prisma.webPushSubscription.count({ where: { userId } });
    res.json({ ok: true, subscribed: count > 0 });
  },

  /** POST /notifications/push/subscribe */
  async subscribe(req: Request, res: Response) {
    const userId = (req as Request & { user?: { id: number } }).user?.id;
    if (!userId) throw new AppError('UNAUTHORIZED', 401);

    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400);

    const { endpoint, p256dh, auth } = parsed.data;

    await prisma.webPushSubscription.upsert({
      where:  { endpoint },
      update: { userId, p256dh, auth },
      create: { userId, endpoint, p256dh, auth },
    });

    res.json({ ok: true });
  },

  /** DELETE /notifications/push/unsubscribe */
  async unsubscribe(req: Request, res: Response) {
    const userId = (req as Request & { user?: { id: number } }).user?.id;
    if (!userId) throw new AppError('UNAUTHORIZED', 401);

    const { endpoint } = req.body as { endpoint?: string };
    if (endpoint) {
      await prisma.webPushSubscription.deleteMany({ where: { endpoint, userId } });
    } else {
      // remove all subscriptions for this user
      await prisma.webPushSubscription.deleteMany({ where: { userId } });
    }

    res.json({ ok: true });
  },
};
