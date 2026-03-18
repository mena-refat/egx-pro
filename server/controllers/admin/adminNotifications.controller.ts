import type { Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { sendSuccess, sendError } from '../../lib/apiResponse.ts';
import { adminAudit, type AdminRequest } from '../../middleware/adminAuth.middleware.ts';
import { createNotification } from '../../lib/createNotification.ts';

export const AdminNotificationsController = {
  async broadcast(req: AdminRequest, res: Response): Promise<void> {
    const { title, body, plan } = req.body as {
      title?: string;
      body?: string;
      plan?: string;
    };
    if (!title?.trim() || !body?.trim()) {
      sendError(res, 'VALIDATION_ERROR', 400);
      return;
    }

    const where: Record<string, unknown> = { isDeleted: false };
    if (plan) {
      where.plan = plan;
    }

    const users = await prisma.user.findMany({
      where,
      select: { id: true },
    });

    await Promise.all(
      users.map((u) =>
        createNotification(u.id, 'achievement', title, body.slice(0, 200), {
          route: '/notifications',
        })
      )
    );

    if (req.admin) {
      await adminAudit(
        req.admin.id,
        'NOTIFICATIONS_BROADCAST',
        undefined,
        JSON.stringify({ title, plan, count: users.length }),
        req
      );
    }

    sendSuccess(res, { count: users.length });
  },
};

