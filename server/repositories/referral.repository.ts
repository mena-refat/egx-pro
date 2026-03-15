import { prisma } from '../lib/prisma.ts';

/** Referral model: id, referrerId, referredUserId, status, createdAt (لا isActive ولا rewardedAt) */
export const ReferralRepository = {
  findByReferredId(referredUserId: string) {
    return prisma.referral.findFirst({ where: { referredUserId } });
  },
  create(data: { referrerId: string; referredUserId: string; status?: string }) {
    return prisma.referral.create({
      data: { referrerId: data.referrerId, referredUserId: data.referredUserId, status: data.status ?? 'completed' },
    });
  },
  activate(id: string) {
    return prisma.referral.update({ where: { id }, data: { status: 'completed' } });
  },
  countActiveByReferrer(referrerId: string) {
    return prisma.referral.count({ where: { referrerId } });
  },

  countActiveByReferrerSince(referrerId: string, since: Date) {
    return prisma.referral.count({
      where: { referrerId, createdAt: { gte: since } },
    });
  },
  countActiveUnrewarded(referrerId: string) {
    return prisma.referral.count({ where: { referrerId } });
  },
  findActiveUnrewarded(referrerId: string, take: number) {
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
  findByReferrer(referrerId: string, options?: { take?: number; orderBy?: object; include?: object; select?: object }) {
    return prisma.referral.findMany({ where: { referrerId }, ...options } as { where: { referrerId: string }; take?: number; orderBy?: object });
  },
  findUnique(where: { referredUserId: string }) {
    return prisma.referral.findFirst({ where });
  },
  update(where: { id: string }, data: { status?: string }) {
    return prisma.referral.update({ where, data });
  },

  async applyReferralCodeTransaction(referrerId: string, referredUserId: string, _referralCode: string) {
    void _referralCode;
    await prisma.$transaction([
      prisma.user.update({
        where: { id: referredUserId },
        data: { referredBy: referrerId, referralUsed: _referralCode },
      }),
      prisma.referral.create({
        data: { referrerId, referredUserId, status: 'completed' },
      }),
    ]);
  },
};
