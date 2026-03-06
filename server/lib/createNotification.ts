import { prisma } from './prisma.ts';

export type NotificationType = 'achievement' | 'stock_target' | 'referral' | 'goal' | 'portfolio';

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string
): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId, type, title, body },
    });
  } catch (err) {
    console.error('Create notification error:', err);
  }
}
