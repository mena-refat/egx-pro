import { prisma } from '../lib/prisma.ts';

export const FollowRepository = {
  findStatus(followerId: string, followingId: string) {
    return prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
  },
  findByPair(followerId: string, followingId: string) {
    return prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
  },
  upsert(followerId: string, followingId: string, status: 'PENDING' | 'ACCEPTED') {
    return prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      update: { status },
      create: { followerId, followingId, status },
    });
  },
  deleteByPair(followerId: string, followingId: string) {
    return prisma.follow.deleteMany({ where: { followerId, followingId } });
  },
  countFollowers(userId: string) {
    return prisma.follow.count({ where: { followingId: userId, status: 'ACCEPTED' } });
  },
  countFollowing(userId: string) {
    return prisma.follow.count({ where: { followerId: userId, status: 'ACCEPTED' } });
  },
  findFollowers(userId: string, options?: { skip?: number; take?: number; include?: object }) {
    return prisma.follow.findMany({
      where: { followingId: userId, status: 'ACCEPTED' },
      orderBy: { createdAt: 'desc' },
      ...(options as object),
    });
  },
  findFollowing(userId: string, options?: { skip?: number; take?: number; include?: object }) {
    return prisma.follow.findMany({
      where: { followerId: userId, status: 'ACCEPTED' },
      orderBy: { createdAt: 'desc' },
      ...(options as object),
    });
  },
  findPending(userId: string, options?: { include?: object }) {
    return prisma.follow.findMany({
      where: { followingId: userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      ...(options as object),
    });
  },
  acceptPending(followerId: string, followingId: string) {
    return prisma.follow.updateMany({
      where: { followerId, followingId, status: 'PENDING' },
      data: { status: 'ACCEPTED' },
    });
  },
  declinePending(followerId: string, followingId: string) {
    return prisma.follow.deleteMany({
      where: { followerId, followingId, status: 'PENDING' },
    });
  },
  acceptAllPending(followingId: string) {
    return prisma.follow.updateMany({
      where: { followingId, status: 'PENDING' },
      data: { status: 'ACCEPTED' },
    });
  },
  findFollowingIds(followerId: string) {
    return prisma.follow.findMany({
      where: { followerId, status: 'ACCEPTED' },
      select: { followingId: true },
    });
  },
  findFollowStatuses(followerId: string, targetIds: string[]) {
    return prisma.follow.findMany({
      where: { followerId, followingId: { in: targetIds } },
      select: { followingId: true, status: true },
    });
  },
  findMany(where: object, options?: { orderBy?: object; include?: object; take?: number; skip?: number }) {
    return prisma.follow.findMany({ where, ...options } as Parameters<typeof prisma.follow.findMany>[0]);
  },
  count(where: { followingId?: string; followerId?: string; status?: 'PENDING' | 'ACCEPTED' }) {
    return prisma.follow.count({ where });
  },
  updateMany(where: object, data: { status: 'PENDING' | 'ACCEPTED' }) {
    return prisma.follow.updateMany({ where, data });
  },
  deleteMany(where: object) {
    return prisma.follow.deleteMany({ where });
  },
};
