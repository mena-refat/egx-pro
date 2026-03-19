import { prisma } from '../lib/prisma.ts';
import { UserRepository } from './user.repository.ts';

export const DiscountRepository = {
  findByCode(code: string) {
    return prisma.discountCode.findUnique({ where: { code } });
  },

  findUsage(userId: number, codeId: string) {
    return prisma.discountUsage.findUnique({
      where: { userId_codeId: { userId, codeId } },
    });
  },

  /** ترقية مع كود خصم 100% — transaction: تحديث الخطة + تسجيل الاستخدام + تحديث الكود */
  applyFullDiscount(
    userId: number,
    planValue: string,
    planExpiresAt: Date,
    codeId: string,
    currentUsedCount: number,
    maxUses: number | null
  ) {
    return prisma.$transaction([
      UserRepository.update({
        where: { id: userId },
        data: { plan: planValue, planExpiresAt },
      }),
      prisma.discountUsage.create({
        data: { userId, codeId },
      }),
      prisma.discountCode.update({
        where: { id: codeId },
        data: {
          usedCount: currentUsedCount + 1,
          ...(maxUses === 1 ? { active: false } : {}),
        },
      }),
    ]);
  },

  /** ترقية مع/بدون خصم جزئي — transaction: تحديث الخطة + (اختياري) تسجيل الاستخدام */
  applyUpgrade(
    userId: number,
    planValue: string,
    planExpiresAt: Date,
    discount?: { id: string; usedCount: number; maxUses: number | null }
  ) {
    return prisma.$transaction([
      UserRepository.update({
        where: { id: userId },
        data: { plan: planValue, planExpiresAt },
      }),
      ...(discount
        ? [
            prisma.discountUsage.create({
              data: { userId, codeId: discount.id },
            }),
            prisma.discountCode.update({
              where: { id: discount.id },
              data: {
                usedCount: discount.usedCount + 1,
                ...(discount.maxUses === 1 ? { active: false } : {}),
              },
            }),
          ]
        : []),
    ]);
  },
};
