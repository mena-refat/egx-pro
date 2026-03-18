import type { Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { sendSuccess, sendError } from '../../lib/apiResponse.ts';
import { adminAudit, type AdminRequest } from '../../middleware/adminAuth.middleware.ts';
import { deleteCache } from '../../lib/redis.ts';

export const AdminUsersController = {
  async list(req: AdminRequest, res: Response): Promise<void> {
    const {
      page = '1',
      limit = '20',
      search = '',
      plan = '',
      sort = 'createdAt',
      order = 'desc',
    } = req.query as Record<string, string>;
    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = { isDeleted: false };

    if (search.trim()) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (plan) {
      where.plan = plan;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          phone: true,
          fullName: true,
          username: true,
          plan: true,
          planExpiresAt: true,
          createdAt: true,
          lastLoginAt: true,
          isEmailVerified: true,
          isDeleted: true,
          aiAnalysisUsedThisMonth: true,
          _count: {
            select: {
              portfolios: true,
              analyses: true,
              predictions: true,
            },
          },
        },
        orderBy: { [sort]: (order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    sendSuccess(res, {
      users,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  },

  async getOne(req: AdminRequest, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            portfolios: true,
            analyses: true,
            predictions: true,
            goals: true,
            watchlists: true,
          },
        },
        referralsSent: {
          select: { id: true, status: true, createdAt: true },
        },
      },
    });
    if (!user) {
      sendError(res, 'NOT_FOUND', 404);
      return;
    }
    sendSuccess(res, user);
  },

  async updatePlan(req: AdminRequest, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const { plan, planExpiresAt } = req.body as { plan?: string; planExpiresAt?: string };
    if (!plan) {
      sendError(res, 'VALIDATION_ERROR', 400);
      return;
    }
    const validPlans = ['free', 'pro', 'yearly', 'ultra', 'ultra_yearly'];
    if (!validPlans.includes(plan)) {
      sendError(res, 'INVALID_PLAN', 400);
      return;
    }

    await prisma.user.update({
      where: { id },
      data: {
        plan,
        planExpiresAt: planExpiresAt ? new Date(planExpiresAt) : null,
        // Mark as admin-granted so it's excluded from revenue calculations
        planSetByAdmin: plan !== 'free',
      },
    });
    await deleteCache(`auth:user:${id}`).catch(() => null);
    if (req.admin) {
      await adminAudit(req.admin.id, 'USER_PLAN_UPDATED', id, `plan → ${plan}`, req);
    }
    sendSuccess(res, { ok: true });
  },

  async toggleDelete(req: AdminRequest, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const user = await prisma.user.findUnique({
      where: { id },
      select: { isDeleted: true },
    });
    if (!user) {
      sendError(res, 'NOT_FOUND', 404);
      return;
    }
    const newState = !user.isDeleted;
    await prisma.user.update({
      where: { id },
      data: { isDeleted: newState, deletedAt: newState ? new Date() : null },
    });
    await deleteCache(`auth:user:${id}`).catch(() => null);
    if (req.admin) {
      await adminAudit(
        req.admin.id,
        newState ? 'USER_DEACTIVATED' : 'USER_REACTIVATED',
        id,
        undefined,
        req
      );
    }
    sendSuccess(res, { isDeleted: newState });
  },

  async stats(_req: AdminRequest, res: Response): Promise<void> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, byPlan, newToday, newThisMonth] = await Promise.all([
      prisma.user.count({ where: { isDeleted: false } }),
      prisma.user.groupBy({
        by: ['plan'],
        where: { isDeleted: false },
        _count: { plan: true },
      }),
      prisma.user.count({
        where: { isDeleted: false, createdAt: { gte: todayStart } },
      }),
      prisma.user.count({
        where: { isDeleted: false, createdAt: { gte: monthStart } },
      }),
    ]);

    sendSuccess(res, { total, byPlan, newToday, newThisMonth });
  },
};

