import { prisma } from './prisma.ts';
import { logger } from './logger.ts';

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
  | 'support_escalated';

export async function createNotification(
  userId: number,
  type: NotificationType,
  title: string,
  body: string,
  options?: { route?: string }
): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId, type, title, body, route: options?.route ?? undefined },
    });
  } catch (err) {
    logger.error('Create notification error', { err });
  }
}
