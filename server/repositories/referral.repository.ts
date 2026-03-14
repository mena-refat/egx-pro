import { prisma } from '../lib/prisma.ts';

export const ReferralRepository = {
  findByReferredId(referredId: string) {
    return prisma.referral.findUnique({ where: { referredId } });
  },
  create(data: { referrerId: string; referredId: string; isActive: boolean }) {
    return prisma.referral.create({ data });
  },
  activate(id: string) {
    return prisma.referral.update({ where: { id }, data: { isActive: true } });
  },
  countActiveByReferrer(referrerId: string) {
    return prisma.referral.count({ where: { referrerId, isActive: true } });
  },

  countActiveByReferrerSince(referrerId: string, since: Date) {
    return prisma.referral.count({
      where: { referrerId, isActive: true, referred: { createdAt: { gte: since } } },
    });
  },
  countActiveUnrewarded(referrerId: string) {
    return prisma.referral.count({ where: { referrerId, isActive: true, rewardedAt: null } });
  },
  findActiveUnrewarded(referrerId: string, take: number) {
    return prisma.referral.findMany({
      where: { referrerId, isActive: true, rewardedAt: null },
      take,
      orderBy: { createdAt: 'asc' },
    });
  },
  markRewarded(id: string) {
    return prisma.referral.update({ where: { id }, data: { rewardedAt: new Date() } });
  },
  findByReferrer(referrerId: string, options?: { take?: number; orderBy?: object; include?: object; select?: object }) {
    return prisma.referral.findMany({ where: { referrerId }, ...options } as { where: { referrerId: string }; take?: number; orderBy?: object });
  },
  findUnique(where: { referredId: string }) {
    return prisma.referral.findUnique({ where });
  },
  update(where: { id: string }, data: { isActive?: boolean; rewardedAt?: Date | null }) {
    return prisma.referral.update({ where, data });
  },

  /** Apply referral code: set user.referredBy + referralUsed and create referral row in one transaction. */
  async applyReferralCodeTransaction(referrerId: string, referredId: string, referralCode: string) {
    return prisma.$transaction([
      prisma.user.update({
        where: { id: referredId },
        data: { referredBy: referrerId, referralUsed: referralCode },
      }),
      prisma.referral.create({
        data: { referrerId, referredId, isActive: true },
      }),
    ]);
  },
};
