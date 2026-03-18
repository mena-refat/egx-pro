import type { Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { sendSuccess } from '../../lib/apiResponse.ts';
import type { AdminRequest } from '../../middleware/adminAuth.middleware.ts';

export const AdminAnalyticsController = {
  async overview(_req: AdminRequest, res: Response): Promise<void> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers,
      newUsersToday,
      newUsersMonth,
      totalAnalyses,
      analysesMonth,
      totalPredictions,
      byPlan,
      activePaid,
    ] = await Promise.all([
      prisma.user.count({ where: { isDeleted: false } }),
      prisma.user.count({
        where: { isDeleted: false, createdAt: { gte: todayStart } },
      }),
      prisma.user.count({
        where: { isDeleted: false, createdAt: { gte: monthStart } },
      }),
      prisma.analysis.count(),
      prisma.analysis.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.prediction.count(),
      prisma.user.groupBy({
        by: ['plan'],
        where: { isDeleted: false },
        _count: { plan: true },
      }),
      prisma.user.count({
        where: {
          isDeleted: false,
          plan: { in: ['pro', 'yearly', 'ultra', 'ultra_yearly'] },
          planExpiresAt: { gt: now },
        },
      }),
    ]);

    sendSuccess(res, {
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        newThisMonth: newUsersMonth,
        byPlan,
        activePaid,
      },
      analyses: { total: totalAnalyses, thisMonth: analysesMonth },
      predictions: { total: totalPredictions },
    });
  },

  async auditLogs(req: AdminRequest, res: Response): Promise<void> {
    const { page = '1', adminId = '' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const where = adminId ? { adminId } : {};

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        include: {
          admin: { select: { email: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * 50,
        take: 50,
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    sendSuccess(res, { logs, total, page: pageNum });
  },
};

