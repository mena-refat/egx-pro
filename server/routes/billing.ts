import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.ts';
import { isPro, FREE_LIMITS } from '../lib/plan.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import type { AuthRequest } from './types.ts';
import { auditLog } from '../lib/audit.ts';
import { logger } from '../lib/logger.ts';
import { PLAN_PRICES } from '../lib/constants.ts';

const router = Router();

type Plan = 'free' | 'pro' | 'annual';

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

router.get('/plan', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        planExpiresAt: true,
        aiAnalysisUsedThisMonth: true,
        aiAnalysisResetDate: true,
        referralProDaysRemaining: true,
        referralProExpiresAt: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'not_found' });

    const now = new Date();
    const effectivePro = isPro(user);
    const monthKey = getCurrentMonthKey();
    const resetDate = user.aiAnalysisResetDate;
    const inCurrentPeriod = resetDate != null && now < resetDate;
    const usedNew = user.aiAnalysisUsedThisMonth ?? 0;
    const usedThisMonth = inCurrentPeriod ? usedNew : 0;

    const effectivePlan: Plan =
      effectivePro
        ? (user.plan === 'yearly' ? 'annual' : 'pro')
        : 'free';

    const quota =
      effectivePro ? Infinity : FREE_LIMITS.aiAnalysisPerMonth;

    res.json({
      plan: effectivePlan,
      planExpiresAt: user.planExpiresAt,
      analysis: {
        month: monthKey,
        used: usedThisMonth,
        quota,
        aiAnalysisResetDate: user.aiAnalysisResetDate,
      },
      referralPro: {
        daysRemaining: user.referralProDaysRemaining ?? 0,
        expiresAt: user.referralProExpiresAt,
      },
    });
  } catch (error) {
    logger.error('Billing /plan error', { error });
    res.status(500).json({ error: 'Failed to load plan' });
  }
});
//@ Validate discount code for a given plan
router.post('/discount/validate', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const { code, plan } = req.body as { code?: string; plan?: Plan };
    if (!code || !plan || !['pro', 'annual'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const discount = await prisma.discountCode.findUnique({
      where: { code },
    });

    if (
      !discount ||
      !discount.active ||
      (discount.expiresAt && discount.expiresAt < new Date()) ||
      (discount.maxUses !== null && discount.maxUses !== undefined && discount.usedCount >= discount.maxUses)
    ) {
      return res.status(400).json({ error: 'الكود غير صحيح أو منتهي' });
    }

    const basePrice = plan === 'pro' ? PLAN_PRICES.pro : PLAN_PRICES.yearly;
    let finalPrice: number = basePrice;

    if (discount.type === 'percentage') {
      finalPrice = Math.round(basePrice * (1 - discount.value / 100));
    } else if (discount.type === 'amount') {
      finalPrice = Math.max(0, basePrice - discount.value);
    }

    const discountAmount = basePrice - finalPrice;

    res.json({
      valid: true,
      code: discount.code,
      type: discount.type,
      value: discount.value,
      basePrice,
      finalPrice,
      discountAmount,
    });
  } catch (error) {
    logger.error('Billing /discount/validate error', { error });
    res.status(500).json({ error: 'Failed to validate discount' });
  }
});

// Upgrade endpoint with optional discount code (no real payment integration)
router.post('/upgrade', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const { plan, discountCode } = req.body as { plan: Plan; discountCode?: string };
    if (!['pro', 'annual'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, planExpiresAt: true },
    });
    if (
      currentUser?.plan === 'yearly' &&
      plan === 'pro' &&
      currentUser.planExpiresAt &&
      currentUser.planExpiresAt > new Date()
    ) {
      return res.status(400).json({ error: 'لا يمكن التحويل من سنوي لشهري أثناء الاشتراك النشط' });
    }

    let appliedDiscount: { id: string } | null = null;

    if (discountCode) {
      const discount = await prisma.discountCode.findUnique({
        where: { code: discountCode },
      });

      if (
        !discount ||
        !discount.active ||
        (discount.expiresAt && discount.expiresAt < new Date()) ||
        (discount.maxUses !== null && discount.maxUses !== undefined && discount.usedCount >= discount.maxUses)
      ) {
        return res.status(400).json({ error: 'الكود غير صحيح أو منتهي' });
      }

      appliedDiscount = { id: discount.id };

      await prisma.discountCode.update({
        where: { id: discount.id },
        data: { usedCount: discount.usedCount + 1 },
      });
    }

    const now = new Date();
    const endsAt = new Date(now);
    if (plan === 'pro') {
      endsAt.setMonth(endsAt.getMonth() + 1);
    } else {
      endsAt.setFullYear(endsAt.getFullYear() + 1);
    }

    const planValue = plan === 'annual' ? 'yearly' : plan;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        plan: planValue,
        planExpiresAt: endsAt,
      },
      select: {
        plan: true,
        planExpiresAt: true,
      },
    });

    await auditLog({
      userId,
      action: 'SUBSCRIPTION_UPGRADE',
      details: `Upgraded to ${plan}${appliedDiscount ? ` with discount ${discountCode}` : ''}`,
      result: 'success',
      req: { ip: req.ip, headers: req.headers as { 'user-agent'?: string } },
    });

    res.json({
      ...updated,
      discountApplied: Boolean(appliedDiscount),
    });
  } catch (error) {
    logger.error('Billing /upgrade error', { error });
    res.status(500).json({ error: 'Failed to upgrade plan' });
  }
});

export default router;

