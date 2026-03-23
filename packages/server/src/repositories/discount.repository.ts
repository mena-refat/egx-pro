import { prisma } from '../lib/prisma.ts';
import { AppError } from '../lib/errors.ts';

export const DiscountRepository = {
  findByCode(code: string) {
    return prisma.discountCode.findUnique({ where: { code } });
  },

  findUsage(userId: number, codeId: string) {
    return prisma.discountUsage.findUnique({
      where: { userId_codeId: { userId, codeId } },
    });
  },

  /** هل عند اليوزر ده اشتراك مفعَّل بكود خصم لسه ما انتهاش؟ */
  hasActiveDiscount(userId: number) {
    return prisma.discountUsage.findFirst({
      where: {
        userId,
        planExpiresAt: { gt: new Date() },
      },
    });
  },

  /** ترقية مع كود خصم 100% — atomic check-and-increment to prevent race conditions */
  async applyFullDiscount(
    userId: number,
    planValue: string,
    planExpiresAt: Date,
    codeId: string,
    maxUses: number | null
  ) {
    return prisma.$transaction(async (tx) => {
      // Atomic: only increment if still active and below maxUses
      const codeUpdate = await tx.discountCode.updateMany({
        where: {
          id: codeId,
          active: true,
          ...(maxUses !== null ? { usedCount: { lt: maxUses } } : {}),
        },
        data: { usedCount: { increment: 1 } },
      });
      if (codeUpdate.count === 0) throw new AppError('DISCOUNT_CODE_EXHAUSTED', 409);

      // Deactivate if now at or past the limit
      if (maxUses !== null) {
        await tx.discountCode.updateMany({
          where: { id: codeId, usedCount: { gte: maxUses } },
          data: { active: false },
        });
      }

      await tx.discountUsage.create({ data: { userId, codeId, planExpiresAt } });
      await tx.user.update({ where: { id: userId }, data: { plan: planValue as import('@prisma/client').UserPlan, planExpiresAt } });
    });
  },

  /** ترقية مع/بدون خصم جزئي — transaction: تحديث الخطة + (اختياري) تسجيل الاستخدام + تسجيل معاملة الدفع */
  async applyUpgrade(
    userId: number,
    planValue: string,
    planExpiresAt: Date,
    discount?: { id: string; maxUses: number | null },
    payment?: { paymobId: string; amountEGP: number }
  ) {
    return prisma.$transaction(async (tx) => {
      // Guard against payment replay: unique constraint on paymobId prevents double-spend
      if (payment) {
        const existing = await tx.paymentTransaction.findUnique({ where: { paymobId: payment.paymobId } });
        if (existing) throw new AppError('PAYMENT_ALREADY_USED', 409);
        await tx.paymentTransaction.create({
          data: { paymobId: payment.paymobId, userId, plan: planValue, amountEGP: payment.amountEGP },
        });
      }

      if (discount) {
        // Atomic: only increment if still active and below maxUses
        const codeUpdate = await tx.discountCode.updateMany({
          where: {
            id: discount.id,
            active: true,
            ...(discount.maxUses !== null ? { usedCount: { lt: discount.maxUses } } : {}),
          },
          data: { usedCount: { increment: 1 } },
        });
        if (codeUpdate.count === 0) throw new AppError('DISCOUNT_CODE_EXHAUSTED', 409);

        if (discount.maxUses !== null) {
          await tx.discountCode.updateMany({
            where: { id: discount.id, usedCount: { gte: discount.maxUses } },
            data: { active: false },
          });
        }

        await tx.discountUsage.create({ data: { userId, codeId: discount.id, planExpiresAt } });
      }

      await tx.user.update({ where: { id: userId }, data: { plan: planValue as import('@prisma/client').UserPlan, planExpiresAt } });
    });
  },
};
