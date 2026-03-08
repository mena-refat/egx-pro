import { prisma } from '../lib/prisma.ts';

export const UserRepository = {
  getPlanUser(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { plan: true, planExpiresAt: true, referralProExpiresAt: true },
    });
  },

  getForBillingPlan(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        plan: true,
        planExpiresAt: true,
        aiAnalysisUsedThisMonth: true,
        aiAnalysisResetDate: true,
        referralProDaysRemaining: true,
        referralProExpiresAt: true,
      },
    });
  },
};
