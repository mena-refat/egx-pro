import { UserRepository } from '../repositories/user.repository.ts';
import { DiscountRepository } from '../repositories/discount.repository.ts';
import { isPro, getLimit } from '../lib/plan.ts';
import { PLAN_PRICES } from '../lib/constants.ts';
import { AppError } from '../lib/errors.ts';
import { PaymobService } from './paymob.service.ts';

type Plan = 'free' | 'pro' | 'annual' | 'ultra' | 'ultra_annual';
export type PlanUpgrade = 'pro_monthly' | 'pro_yearly' | 'ultra_monthly' | 'ultra_yearly' | 'pro' | 'annual';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function resolvePlan(plan: PlanUpgrade): { planValue: 'pro' | 'yearly' | 'ultra' | 'ultra_yearly'; durationMs: number } {
  if (plan === 'ultra_yearly') return { planValue: 'ultra_yearly', durationMs: ONE_YEAR_MS };
  if (plan === 'ultra_monthly') return { planValue: 'ultra', durationMs: THIRTY_DAYS_MS };
  if (plan === 'pro_yearly' || plan === 'annual') return { planValue: 'yearly', durationMs: ONE_YEAR_MS };
  return { planValue: 'pro', durationMs: THIRTY_DAYS_MS };
}

function getBasePrice(planValue: 'pro' | 'yearly' | 'ultra' | 'ultra_yearly'): number {
  if (planValue === 'ultra_yearly') return PLAN_PRICES.ultra_yearly;
  if (planValue === 'ultra') return PLAN_PRICES.ultra;
  if (planValue === 'yearly') return PLAN_PRICES.yearly;
  return PLAN_PRICES.pro;
}

export const BillingService = {
  async getPlan(userId: number) {
    if (!userId) throw new AppError('UNAUTHORIZED', 401);
    const user = await UserRepository.getForBillingPlan(userId);
    if (!user) throw new AppError('NOT_FOUND', 404);
    const now = new Date();
    const monthKey = getCurrentMonthKey();
    const resetDate = user.aiAnalysisResetDate;
    const inCurrentPeriod = resetDate != null && now < resetDate;
    const usedNew = user.aiAnalysisUsedThisMonth ?? 0;
    const usedThisMonth = inCurrentPeriod ? usedNew : 0;
    const p = user.plan || 'free';
    const effectivePlan: Plan =
      p === 'ultra_yearly' ? 'ultra_annual' : p === 'ultra' ? 'ultra' : isPro(user) ? (p === 'yearly' ? 'annual' : 'pro') : 'free';
    const quotaRaw = getLimit(user, 'aiAnalysisPerMonth');
    const quota = typeof quotaRaw === 'number' ? quotaRaw : 0;
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

  async validateDiscount(userId: number, code: string, plan?: Plan) {
    if (!userId) throw new AppError('UNAUTHORIZED', 401);
    if (!code?.trim()) throw new AppError('INVALID_REQUEST', 400);
    const discount = await DiscountRepository.findByCode(code.trim());
    if (
      !discount ||
      !discount.active ||
      (discount.expiresAt != null && discount.expiresAt < new Date()) ||
      (discount.maxUses != null && discount.usedCount >= discount.maxUses)
    ) {
      throw new AppError('INVALID_DISCOUNT_CODE', 400);
    }
    const used = await DiscountRepository.findUsage(userId, discount.id);
    if (used) throw new AppError('DISCOUNT_ALREADY_USED', 400);

    // منع تطبيق كود جديد لو الاشتراك المفعَّل بكود سابق لسه شغال
    const activeDiscount = await DiscountRepository.hasActiveDiscount(userId);
    if (activeDiscount) throw new AppError('DISCOUNT_ALREADY_ACTIVE', 400);

    const planKey = plan === 'ultra_annual' ? 'ultra_yearly' : plan === 'ultra' ? 'ultra' : plan === 'annual' ? 'yearly' : 'pro';
    const basePrice: number = getBasePrice(planKey as 'pro' | 'yearly' | 'ultra' | 'ultra_yearly');
    let finalPrice: number = basePrice;
    if (discount.type === 'percentage') {
      finalPrice = Math.round(basePrice * (1 - discount.value / 100));
    } else if (discount.type === 'amount') {
      finalPrice = Math.max(0, basePrice - discount.value);
    }
    const discountAmount = basePrice - finalPrice;
    const percent =
      discount.type === 'percentage'
        ? discount.value
        : Math.round((discountAmount / basePrice) * 100);

    return {
      valid: true,
      percent,
      code: discount.code,
      type: discount.type,
      value: discount.value,
      basePrice,
      finalPrice,
      discountAmount,
    };
  },

  async upgrade(
    userId: number,
    plan: PlanUpgrade,
    options: { discountCode?: string; paymentToken?: string }
  ) {
    if (!userId) throw new AppError('UNAUTHORIZED', 401);
    if (!['pro_monthly', 'pro_yearly', 'ultra_monthly', 'ultra_yearly', 'pro', 'annual'].includes(plan)) {
      throw new AppError('INVALID_PLAN', 400);
    }

    const { planValue, durationMs } = resolvePlan(plan as PlanUpgrade);
    const planExpiresAt = new Date(Date.now() + durationMs);

    let discountPercent = 0;
    let discount: { id: string; type: string; value: number; maxUses: number | null } | null = null;

    if (options.discountCode?.trim()) {
      const code = await DiscountRepository.findByCode(options.discountCode.trim());
      if (
        !code ||
        !code.active ||
        (code.expiresAt != null && code.expiresAt < new Date()) ||
        (code.maxUses != null && code.usedCount >= code.maxUses)
      ) {
        throw new AppError('INVALID_DISCOUNT_CODE', 400);
      }
      const alreadyUsed = await DiscountRepository.findUsage(userId, code.id);
      if (alreadyUsed) throw new AppError('DISCOUNT_ALREADY_USED', 400);

      const activeDiscount = await DiscountRepository.hasActiveDiscount(userId);
      if (activeDiscount) throw new AppError('DISCOUNT_ALREADY_ACTIVE', 400);

      discount = { id: code.id, type: code.type, value: code.value, maxUses: code.maxUses };
      const basePrice = getBasePrice(planValue);
      if (code.type === 'percentage') {
        discountPercent = code.value;
      } else {
        discountPercent = Math.min(100, Math.round((code.value / basePrice) * 100));
      }

      if (discountPercent >= 100) {
        await DiscountRepository.applyFullDiscount(
          userId,
          planValue,
          planExpiresAt,
          code.id,
          code.maxUses
        );
        return { success: true };
      }
    }

    if (discountPercent < 100 && !options.paymentToken) {
      throw new AppError('PAYMENT_TOKEN_REQUIRED', 400);
    }

    const basePrice = getBasePrice(planValue);
    const finalPrice = Math.round(basePrice * (1 - discountPercent / 100));

    // Verify payment with Paymob before activating the plan
    const payment = await PaymobService.verifyTransaction(options.paymentToken!, finalPrice);
    if (!payment.valid) {
      throw new AppError('PAYMENT_VERIFICATION_FAILED', 400);
    }

    await DiscountRepository.applyUpgrade(
      userId,
      planValue,
      planExpiresAt,
      discount ? { id: discount.id, maxUses: discount.maxUses } : undefined,
      { paymobId: options.paymentToken!, amountEGP: payment.amountEGP }
    );

    return { success: true };
  },
};
