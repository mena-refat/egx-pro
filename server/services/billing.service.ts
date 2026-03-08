import { prisma } from '../lib/prisma.ts';
import { isPro, FREE_LIMITS } from '../lib/plan.ts';
import { PLAN_PRICES } from '../lib/constants.ts';
import { AppError } from '../lib/errors.ts';
import { UserRepository } from '../repositories/user.repository.ts';

type Plan = 'free' | 'pro' | 'annual';

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export const BillingService = {
  async getPlan(userId: string) {
    if (!userId) throw new AppError('UNAUTHORIZED', 401);
    const user = await UserRepository.getForBillingPlan(userId);
    if (!user) throw new AppError('NOT_FOUND', 404);
    const now = new Date();
    const effectivePro = isPro(user);
    const monthKey = getCurrentMonthKey();
    const resetDate = user.aiAnalysisResetDate;
    const inCurrentPeriod = resetDate != null && now < resetDate;
    const usedNew = user.aiAnalysisUsedThisMonth ?? 0;
    const usedThisMonth = inCurrentPeriod ? usedNew : 0;
    const effectivePlan: Plan = effectivePro ? (user.plan === 'yearly' ? 'annual' : 'pro') : 'free';
    const quota = effectivePro ? Infinity : FREE_LIMITS.aiAnalysisPerMonth;
    return {
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
    };
  },

  async validateDiscount(userId: string, code: string, plan: Plan) {
    if (!userId) throw new AppError('UNAUTHORIZED', 401);
    if (!code || !plan || !['pro', 'annual'].includes(plan)) throw new AppError('INVALID_REQUEST', 400);
    const discount = await prisma.discountCode.findUnique({ where: { code } });
    if (
      !discount ||
      !discount.active ||
      (discount.expiresAt != null && discount.expiresAt < new Date()) ||
      (discount.maxUses != null && discount.usedCount >= discount.maxUses)
    ) {
      throw new AppError('DISCOUNT_INVALID', 400);
    }
    const basePrice = plan === 'pro' ? PLAN_PRICES.pro : PLAN_PRICES.yearly;
    let finalPrice: number = basePrice;
    if (discount.type === 'percentage') {
      finalPrice = Math.round(basePrice * (1 - discount.value / 100));
    } else if (discount.type === 'amount') {
      finalPrice = Math.max(0, basePrice - discount.value);
    }
    const discountAmount: number = basePrice - finalPrice;
    return { valid: true, code: discount.code, type: discount.type, value: discount.value, basePrice, finalPrice, discountAmount };
  },

  async upgrade(userId: string, plan: Plan, discountCode?: string) {
    if (!userId) throw new AppError('UNAUTHORIZED', 401);
    if (!['pro', 'annual'].includes(plan)) throw new AppError('INVALID_REQUEST', 400);
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, planExpiresAt: true },
    });
    if (
      currentUser?.plan === 'yearly' &&
      plan === 'pro' &&
      currentUser.planExpiresAt != null &&
      currentUser.planExpiresAt > new Date()
    ) {
      throw new AppError('UPGRADE_DOWNGRADE_BLOCKED', 400);
    }
    let appliedDiscount: { id: string } | null = null;
    if (discountCode) {
      const discount = await prisma.discountCode.findUnique({ where: { code: discountCode } });
      if (
        !discount ||
        !discount.active ||
        (discount.expiresAt != null && discount.expiresAt < new Date()) ||
        (discount.maxUses != null && discount.usedCount >= discount.maxUses)
      ) {
        throw new AppError('DISCOUNT_INVALID', 400);
      }
      appliedDiscount = { id: discount.id };
      await prisma.discountCode.update({
        where: { id: discount.id },
        data: { usedCount: discount.usedCount + 1 },
      });
    }
    const now = new Date();
    const endsAt = new Date(now);
    if (plan === 'pro') endsAt.setMonth(endsAt.getMonth() + 1);
    else endsAt.setFullYear(endsAt.getFullYear() + 1);
    const planValue = plan === 'annual' ? 'yearly' : plan;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { plan: planValue, planExpiresAt: endsAt },
      select: { plan: true, planExpiresAt: true },
    });
    return { ...updated, discountApplied: Boolean(appliedDiscount) };
  },
};
