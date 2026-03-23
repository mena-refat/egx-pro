import type { Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { sendSuccess, sendError } from '../../lib/apiResponse.ts';
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
      singleAnalyses,
      compareAnalyses,
      recommendationAnalyses,
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
      // Single stock analysis: ticker has no '|' and is not '_recommendations'
      prisma.analysis.count({
        where: {
          AND: [
            { NOT: { ticker: { contains: '|' } } },
            { NOT: { ticker: { equals: '_recommendations' } } },
          ],
        },
      }),
      // Compare analysis: ticker contains '|'
      prisma.analysis.count({ where: { ticker: { contains: '|' } } }),
      // Recommendations analysis: ticker is '_recommendations'
      prisma.analysis.count({ where: { ticker: { equals: '_recommendations' } } }),
    ]);

    sendSuccess(res, {
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        newThisMonth: newUsersMonth,
        byPlan,
        activePaid,
      },
      analyses: {
        total: totalAnalyses,
        thisMonth: analysesMonth,
        bySingle: singleAnalyses,
        byCompare: compareAnalyses,
        byRecommendations: recommendationAnalyses,
      },
      predictions: { total: totalPredictions },
    });
  },

  async auditLogs(req: AdminRequest, res: Response): Promise<void> {
    const { page = '1', admin = '', action = '', from = '', to = '' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);

    // Use nested Prisma relation filter — no extra pre-query needed
    const where: Record<string, unknown> = {};
    if (admin.trim()) {
      where.admin = { email: { contains: admin.trim(), mode: 'insensitive' } };
    }
    if (action.trim()) where.action = action.trim().slice(0, 100);

    // Filter by date range — validate and cap at 365 days
    if (from || to) {
      const fromDate = from ? new Date(from) : null;
      const toDate   = to   ? new Date(to)   : null;
      if ((fromDate && isNaN(fromDate.getTime())) || (toDate && isNaN(toDate.getTime()))) {
        sendError(res, 'INVALID_DATE_RANGE', 400);
        return;
      }
      if (fromDate && toDate && fromDate > toDate) {
        sendError(res, 'INVALID_DATE_RANGE', 400);
        return;
      }
      if (fromDate && toDate) {
        const diffDays = (toDate.getTime() - fromDate.getTime()) / 86_400_000;
        if (diffDays > 365) {
          sendError(res, 'DATE_RANGE_TOO_LARGE', 400);
          return;
        }
      }
      const dateFilter: Record<string, Date> = {};
      if (fromDate) dateFilter.gte = fromDate;
      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
        dateFilter.lte = toDate;
      }
      where.createdAt = dateFilter;
    }

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

    const allActivePlanUsers = await prisma.user.findMany({
      where: {
        isDeleted: false,
        plan: { in: ['pro', 'yearly', 'ultra', 'ultra_yearly'] },
        OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }],
      },
      select: {
        id: true,
        plan: true,
        planExpiresAt: true,
        createdAt: true,
        planSetByAdmin: true,
        discountUsages: {
          include: { discountCode: { select: { type: true, value: true } } },
        },
      },
    });

    // Only include users who actually paid money:
    // - Not manually upgraded by admin
    // - paidAmount > 0 (no full/100% discount)
    const paidUsers = allActivePlanUsers.filter((user) => {
      if (user.planSetByAdmin) return false;
      const discount = user.discountUsages[0]?.discountCode ?? null;
      if (!discount) return true;
      const basePrice = PLAN_PRICES[user.plan] ?? 0;
      const paidAmount =
        discount.type === 'full'
          ? 0
          : discount.type === 'percentage'
          ? Math.round(basePrice * (1 - discount.value / 100))
          : discount.type === 'fixed'
          ? Math.max(0, basePrice - discount.value)
          : basePrice;
      return paidAmount > 0;
    });

    const [newPaidThisMonth, newPaidLastMonth, discountUsageStats] = await Promise.all([
      prisma.user.count({
        where: {
          isDeleted: false,
          plan: { in: ['pro', 'yearly', 'ultra', 'ultra_yearly'] },
          planSetByAdmin: false,
          updatedAt: { gte: monthStart },
        },
      }),
      prisma.user.count({
        where: {
          isDeleted: false,
          plan: { in: ['pro', 'yearly', 'ultra', 'ultra_yearly'] },
          planSetByAdmin: false,
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

    const d = new Date();
    const ranges = Array.from({ length: 12 }, (_, i) => {
      const offset = 11 - i;
      const start = new Date(d.getFullYear(), d.getMonth() - offset, 1);
      const end = new Date(d.getFullYear(), d.getMonth() - offset + 1, 0, 23, 59, 59);
      return { start, end, month: start.toISOString().slice(0, 7) };
    });

    // All 12 months in parallel instead of sequential awaits
    const results = await Promise.all(
      ranges.map(({ start, end }) =>
        prisma.user.findMany({
          where: {
            isDeleted: false,
            plan: { in: ['pro', 'yearly', 'ultra', 'ultra_yearly'] },
            planSetByAdmin: false,
            updatedAt: { gte: start, lte: end },
          },
          select: { plan: true },
        })
      )
    );

    const months = ranges.map(({ month }, idx) => {
      const newSubs = results[idx];
      const revenue = newSubs.reduce((acc, u) => acc + (monthlyPrices[u.plan] ?? 0), 0);
      return { month, newSubs: newSubs.length, estimatedRevenue: Math.round(revenue) };
    });

    sendSuccess(res, months);
  },

  async paidUsersList(req: AdminRequest, res: Response): Promise<void> {
    const { page = '1', plan = '', withDiscount = '', adminGrant = '' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const isSuperAdmin = req.admin?.role === 'SUPER_ADMIN';

    const now = new Date();
    const where: Record<string, unknown> = {
      isDeleted: false,
      plan: plan ? plan : { in: ['pro', 'yearly', 'ultra', 'ultra_yearly'] },
      OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }],
    };

    // Filter by admin grant status
    if (adminGrant === 'true') where.planSetByAdmin = true;
    else if (adminGrant === 'false') where.planSetByAdmin = false;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          ...(isSuperAdmin ? { id: true } : {}),
          email: true,
          phone: true,
          fullName: true,
          username: true,
          plan: true,
          planExpiresAt: true,
          planSetByAdmin: true,
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

      const paidAmount = u.planSetByAdmin
        ? 0
        : usedDiscount && discount?.type === 'percentage'
        ? Math.round(basePrice * (1 - discount.value / 100))
        : usedDiscount && discount?.type === 'fixed'
        ? Math.max(0, basePrice - discount.value)
        : usedDiscount && discount?.type === 'full'
        ? 0
        : basePrice;

      const base = {
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
        isAdminGrant: u.planSetByAdmin,
        isFreeUpgrade: !u.planSetByAdmin && paidAmount === 0,
      };

      return isSuperAdmin
        ? { ...base, id: (u as any).id as string }
        : base;
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

  async auditLogsExport(req: AdminRequest, res: Response): Promise<void> {
    const { admin = '', action = '', from = '', to = '' } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    if (admin.trim()) where.admin = { email: { contains: admin.trim(), mode: 'insensitive' } };
    if (action.trim()) where.action = action.trim().slice(0, 100);
    if (from || to) {
      const fromDate = from ? new Date(from) : null;
      const toDate   = to   ? new Date(to)   : null;
      if ((fromDate && isNaN(fromDate.getTime())) || (toDate && isNaN(toDate.getTime()))) {
        res.status(400).json({ error: 'INVALID_DATE_RANGE' }); return;
      }
      if (fromDate && toDate && fromDate > toDate) {
        res.status(400).json({ error: 'INVALID_DATE_RANGE' }); return;
      }
      if (fromDate && toDate && (toDate.getTime() - fromDate.getTime()) / 86_400_000 > 365) {
        res.status(400).json({ error: 'DATE_RANGE_TOO_LARGE' }); return;
      }
      const dateFilter: Record<string, Date> = {};
      if (fromDate) dateFilter.gte = fromDate;
      if (toDate) { toDate.setHours(23, 59, 59, 999); dateFilter.lte = toDate; }
      where.createdAt = dateFilter;
    }

    const logs = await prisma.adminAuditLog.findMany({
      where,
      include: { admin: { select: { email: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10_000,
    });

    const escape = (s: string | null | undefined) =>
      `"${(s ?? '').replace(/"/g, '""')}"`;

    const header = 'Date,Admin Email,Admin Name,Action,Target,Details,IP Hash,City';
    const rows = logs.map((l) =>
      [
        escape(new Date(l.createdAt).toISOString()),
        escape(l.admin?.email),
        escape(l.admin?.fullName),
        escape(l.action),
        escape(l.target),
        escape(l.details),
        escape(l.ipHash),
        escape((l as { city?: string | null }).city),
      ].join(',')
    );

    const csv = [header, ...rows].join('\n');
    const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM for Excel compatibility
  },

  async userGrowth(_req: AdminRequest, res: Response): Promise<void> {
    const d = new Date();
    const days = Array.from({ length: 30 }, (_, i) => {
      const offset = 29 - i;
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
      const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset + 1);
      return { start, end, date: start.toISOString().slice(0, 10) };
    });

    // All 30 days in parallel instead of sequential awaits
    const counts = await Promise.all(
      days.map(({ start, end }) =>
        prisma.user.count({ where: { isDeleted: false, createdAt: { gte: start, lt: end } } })
      )
    );

    sendSuccess(res, days.map(({ date }, i) => ({ date, count: counts[i] })));
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
      deletedUsers,
      churnedUsers,
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
      // Soft-deleted accounts (admin deleted or user self-deleted)
      prisma.user.count({ where: { isDeleted: true } }),
      // Was paid, didn't renew — plan expired and downgraded back to free
      prisma.user.count({
        where: {
          isDeleted: false,
          plan: 'free',
          planExpiresAt: { not: null, lt: now },
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
      deletedUsers,
      churnedUsers,
    });
  },

  async onboardingStats(_req: AdminRequest, res: Response): Promise<void> {
    const [
      totalUsers,
      completedUsers,
      byRisk,
      byHorizon,
      byBudget,
      bySharia,
    ] = await Promise.all([
      prisma.user.count({ where: { isDeleted: false } }),
      prisma.user.count({ where: { isDeleted: false, onboardingCompleted: true } }),
      prisma.user.groupBy({
        by: ['riskTolerance'],
        where: { isDeleted: false, onboardingCompleted: true },
        _count: { riskTolerance: true },
      }),
      prisma.user.groupBy({
        by: ['investmentHorizon'],
        where: { isDeleted: false, onboardingCompleted: true },
        _count: { investmentHorizon: true },
      }),
      prisma.user.groupBy({
        by: ['monthlyBudget'],
        where: { isDeleted: false, onboardingCompleted: true },
        _count: { monthlyBudget: true },
      }),
      prisma.user.groupBy({
        by: ['shariaMode'],
        where: { isDeleted: false, onboardingCompleted: true },
        _count: { shariaMode: true },
      }),
    ]);

    // Aggregate JSON fields (sectors, goal, level, hearAboutUs) in TS
    const users = await prisma.user.findMany({
      where: { isDeleted: false, onboardingCompleted: true },
      select: { interestedSectors: true, investorProfile: true, hearAboutUs: true },
    });

    const sectors: Record<string, number> = {};
    const goals: Record<string, number> = {};
    const levels: Record<string, number> = {};
    const hear: Record<string, number> = {};

    for (const u of users) {
      // sectors — stored as string[] JSON
      if (Array.isArray(u.interestedSectors)) {
        for (const s of u.interestedSectors as string[]) {
          sectors[s] = (sectors[s] ?? 0) + 1;
        }
      }
      // investorProfile JSON
      const p = u.investorProfile as Record<string, unknown> | null;
      if (p) {
        if (typeof p.goal  === 'string') goals[p.goal]   = (goals[p.goal]   ?? 0) + 1;
        if (typeof p.level === 'string') levels[p.level] = (levels[p.level] ?? 0) + 1;
      }
      // hearAboutUs — comma-separated string on the User model
      if (u.hearAboutUs) {
        for (const src of u.hearAboutUs.split(',').map((s) => s.trim()).filter(Boolean)) {
          hear[src] = (hear[src] ?? 0) + 1;
        }
      }
    }

    sendSuccess(res, {
      totalUsers,
      completedOnboarding: completedUsers,
      completionRate: totalUsers > 0 ? Math.round((completedUsers / totalUsers) * 100) : 0,
      riskTolerance: Object.fromEntries(byRisk.map((r) => [r.riskTolerance, r._count.riskTolerance])),
      investmentHorizon: Object.fromEntries(byHorizon.map((h) => [String(h.investmentHorizon), h._count.investmentHorizon])),
      monthlyBudget: Object.fromEntries(byBudget.map((b) => [String(b.monthlyBudget), b._count.monthlyBudget])),
      shariaMode: {
        yes: bySharia.find((s) => s.shariaMode)?._count.shariaMode ?? 0,
        no:  bySharia.find((s) => !s.shariaMode)?._count.shariaMode ?? 0,
      },
      sectors,
      goals,
      levels,
      hearAboutUs: hear,
    });
  },
};


