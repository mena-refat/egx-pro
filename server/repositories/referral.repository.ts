import { prisma } from '../lib/prisma.ts';

/** Referral model: id, referrerId, referredUserId, status, createdAt (لا isActive ولا rewardedAt) */
export const ReferralRepository = {
  findByReferredId(referredUserId: number) {
    return prisma.referral.findFirst({ where: { referredUserId } });
  },
  create(data: { referrerId: number; referredUserId: number; status?: string }) {
    return prisma.referral.create({
      data: { referrerId: data.referrerId, referredUserId: data.referredUserId, status: data.status ?? 'completed' },
    });
  },
  activate(id: string) {
    return prisma.referral.update({ where: { id }, data: { status: 'completed' } });
  },
  countActiveByReferrer(referrerId: number) {
    return prisma.referral.count({ where: { referrerId } });
  },

  countActiveByReferrerSince(referrerId: number, since: Date) {
    return prisma.referral.count({
      where: { referrerId, createdAt: { gte: since } },
    });
  },
  countActiveUnrewarded(referrerId: number) {
    return prisma.referral.count({ where: { referrerId } });
  },
  findActiveUnrewarded(referrerId: number, take: number) {
    return prisma.referral.findMany({
      where: { referrerId },
      take,
      orderBy: { createdAt: 'asc' },
    });
  },
  markRewarded(_id: string) {
    void _id;
    return Promise.resolve(undefined as unknown as { id: string });
  },
  findByReferrer(referrerId: number, options?: { take?: number; orderBy?: object; include?: object; select?: object }) {
    return prisma.referral.findMany({ where: { referrerId }, ...options } as { where: { referrerId: number }; take?: number; orderBy?: object });
  },
  findUnique(where: { referredUserId: number }) {
    return prisma.referral.findFirst({ where });
  },
  update(where: { id: string }, data: { status?: string }) {
    return prisma.referral.update({ where, data });
  },

  async applyReferralCodeTransaction(referrerId: number, referredUserId: number, _referralCode: string) {
    void _referralCode;
    await prisma.$transaction([
      prisma.user.update({
        where: { id: referredUserId },
        data: { referredBy: referrerId.toString(), referralUsed: _referralCode },
      }),
      prisma.referral.create({
        data: { referrerId, referredUserId, status: 'completed' },
      }),
    ]);
  },
};
