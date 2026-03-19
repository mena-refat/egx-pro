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
    if (reply.trim().length > 5000) {
      sendError(res, 'REPLY_TOO_LONG', 400);
      return;
    }
    const VALID_REPLY_STATUSES = ['IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
    if (!(VALID_REPLY_STATUSES as readonly string[]).includes(status)) {
      sendError(res, 'INVALID_STATUS', 400);
      return;
    }

    const existing = await prisma.supportTicket.findUnique({ where: { id }, select: { assignedTo: true, status: true } });
    if (!existing) { sendError(res, 'NOT_FOUND', 404); return; }

    if (existing.status === 'RESOLVED' || existing.status === 'CLOSED') {
      sendError(res, 'TICKET_ALREADY_CLOSED', 400);
      return;
    }

    if (existing.escalatedAt) { sendError(res, 'ALREADY_ESCALATED', 400); return; }

    if (!isManager(req.admin) && existing.assignedTo !== req.admin!.id) {
      sendError(res, 'ADMIN_FORBIDDEN', 403);
      return;
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

    const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED'] as const;
    const VALID_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
    if (status && !(VALID_STATUSES as readonly string[]).includes(status)) {
      sendError(res, 'INVALID_STATUS', 400);
      return;
    }
    if (priority && !(VALID_PRIORITIES as readonly string[]).includes(priority)) {
      sendError(res, 'INVALID_PRIORITY', 400);
      return;
    }

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
      isDeleted: false,
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
      isDeleted: false,
      permissions: { has: 'support.reply' },
    };
    const { managerId: managerIdParam } = req.query as Record<string, string>;
    if (req.admin!.role !== 'SUPER_ADMIN') {
      where.managerId = req.admin!.id;
    } else if (managerIdParam) {
      where.managerId = parseInt(managerIdParam, 10);
    }

    const agents = await prisma.admin.findMany({
      where,
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
    });

    const agentIds = agents.map((a) => a.id);

    if (agentIds.length === 0) {
      sendSuccess(res, {
        agents: [],
        managerStats: { avgAssignmentHours: null, unassignedOpen: 0, teamTotal: 0, teamResolved: 0, teamResolveRate: 0 },
      });
      return;
    }

    // ── Batch all ticket aggregations in a single round-trip ──────
    const [totalByAgent, resolvedByAgent, activeByAgent, ratingByAgent, responseTickets, assignedTickets, unassignedOpen] =
      await Promise.all([
        // Total tickets per agent
        prisma.supportTicket.groupBy({
          by: ['assignedTo'],
          where: { assignedTo: { in: agentIds } },
          _count: { id: true },
        }),
        // Resolved/closed per agent
        prisma.supportTicket.groupBy({
          by: ['assignedTo'],
          where: { assignedTo: { in: agentIds }, status: { in: ['RESOLVED', 'CLOSED'] } },
          _count: { id: true },
        }),
        // Active (open/in-progress) per agent
        prisma.supportTicket.groupBy({
          by: ['assignedTo'],
          where: { assignedTo: { in: agentIds }, status: { in: ['OPEN', 'IN_PROGRESS'] } },
          _count: { id: true },
        }),
        // Rating stats per agent
        prisma.supportTicket.groupBy({
          by: ['assignedTo'],
          where: { assignedTo: { in: agentIds }, rating: { not: null } },
          _avg: { rating: true },
          _count: { rating: true },
        }),
        // Response time calculation: assignedAt → repliedAt
        prisma.supportTicket.findMany({
          where: { assignedTo: { in: agentIds }, assignedAt: { not: null }, repliedAt: { not: null } },
          select: { assignedTo: true, assignedAt: true, repliedAt: true },
        }),
        // Assignment time: createdAt → assignedAt (for manager perf stats)
        prisma.supportTicket.findMany({
          where: { assignedTo: { in: agentIds }, assignedAt: { not: null } },
          select: { createdAt: true, assignedAt: true, status: true },
        }),
        // Unassigned open tickets
        prisma.supportTicket.count({ where: { status: 'OPEN', assignedTo: null } }),
      ]);

    // Build lookup maps
    const totalMap = Object.fromEntries(totalByAgent.map((r) => [r.assignedTo!, r._count.id]));
    const resolvedMap = Object.fromEntries(resolvedByAgent.map((r) => [r.assignedTo!, r._count.id]));
    const activeMap = Object.fromEntries(activeByAgent.map((r) => [r.assignedTo!, r._count.id]));
    const ratingMap = Object.fromEntries(
      ratingByAgent.map((r) => [r.assignedTo!, { avg: r._avg.rating, count: r._count.rating }])
    );
    // Group response tickets by agent
    const responseByAgent: Record<number, { assignedAt: Date; repliedAt: Date }[]> = {};
    for (const t of responseTickets) {
      if (t.repliedAt!.getTime() > t.assignedAt!.getTime()) {
        (responseByAgent[t.assignedTo!] ??= []).push({ assignedAt: t.assignedAt!, repliedAt: t.repliedAt! });
      }
    }

    const stats = agents.map((agent) => {
      const resp = responseByAgent[agent.id] ?? [];
      const avgResponseHours =
        resp.length > 0
          ? Math.round(
              (resp.reduce((sum, t) => sum + (t.repliedAt.getTime() - t.assignedAt.getTime()), 0) /
                resp.length /
                3_600_000) *
                10
            ) / 10
          : null;
      const rating = ratingMap[agent.id];
      return {
        agent,
        total: totalMap[agent.id] ?? 0,
        resolved: resolvedMap[agent.id] ?? 0,
        active: activeMap[agent.id] ?? 0,
        avgRating: rating?.avg ? Math.round(rating.avg * 10) / 10 : null,
        ratingCount: rating?.count ?? 0,
        avgResponseHours,
      };
    });

    // ── Manager performance stats ─────────────────────────────────
    const validAssigned = assignedTickets.filter((t) => t.assignedAt!.getTime() > t.createdAt.getTime());
    const avgAssignmentHours =
      validAssigned.length > 0
        ? Math.round(
            (validAssigned.reduce((sum, t) => sum + (t.assignedAt!.getTime() - t.createdAt.getTime()), 0) /
              validAssigned.length /
              3_600_000) *
              10
          ) / 10
        : null;
    const teamTotal    = validAssigned.length;
    const teamResolved = validAssigned.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
    const teamResolveRate = teamTotal > 0 ? Math.round((teamResolved / teamTotal) * 100) : 0;

    sendSuccess(res, {
      agents: stats,
      managerStats: { avgAssignmentHours, unassignedOpen, teamTotal, teamResolved, teamResolveRate },
    });
  },

  async bulkAssign(req: AdminRequest, res: Response): Promise<void> {
    const { ticketIds, agentId } = req.body as { ticketIds: string[]; agentId: number | null };

    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      sendError(res, 'VALIDATION_ERROR', 400);
      return;
    }
    // Guard: all IDs must be non-empty strings (no empty strings, numbers, or garbage)
    if (ticketIds.length > 200 || ticketIds.some((id) => typeof id !== 'string' || id.trim().length === 0)) {
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

  async myStats(req: AdminRequest, res: Response): Promise<void> {
    const id = req.admin!.id;
    const [total, resolved, active, ratingAgg] = await Promise.all([
      prisma.supportTicket.count({ where: { assignedTo: id } }),
      prisma.supportTicket.count({ where: { assignedTo: id, status: { in: ['RESOLVED', 'CLOSED'] } } }),
      prisma.supportTicket.count({ where: { assignedTo: id, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.supportTicket.aggregate({
        where: { assignedTo: id, rating: { not: null } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    const respondedTickets = (await prisma.supportTicket.findMany({
      where: { assignedTo: id, assignedAt: { not: null }, repliedAt: { not: null } },
      select: { assignedAt: true, repliedAt: true },
    })).filter((t) => t.repliedAt!.getTime() > t.assignedAt!.getTime());

    const avgResponseHours =
      respondedTickets.length > 0
        ? Math.round(
            (respondedTickets.reduce(
              (sum, t) => sum + (t.repliedAt!.getTime() - t.assignedAt!.getTime()),
              0
            ) / respondedTickets.length / 3_600_000) * 10
          ) / 10
        : null;

    sendSuccess(res, {
      total,
      resolved,
      active,
      avgRating: ratingAgg._avg.rating ? Math.round(ratingAgg._avg.rating * 10) / 10 : null,
      ratingCount: ratingAgg._count.rating,
      avgResponseHours,
    });
  },

  async managersStats(req: AdminRequest, res: Response): Promise<void> {
    if (req.admin!.role !== 'SUPER_ADMIN') {
      sendError(res, 'ADMIN_FORBIDDEN', 403);
      return;
    }

    const managers = await prisma.admin.findMany({
      where: { isActive: true, isDeleted: false, permissions: { has: 'support.manage' } },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
    });

    const unassignedOpen = await prisma.supportTicket.count({
      where: { status: 'OPEN', assignedTo: null },
    });

    const result = await Promise.all(managers.map(async (manager) => {
      const agents = await prisma.admin.findMany({
        where: { managerId: manager.id, isActive: true, isDeleted: false, permissions: { has: 'support.reply' } },
        select: { id: true },
      });
      const agentIds = agents.map((a) => a.id);

      if (agentIds.length === 0) {
        return { manager, teamSize: 0, teamTotal: 0, teamResolved: 0, teamResolveRate: 0, avgAssignmentHours: null };
      }

      const [teamTotal, teamResolved] = await Promise.all([
        prisma.supportTicket.count({ where: { assignedTo: { in: agentIds } } }),
        prisma.supportTicket.count({ where: { assignedTo: { in: agentIds }, status: { in: ['RESOLVED', 'CLOSED'] } } }),
      ]);

      const assignedTickets = (await prisma.supportTicket.findMany({
        where: { assignedTo: { in: agentIds }, assignedAt: { not: null } },
        select: { createdAt: true, assignedAt: true },
      })).filter((t) => t.assignedAt!.getTime() > t.createdAt.getTime());

      const avgAssignmentHours =
        assignedTickets.length > 0
          ? Math.round(
              (assignedTickets.reduce((sum, t) => sum + (t.assignedAt!.getTime() - t.createdAt.getTime()), 0) /
                assignedTickets.length /
                3_600_000) *
                10
            ) / 10
          : null;

      return {
        manager,
        teamSize: agentIds.length,
        teamTotal,
        teamResolved,
        teamResolveRate: teamTotal > 0 ? Math.round((teamResolved / teamTotal) * 100) : 0,
        avgAssignmentHours,
      };
    }));

    sendSuccess(res, { managers: result, globalUnassigned: unassignedOpen });
  },

  async escalate(req: AdminRequest, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const { note } = req.body as { note?: string };

    // Only agents (non-managers) with support.reply can escalate
    if (isManager(req.admin)) {
      sendError(res, 'ADMIN_FORBIDDEN', 403);
      return;
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id }, select: { assignedTo: true, escalatedAt: true, status: true } });
    if (!ticket) { sendError(res, 'NOT_FOUND', 404); return; }
    if (ticket.assignedTo !== req.admin!.id) { sendError(res, 'ADMIN_FORBIDDEN', 403); return; }
    if (ticket.escalatedAt) { sendError(res, 'ALREADY_ESCALATED', 400); return; }
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      sendError(res, 'TICKET_ALREADY_CLOSED', 400);
      return;
    }

    // Get the agent's manager
    const agent = await prisma.admin.findUnique({ where: { id: req.admin!.id }, select: { managerId: true } });
    if (!agent?.managerId) { sendError(res, 'NO_MANAGER_ASSIGNED', 400); return; }

    const [updated] = await Promise.all([
      prisma.supportTicket.update({
        where: { id },
        data: {
          escalatedAt: new Date(),
          escalatedBy: req.admin!.id,
          escalationNote: note?.trim() || null,
          escalatedToManager: agent.managerId,
          priority: 'HIGH',
        },
      }),
      // Notify the manager in-app
      createNotification(
        // AdminNotification: reuse user notification for manager (managerId maps to a User id only if same table — if separated, skip gracefully)
        agent.managerId,
        'support_escalated',
        'تيكت دعم تم تصعيده',
        `تيكت #${id} تم إرساله إليك من قِبل أحد الأعضاء${note?.trim() ? ` — ${note.trim().slice(0, 80)}` : ''}`,
        { route: '/support' }
      ).catch(() => null),
      req.admin ? adminAudit(req.admin.id, 'SUPPORT_ESCALATED', id, note?.trim() || '', req) : null,
    ]);

    sendSuccess(res, updated);
  },

  async bulkStatus(req: AdminRequest, res: Response): Promise<void> {
    if (!isManager(req.admin)) { sendError(res, 'ADMIN_FORBIDDEN', 403); return; }
    const { ticketIds, status } = req.body as { ticketIds: string[]; status: string };

    const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
    if (!Array.isArray(ticketIds) || ticketIds.length === 0 || ticketIds.length > 200) {
      sendError(res, 'VALIDATION_ERROR', 400); return;
    }
    if (ticketIds.some((id) => typeof id !== 'string' || id.trim().length === 0)) {
      sendError(res, 'VALIDATION_ERROR', 400); return;
    }
    if (!(VALID_STATUSES as readonly string[]).includes(status)) {
      sendError(res, 'INVALID_STATUS', 400); return;
    }

    const { count } = await prisma.supportTicket.updateMany({
      where: { id: { in: ticketIds } },
      data: { status: status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' },
    });

    if (req.admin) {
      await adminAudit(req.admin.id, 'SUPPORT_BULK_STATUS', undefined, `${count} tickets → ${status}`, req);
    }

    sendSuccess(res, { updated: count });
  },

  async listQuickReplies(_req: AdminRequest, res: Response): Promise<void> {
    const replies = await prisma.quickReply.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, content: true, createdAt: true },
    });
    sendSuccess(res, replies);
  },

  async createQuickReply(req: AdminRequest, res: Response): Promise<void> {
    const { title, content } = req.body as { title?: string; content?: string };
    if (!title?.trim() || !content?.trim()) { sendError(res, 'VALIDATION_ERROR', 400); return; }
    if (title.trim().length > 100) { sendError(res, 'VALIDATION_ERROR', 400); return; }
    if (content.trim().length > 2000) { sendError(res, 'VALIDATION_ERROR', 400); return; }

    const reply = await prisma.quickReply.create({
      data: { title: title.trim(), content: content.trim(), createdBy: req.admin!.id },
      select: { id: true, title: true, content: true, createdAt: true },
    });
    sendSuccess(res, reply, 201);
  },

  async deleteQuickReply(req: AdminRequest, res: Response): Promise<void> {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { sendError(res, 'VALIDATION_ERROR', 400); return; }
    await prisma.quickReply.delete({ where: { id } }).catch(() => null);
    sendSuccess(res, { ok: true });
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
