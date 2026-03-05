import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.ts';

const router = Router();

type Plan = 'free' | 'pro' | 'annual';

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

router.get('/plan', async (req: Request, res: Response) => {
  try {
    const userId = ('user' in req && (req as { user?: { id?: string } }).user?.id);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionPlan: true,
        subscriptionEndsAt: true,
        analysisUsageMonth: true,
        analysisUsageCount: true,
        referralProDaysRemaining: true,
        referralProExpiresAt: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'not_found' });

    const monthKey = getCurrentMonthKey();
    const usedThisMonth =
      user.analysisUsageMonth === monthKey ? user.analysisUsageCount : 0;

    const now = new Date();
    const hasReferralPro =
      !!user.referralProExpiresAt && user.referralProExpiresAt > now;

    const effectivePlan: Plan =
      (user.subscriptionPlan as Plan) === 'pro' || (user.subscriptionPlan as Plan) === 'annual'
        ? (user.subscriptionPlan as Plan)
        : hasReferralPro
        ? 'pro'
        : 'free';

    const quota =
      effectivePlan === 'free'
        ? 3
        : Infinity;

    res.json({
      plan: effectivePlan,
      subscriptionEndsAt: user.subscriptionEndsAt,
      analysis: {
        month: monthKey,
        used: usedThisMonth,
        quota,
      },
      referralPro: {
        daysRemaining: user.referralProDaysRemaining ?? 0,
        expiresAt: user.referralProExpiresAt,
      },
    });
  } catch (error) {
    console.error('Billing /plan error:', error);
    res.status(500).json({ error: 'Failed to load plan' });
  }
});
//@ Validate discount code for a given plan
router.post('/discount/validate', async (req: Request, res: Response) => {
  try {
    const userId = ('user' in req && (req as { user?: { id?: string } }).user?.id);
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

    const basePrice = plan === 'pro' ? 149 : 999;
    let finalPrice = basePrice;

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
    console.error('Billing /discount/validate error:', error);
    res.status(500).json({ error: 'Failed to validate discount' });
  }
});

// Upgrade endpoint with optional discount code (no real payment integration)
router.post('/upgrade', async (req: Request, res: Response) => {
  try {
    const userId = ('user' in req && (req as { user?: { id?: string } }).user?.id);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const { plan, discountCode } = req.body as { plan: Plan; discountCode?: string };
    if (!['pro', 'annual'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
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

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: plan,
        subscriptionEndsAt: endsAt,
      },
      select: {
        subscriptionPlan: true,
        subscriptionEndsAt: true,
      },
    });

    res.json({
      ...updated,
      discountApplied: Boolean(appliedDiscount),
    });
  } catch (error) {
    console.error('Billing /upgrade error:', error);
    res.status(500).json({ error: 'Failed to upgrade plan' });
  }
});

export default router;

