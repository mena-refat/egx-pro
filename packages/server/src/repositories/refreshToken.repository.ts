import { prisma } from '../lib/prisma.ts';

export const RefreshTokenRepository = {
  create(data: { token: string; userId: number; expiresAt: Date; [key: string]: unknown }) {
    return prisma.refreshToken.create({ data: data as Parameters<typeof prisma.refreshToken.create>[0]['data'] });
  },
  findByToken(token: string) {
    return prisma.refreshToken.findUnique({ where: { token }, include: { user: true } });
  },
  findByTokenSelect(token: string, select: Record<string, boolean>) {
    return prisma.refreshToken.findUnique({ where: { token }, select });
  },
  revokeByToken(token: string) {
    return prisma.refreshToken.updateMany({ where: { token }, data: { isRevoked: true } });
  },
  revokeById(id: string, userId: number) {
    return prisma.refreshToken.updateMany({ where: { id, userId }, data: { isRevoked: true } });
  },
  revokeAllByUser(userId: number) {
    return prisma.refreshToken.updateMany({ where: { userId }, data: { isRevoked: true } });
  },
  revokeAllByUserExcept(userId: number, excludeId: string) {
    return prisma.refreshToken.updateMany({ where: { userId, id: { not: excludeId } }, data: { isRevoked: true } });
  },
  findActiveSessions(userId: number) {
    return prisma.refreshToken.findMany({
      where: { userId, isRevoked: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  },
  deleteExpired() {
    return prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  },
  deleteManyByUser(userId: number) {
    return prisma.refreshToken.deleteMany({ where: { userId } });
  },
  updateMany(where: { id?: string; token?: string; userId?: number }, data: { isRevoked: boolean }) {
    return prisma.refreshToken.updateMany({ where, data });
  },
  findMany(where: { userId: number; isRevoked?: boolean; expiresAt?: object }, orderBy?: object) {
    return prisma.refreshToken.findMany({ where, orderBy: orderBy ?? { createdAt: 'desc' } });
  },
};
