import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.ts';

/** Single place for all User table access. No business logic. */
export const UserRepository = {
  getPlanUser(id: number) {
    return prisma.user.findUnique({
      where: { id },
      select: { plan: true, planExpiresAt: true, referralProExpiresAt: true },
    });
  },

  getForBillingPlan(id: number) {
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

  findUnique(args: Prisma.UserFindUniqueArgs) {
    return prisma.user.findUnique(args);
  },

  findFirst(args: Prisma.UserFindFirstArgs) {
    return prisma.user.findFirst(args);
  },

  create(args: Prisma.UserCreateArgs) {
    return prisma.user.create(args);
  },

  update(args: Prisma.UserUpdateArgs) {
    return prisma.user.update(args);
  },

  findMany(args: Prisma.UserFindManyArgs) {
    return prisma.user.findMany(args);
  },
};
