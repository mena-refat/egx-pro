import { prisma } from '../lib/prisma.ts';

export const FollowRepository = {
  findStatus(followerId: string, followingId: string) {
    return prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });
  },
};
