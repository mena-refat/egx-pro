import type { Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { sendSuccess } from '../../lib/apiResponse.ts';
import type { AdminRequest } from '../../middleware/adminAuth.middleware.ts';

const PLAN_PRICES: Record<string, number> = {
  pro: 189,
  yearly: 1890,
  ultra: 397,
  ultra_yearly: 3970,
};

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

  async revenueOverview(_req: AdminRequest, res: Response): Promise<void> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const paidUsers = await prisma.user.findMany({
      where: {
        isDeleted: false,
        plan: { in: ['pro', 'yearly', 'ultra', 'ultra_yearly'] },
        OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }],
      },
      select: { id: true, plan: true, planExpiresAt: true, createdAt: true },
    });

    const [newPaidThisMonth, newPaidLastMonth, discountUsageStats] = await Promise.all([
      prisma.user.count({
        where: {
          isDeleted: false,
          plan: { in: ['pro', 'yearly', 'ultra', 'ultra_yearly'] },
          updatedAt: { gte: monthStart },
        },
      }),
      prisma.user.count({
        where: {
          isDeleted: false,
          plan: { in: ['pro', 'yearly', 'ultra', 'ultra_yearly'] },
          updatedAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
      prisma.discountUsage.groupBy({
        by: ['codeId'],
        _count: { codeId: true },
        orderBy: { _count: { codeId: 'desc' } },
        take: 10,
      }),
    ]);

    let mrr = 0;
    const byPlanRevenue: Record<string, { count: number; mrr: number; arr: number }> = {};

    for (const user of paidUsers) {
      const plan = user.plan;
      const price = PLAN_PRICES[plan] ?? 0;
      const isYearly = plan.includes('yearly');
      const monthlyValue = isYearly ? price / 12 : price;

      mrr += monthlyValue;
      if (!byPlanRevenue[plan]) {
        byPlanRevenue[plan] = { count: 0, mrr: 0, arr: 0 };
      }
      byPlanRevenue[plan].count += 1;
      byPlanRevenue[plan].mrr += monthlyValue;
      byPlanRevenue[plan].arr += isYearly ? price : price * 12;
    }

    const arr = mrr * 12;

    const freeUpgrades = await prisma.discountUsage.count();

    const topCodes = await Promise.all(
      discountUsageStats.map(async (d) => {
        const code = await prisma.discountCode.findUnique({
          where: { id: d.codeId },
          select: { code: true, type: true, value: true },
        });
        return code
          ? {
              code: code.code,
              type: code.type,
              value: code.value,
              uses: d._count.codeId,
            }
          : null;
      }),
    );

    sendSuccess(res, {
      mrr: Math.round(mrr),
      arr: Math.round(arr),
      totalPaidUsers: paidUsers.length,
      newPaidThisMonth,
      newPaidLastMonth,
      freeUpgrades,
      byPlan: byPlanRevenue,
      topDiscountCodes: topCodes.filter((c): c is NonNullable<typeof c> => Boolean(c)),
    });
  },

  async revenueChart(_req: AdminRequest, res: Response): Promise<void> {
    const monthlyPrices: Record<string, number> = {
      pro: PLAN_PRICES.pro,
      yearly: PLAN_PRICES.yearly / 12,
      ultra: PLAN_PRICES.ultra,
      ultra_yearly: PLAN_PRICES.ultra_yearly / 12,
    };

    const months: { month: string; newSubs: number; estimatedRevenue: number }[] = [];

    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date();
      const start = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() - i + 1, 0, 23, 59, 59);

      const newSubs = await prisma.user.findMany({
        where: {
          isDeleted: false,
          plan: { in: ['pro', 'yearly', 'ultra', 'ultra_yearly'] },
          updatedAt: { gte: start, lte: end },
        },
        select: { plan: true },
      });

      const revenue = newSubs.reduce(
        (acc, u) => acc + (monthlyPrices[u.plan] ?? 0),
        0,
      );

      months.push({
        month: start.toISOString().slice(0, 7),
        newSubs: newSubs.length,
        estimatedRevenue: Math.round(revenue),
      });
    }

    sendSuccess(res, months);
  },

  async paidUsersList(req: AdminRequest, res: Response): Promise<void> {
    const { page = '1', plan = '', withDiscount = '' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);

    const now = new Date();
    const where: Record<string, unknown> = {
      isDeleted: false,
      plan: plan ? plan : { in: ['pro', 'yearly', 'ultra', 'ultra_yearly'] },
      OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }],
    };

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
          updatedAt: true,
          discountUsages: {
            include: { discountCode: { select: { code: true, type: true, value: true } } },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (pageNum - 1) * 20,
        take: 20,
      }),
      prisma.user.count({ where }),
    ]);

    const enriched = users.map((u) => {
      const usedDiscount = u.discountUsages.length > 0;
      const discount = u.discountUsages[0]?.discountCode ?? null;
      const basePrice = PLAN_PRICES[u.plan] ?? 0;

      const paidAmount =
        usedDiscount && discount?.type === 'percentage'
          ? Math.round(basePrice * (1 - discount.value / 100))
          : usedDiscount && discount?.type === 'fixed'
          ? Math.max(0, basePrice - discount.value)
          : usedDiscount && discount?.type === 'full'
          ? 0
          : basePrice;

      return {
        id: u.id,
        email: u.email,
        phone: u.phone,
        fullName: u.fullName,
        username: u.username,
        plan: u.plan,
        planExpiresAt: u.planExpiresAt,
        subscribedAt: u.updatedAt,
        basePrice,
        paidAmount,
        usedDiscount,
        discountCode: discount?.code ?? null,
        isFreeUpgrade: paidAmount === 0,
      };
    });

    const filtered =
      withDiscount === 'true'
        ? enriched.filter((u) => u.usedDiscount)
        : withDiscount === 'false'
        ? enriched.filter((u) => !u.usedDiscount)
        : enriched;

    sendSuccess(res, {
      users: filtered,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / 20),
    });
  },

  async platformHealth(_req: AdminRequest, res: Response): Promise<void> {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      activeUsersToday,
      activeUsers7d,
      analysesToday,
      predictionsToday,
      openTickets,
      expiringSoon,
      churnRisk,
    ] = await Promise.all([
      prisma.user.count({
        where: { isDeleted: false, lastLoginAt: { gte: last24h } },
      }),
      prisma.user.count({
        where: { isDeleted: false, lastLoginAt: { gte: last7d } },
      }),
      prisma.analysis.count({
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.prediction.count({
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      prisma.user.count({
        where: {
          isDeleted: false,
          plan: { in: ['pro', 'yearly', 'ultra', 'ultra_yearly'] },
          planExpiresAt: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.user.count({
        where: {
          isDeleted: false,
          plan: { in: ['pro', 'yearly', 'ultra', 'ultra_yearly'] },
          lastLoginAt: {
            lt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    sendSuccess(res, {
      activeUsersToday,
      activeUsers7d,
      analysesToday,
      predictionsToday,
      openTickets,
      expiringSoon,
      churnRisk,
    });
  },
};


