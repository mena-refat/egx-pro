import type { Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { sendSuccess, sendError } from '../../lib/apiResponse.ts';
import { adminAudit, type AdminRequest } from '../../middleware/adminAuth.middleware.ts';
import { createNotification } from '../../lib/createNotification.ts';

const VALID_REPEATS = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'] as const;

export const AdminNotificationsController = {
  async broadcast(req: AdminRequest, res: Response): Promise<void> {
    const { title, body, plan, plans } = req.body as {
      title?: string;
      body?: string;
      plan?: string;
      plans?: string[];
    };
    if (!title?.trim() || !body?.trim()) {
      sendError(res, 'VALIDATION_ERROR', 400);
      return;
    }

    const where: Record<string, unknown> = { isDeleted: false };

    const selectedPlans =
      Array.isArray(plans) && plans.length > 0
        ? plans
        : plan
        ? [plan]
        : [];

    if (selectedPlans.length > 0) {
      where.plan = { in: selectedPlans };
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
        JSON.stringify({
          title,
          plan,
          plans: selectedPlans,
          count: users.length,
        }),
        req,
      );
    }

    sendSuccess(res, { count: users.length });
  },

  async schedule(req: AdminRequest, res: Response): Promise<void> {
    if (!req.admin) { sendError(res, 'UNAUTHORIZED', 401); return; }

    const { title, body, plans, scheduledAt, repeat = 'NONE' } = req.body as {
      title?: string;
      body?: string;
      plans?: string[];
      scheduledAt?: string;
      repeat?: string;
    };

    if (!title?.trim() || !body?.trim() || !scheduledAt) {
      sendError(res, 'VALIDATION_ERROR', 400);
      return;
    }

    if (!(VALID_REPEATS as readonly string[]).includes(repeat)) {
      sendError(res, 'INVALID_REPEAT', 400);
      return;
    }

    const sendAt = new Date(scheduledAt);
    if (isNaN(sendAt.getTime()) || sendAt <= new Date()) {
      sendError(res, 'INVALID_SCHEDULED_AT', 400);
      return;
    }

    const notif = await prisma.scheduledNotification.create({
      data: {
        title: title.trim(),
        body: body.trim(),
        plans: Array.isArray(plans) && plans.length > 0 ? plans : [],
        scheduledAt: sendAt,
        repeat: repeat as (typeof VALID_REPEATS)[number],
        nextSendAt: sendAt,
        createdById: req.admin.id,
      },
    });

    await adminAudit(req.admin.id, 'NOTIFICATION_SCHEDULED', String(notif.id), `title: ${title}, at: ${scheduledAt}, repeat: ${repeat}`, req);

    sendSuccess(res, notif, 201);
  },

  async listScheduled(req: AdminRequest, res: Response): Promise<void> {
    const { page = '1', status = '' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);

    const where: Record<string, unknown> = {};
    if (status && ['PENDING', 'SENT', 'CANCELLED'].includes(status)) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      prisma.scheduledNotification.findMany({
        where,
        orderBy: { scheduledAt: 'desc' },
        include: { createdBy: { select: { id: true, fullName: true } } },
        skip: (pageNum - 1) * 20,
        take: 20,
      }),
      prisma.scheduledNotification.count({ where }),
    ]);

    sendSuccess(res, { items, total, page: pageNum, totalPages: Math.ceil(total / 20) });
  },

  async cancelScheduled(req: AdminRequest, res: Response): Promise<void> {
    if (!req.admin) { sendError(res, 'UNAUTHORIZED', 401); return; }
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { sendError(res, 'VALIDATION_ERROR', 400); return; }

    const notif = await prisma.scheduledNotification.findUnique({ where: { id } });
    if (!notif) { sendError(res, 'NOT_FOUND', 404); return; }
    if (notif.status !== 'PENDING') { sendError(res, 'ALREADY_PROCESSED', 400); return; }

    await prisma.scheduledNotification.update({ where: { id }, data: { status: 'CANCELLED' } });
    await adminAudit(req.admin.id, 'NOTIFICATION_SCHEDULE_CANCELLED', String(id), undefined, req);

    sendSuccess(res, { ok: true });
  },

  async deleteScheduled(req: AdminRequest, res: Response): Promise<void> {
    if (!req.admin) { sendError(res, 'UNAUTHORIZED', 401); return; }
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { sendError(res, 'VALIDATION_ERROR', 400); return; }

    await prisma.scheduledNotification.delete({ where: { id } });
    await adminAudit(req.admin.id, 'NOTIFICATION_SCHEDULE_DELETED', String(id), undefined, req);

    sendSuccess(res, { ok: true });
  },
};

