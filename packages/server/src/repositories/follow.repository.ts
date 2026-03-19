import { prisma } from '../lib/prisma.ts';

export const FollowRepository = {
  findStatus(followerId: number, followingId: number) {
    return prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
  },
  findByPair(followerId: number, followingId: number) {
    return prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
  },
  upsert(followerId: number, followingId: number, status: 'PENDING' | 'ACCEPTED') {
    return prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      update: { status },
      create: { followerId, followingId, status },
    });
  },
  deleteByPair(followerId: number, followingId: number) {
    return prisma.follow.deleteMany({ where: { followerId, followingId } });
  },
  countFollowers(userId: number) {
    return prisma.follow.count({ where: { followingId: userId, status: 'ACCEPTED' } });
  },
  countFollowing(userId: number) {
    return prisma.follow.count({ where: { followerId: userId, status: 'ACCEPTED' } });
  },
  findFollowers(userId: number, options?: { skip?: number; take?: number; include?: object }) {
    return prisma.follow.findMany({
      where: { followingId: userId, status: 'ACCEPTED' },
      orderBy: { createdAt: 'desc' },
      ...(options as object),
    });
  },
  findFollowing(userId: number, options?: { skip?: number; take?: number; include?: object }) {
    return prisma.follow.findMany({
      where: { followerId: userId, status: 'ACCEPTED' },
      orderBy: { createdAt: 'desc' },
      ...(options as object),
    });
  },
  findPending(userId: number, options?: { include?: object }) {
    return prisma.follow.findMany({
      where: { followingId: userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      ...(options as object),
    });
  },
  acceptPending(followerId: number, followingId: number) {
    return prisma.follow.updateMany({
      where: { followerId, followingId, status: 'PENDING' },
      data: { status: 'ACCEPTED' },
    });
  },
  declinePending(followerId: number, followingId: number) {
    return prisma.follow.deleteMany({
      where: { followerId, followingId, status: 'PENDING' },
    });
  },
  acceptAllPending(followingId: number) {
    return prisma.follow.updateMany({
      where: { followingId, status: 'PENDING' },
      data: { status: 'ACCEPTED' },
    });
  },
  findFollowingIds(followerId: number) {
    return prisma.follow.findMany({
      where: { followerId, status: 'ACCEPTED' },
      select: { followingId: true },
    });
  },
  findFollowStatuses(followerId: number, targetIds: number[]) {
    return prisma.follow.findMany({
      where: { followerId, followingId: { in: targetIds } },
      select: { followingId: true, status: true },
    });
  },
  findMany(where: object, options?: { orderBy?: object; include?: object; take?: number; skip?: number }) {
    return prisma.follow.findMany({ where, ...options } as Parameters<typeof prisma.follow.findMany>[0]);
  },
  count(where: { followingId?: number; followerId?: number; status?: 'PENDING' | 'ACCEPTED' }) {
    return prisma.follow.count({ where });
  },
  updateMany(where: object, data: { status: 'PENDING' | 'ACCEPTED' }) {
    return prisma.follow.updateMany({ where, data });
  },
  deleteMany(where: object) {
    return prisma.follow.deleteMany({ where });
  },
};
