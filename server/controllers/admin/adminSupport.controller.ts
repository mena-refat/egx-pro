import type { Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { sendSuccess, sendError } from '../../lib/apiResponse.ts';
import { adminAudit, type AdminRequest } from '../../middleware/adminAuth.middleware.ts';
import { hasPermission } from '../../lib/adminPermissions.ts';
import { createNotification } from '../../lib/createNotification.ts';

function isManager(admin: AdminRequest['admin']): boolean {
  if (!admin) return false;
  return admin.role === 'SUPER_ADMIN' || hasPermission(admin, 'support.manage');
}

export const AdminSupportController = {
  async list(req: AdminRequest, res: Response): Promise<void> {
    const { page = '1', status = '', priority = '', agentId = '', sort = '' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const manager = isManager(req.admin);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;

    if (!manager) {
      where.assignedTo = req.admin!.id;
    } else if (agentId === 'unassigned') {
      where.assignedTo = null;
    } else if (agentId) {
      where.assignedTo = parseInt(agentId, 10);
    }

    // Sort order — agents default to oldest first so they answer longest-waiting users
    let orderBy: object[];
    if (sort === 'newest') {
      orderBy = [{ createdAt: 'desc' }];
    } else if (sort === 'priority') {
      orderBy = [{ priority: 'desc' }, { createdAt: 'asc' }];
    } else if (sort === 'oldest' || !manager) {
      // Explicit oldest, or agent default
      orderBy = [{ createdAt: 'asc' }];
    } else {
      // Manager default: priority first, then newest
      orderBy = [{ priority: 'desc' }, { createdAt: 'desc' }];
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, username: true, fullName: true, plan: true } },
        },
        orderBy,
        skip: (pageNum - 1) * 20,
        take: 20,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    let agentMap: Record<number, { fullName: string; email: string }> = {};
    if (manager) {
      const agentIds = [...new Set(tickets.map((t) => t.assignedTo).filter(Boolean))] as number[];
      if (agentIds.length > 0) {
        const agents = await prisma.admin.findMany({
          where: { id: { in: agentIds } },
          select: { id: true, fullName: true, email: true },
        });
        agentMap = Object.fromEntries(agents.map((a) => [a.id, { fullName: a.fullName, email: a.email }]));
      }
    }

    sendSuccess(res, {
      tickets: tickets.map((t) => ({
        ...t,
        assignedAgent: t.assignedTo ? (agentMap[t.assignedTo] ?? null) : null,
      })),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / 20),
      isManager: manager,
    });
  },

  async reply(req: AdminRequest, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const { reply, status = 'RESOLVED' } = req.body as { reply?: string; status?: string };

    if (!reply?.trim()) {
      sendError(res, 'VALIDATION_ERROR', 400);
      return;
    }

    if (!isManager(req.admin)) {
      const ticket = await prisma.supportTicket.findUnique({ where: { id }, select: { assignedTo: true } });
      if (!ticket || ticket.assignedTo !== req.admin!.id) {
        sendError(res, 'ADMIN_FORBIDDEN', 403);
        return;
      }
    }

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        reply: reply.trim(),
        repliedAt: new Date(),
        repliedBy: req.admin?.id ?? null,
        replyRead: false,
        status: status as 'RESOLVED' | 'CLOSED' | 'IN_PROGRESS',
      },
    });

    await createNotification(
      ticket.userId,
      'support_reply',
      'تم الرد على طلب دعمك',
      reply.slice(0, 100),
      { route: '/support' }
    ).catch(() => null);

    if (req.admin) {
      await adminAudit(req.admin.id, 'SUPPORT_REPLIED', id, `status → ${status}`, req);
    }

    sendSuccess(res, ticket);
  },

  async updateStatus(req: AdminRequest, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const { status, priority } = req.body as { status?: string; priority?: string };

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        ...(status && { status: status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' }),
        ...(priority && { priority: priority as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' }),
      },
    });

    if (req.admin) {
      await adminAudit(req.admin.id, 'SUPPORT_STATUS_UPDATED', id, JSON.stringify({ status, priority }), req);
    }

    sendSuccess(res, ticket);
  },

  async assignTicket(req: AdminRequest, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const { agentId } = req.body as { agentId: number | null };

    if (agentId) {
      const agent = await prisma.admin.findUnique({
        where: { id: agentId, isActive: true },
        select: { id: true },
      });
      if (!agent) {
        sendError(res, 'AGENT_NOT_FOUND', 404);
        return;
      }
    }

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        assignedTo: agentId ?? null,
        assignedAt: agentId ? new Date() : null,
        status: agentId ? 'IN_PROGRESS' : 'OPEN',
      },
    });

    if (req.admin) {
      await adminAudit(req.admin.id, 'SUPPORT_ASSIGNED', id, agentId ? `agent:${agentId}` : 'unassigned', req);
    }

    sendSuccess(res, ticket);
  },

  async getAgents(req: AdminRequest, res: Response): Promise<void> {
    const where: Record<string, unknown> = {
      isActive: true,
      permissions: { has: 'support.reply' },
    };
    // Managers (non-super-admin) see only agents assigned to them
    if (req.admin!.role !== 'SUPER_ADMIN') {
      where.managerId = req.admin!.id;
    }
    const agents = await prisma.admin.findMany({
      where,
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
    });
    sendSuccess(res, agents);
  },

  async agentStats(req: AdminRequest, res: Response): Promise<void> {
    const where: Record<string, unknown> = {
      isActive: true,
      permissions: { has: 'support.reply' },
    };
    if (req.admin!.role !== 'SUPER_ADMIN') {
      where.managerId = req.admin!.id;
    }

    const agents = await prisma.admin.findMany({
      where,
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
    });

    const stats = await Promise.all(
      agents.map(async (agent) => {
        const [total, resolved, active, ratingAgg] = await Promise.all([
          prisma.supportTicket.count({ where: { assignedTo: agent.id } }),
          prisma.supportTicket.count({ where: { assignedTo: agent.id, status: { in: ['RESOLVED', 'CLOSED'] } } }),
          prisma.supportTicket.count({ where: { assignedTo: agent.id, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
          prisma.supportTicket.aggregate({
            where: { assignedTo: agent.id, rating: { not: null } },
            _avg: { rating: true },
            _count: { rating: true },
          }),
        ]);

        const respondedTickets = await prisma.supportTicket.findMany({
          where: { assignedTo: agent.id, assignedAt: { not: null }, repliedAt: { not: null } },
          select: { assignedAt: true, repliedAt: true },
        });

        const avgResponseHours =
          respondedTickets.length > 0
            ? Math.round(
                (respondedTickets.reduce(
                  (sum, t) => sum + (t.repliedAt!.getTime() - t.assignedAt!.getTime()),
                  0
                ) /
                  respondedTickets.length /
                  3_600_000) *
                  10
              ) / 10
            : null;

        return {
          agent,
          total,
          resolved,
          active,
          avgRating: ratingAgg._avg.rating ? Math.round(ratingAgg._avg.rating * 10) / 10 : null,
          ratingCount: ratingAgg._count.rating,
          avgResponseHours,
        };
      })
    );

    sendSuccess(res, stats);
  },

  async bulkAssign(req: AdminRequest, res: Response): Promise<void> {
    const { ticketIds, agentId } = req.body as { ticketIds: string[]; agentId: number | null };

    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      sendError(res, 'VALIDATION_ERROR', 400);
      return;
    }

    if (agentId) {
      const agent = await prisma.admin.findUnique({ where: { id: agentId, isActive: true }, select: { id: true } });
      if (!agent) { sendError(res, 'AGENT_NOT_FOUND', 404); return; }
    }

    await prisma.supportTicket.updateMany({
      where: { id: { in: ticketIds } },
      data: {
        assignedTo: agentId ?? null,
        assignedAt: agentId ? new Date() : null,
        status: agentId ? 'IN_PROGRESS' : 'OPEN',
      },
    });

    if (req.admin) {
      await adminAudit(req.admin.id, 'SUPPORT_BULK_ASSIGNED', undefined, `${ticketIds.length} tickets → agent:${agentId ?? 'unassigned'}`, req);
    }

    sendSuccess(res, { updated: ticketIds.length });
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
