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

      await tx.discountUsage.create({ data: { userId, codeId } });
      await tx.user.update({ where: { id: userId }, data: { plan: planValue, planExpiresAt } });
    });
  },

  /** ترقية مع/بدون خصم جزئي — transaction: تحديث الخطة + (اختياري) تسجيل الاستخدام */
  async applyUpgrade(
    userId: number,
    planValue: string,
    planExpiresAt: Date,
    discount?: { id: string; maxUses: number | null }
  ) {
    if (!discount) {
      await prisma.user.update({ where: { id: userId }, data: { plan: planValue, planExpiresAt } });
      return;
    }

    return prisma.$transaction(async (tx) => {
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

      await tx.discountUsage.create({ data: { userId, codeId: discount.id } });
      await tx.user.update({ where: { id: userId }, data: { plan: planValue, planExpiresAt } });
    });
  },
};
