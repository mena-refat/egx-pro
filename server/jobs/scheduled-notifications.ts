import { prisma } from '../lib/prisma.ts';
import { logger } from '../lib/logger.ts';
import { createNotification } from '../lib/createNotification.ts';

function calcNextSendAt(from: Date, repeat: string): Date {
  const d = new Date(from);
  if (repeat === 'DAILY')   d.setDate(d.getDate() + 1);
  else if (repeat === 'WEEKLY')  d.setDate(d.getDate() + 7);
  else if (repeat === 'MONTHLY') d.setMonth(d.getMonth() + 1);
  return d;
}

export async function runScheduledNotificationsJob(): Promise<void> {
  const now = new Date();

  const due = await prisma.scheduledNotification.findMany({
    where: { status: 'PENDING', nextSendAt: { lte: now } },
  });

  if (due.length === 0) return;

  for (const notif of due) {
    try {
      const where: Record<string, unknown> = { isDeleted: false };
      if (notif.plans.length > 0) {
        where.plan = { in: notif.plans };
      }

      const users = await prisma.user.findMany({ where, select: { id: true } });

      await Promise.all(
        users.map((u) =>
          createNotification(u.id, 'achievement', notif.title, notif.body.slice(0, 200), {
            route: '/notifications',
          })
        )
      );

      const newSentCount = notif.sentCount + 1;

      if (notif.repeat === 'NONE') {
        await prisma.scheduledNotification.update({
          where: { id: notif.id },
          data: { status: 'SENT', lastSentAt: now, sentCount: newSentCount },
        });
      } else {
        const nextSendAt = calcNextSendAt(notif.nextSendAt, notif.repeat);
        await prisma.scheduledNotification.update({
          where: { id: notif.id },
          data: { nextSendAt, lastSentAt: now, sentCount: newSentCount },
        });
      }

      logger.info('Scheduled notification fired', { id: notif.id, recipients: users.length });
    } catch (err) {
      logger.error('Scheduled notification error', { id: notif.id, error: err });
    }
  }
}
