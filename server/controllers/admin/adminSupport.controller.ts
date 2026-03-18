import type { Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { sendSuccess, sendError } from '../../lib/apiResponse.ts';
import { adminAudit, type AdminRequest } from '../../middleware/adminAuth.middleware.ts';
import { createNotification } from '../../lib/createNotification.ts';

export const AdminSupportController = {
  async list(req: AdminRequest, res: Response): Promise<void> {
    const { page = '1', status = '', priority = '' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              fullName: true,
              plan: true,
            },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: (pageNum - 1) * 20,
        take: 20,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    sendSuccess(res, {
      tickets,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / 20),
    });
  },

  async reply(req: AdminRequest, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const { reply, status = 'RESOLVED' } = req.body as {
      reply?: string;
      status?: string;
    };
    if (!reply?.trim()) {
      sendError(res, 'VALIDATION_ERROR', 400);
      return;
    }

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        reply: reply.trim(),
        repliedAt: new Date(),
        repliedBy: req.admin?.id ?? null,
        status: status as 'RESOLVED' | 'CLOSED' | 'IN_PROGRESS',
      },
    });

    await createNotification(
      ticket.userId,
      'achievement',
      'تم الرد على طلب دعمك',
      reply.slice(0, 100),
      { route: '/support' }
    ).catch(() => null);

    if (req.admin) {
      await adminAudit(
        req.admin.id,
        'SUPPORT_REPLIED',
        id,
        `status → ${status}`,
        req
      );
    }

    sendSuccess(res, ticket);
  },

  async updateStatus(req: AdminRequest, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const { status, priority } = req.body as {
      status?: string;
      priority?: string;
    };

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        ...(status && {
          status: status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED',
        }),
        ...(priority && {
          priority: priority as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
        }),
        ...(req.admin && { assignedTo: req.admin.id }),
      },
    });

    if (req.admin) {
      await adminAudit(
        req.admin.id,
        'SUPPORT_STATUS_UPDATED',
        id,
        JSON.stringify({ status, priority }),
        req
      );
    }

    sendSuccess(res, ticket);
  },

  async stats(_req: AdminRequest, res: Response): Promise<void> {
    const [open, inProgress, resolved, closed] = await Promise.all([
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
      prisma.supportTicket.count({ where: { status: 'CLOSED' } }),
    ]);
    sendSuccess(res, { open, inProgress, resolved, closed });
  },
};

