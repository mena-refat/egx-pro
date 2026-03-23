import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.ts';
import { userApiSelect } from '../lib/userApiSelect.ts';

export const RefreshTokenRepository = {
  create(data: { token: string; userId: number; expiresAt: Date; [key: string]: unknown }) {
    return prisma.refreshToken.create({ data: data as Parameters<typeof prisma.refreshToken.create>[0]['data'] });
  },
  findByToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { select: userApiSelect } },
    });
  },
  findByTokenSelect<S extends Prisma.RefreshTokenSelect>(
    token: string,
    select: S
  ): Promise<Prisma.RefreshTokenGetPayload<{ select: S }> | null> {
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
      select: {
        id: true,
        deviceType: true,
        browser: true,
        os: true,
        deviceInfo: true,
        city: true,
        country: true,
        createdAt: true,
        expiresAt: true,
      },
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
