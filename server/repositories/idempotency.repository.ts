import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.ts';

type IdempotencyCreateInput = {
  userId: string;
  key: string;
  method: string;
  path: string;
  requestHash: string;
  lockedAt: Date;
  expiresAt: Date;
};

export const IdempotencyRepository = {
  findByUserAndKey(userId: string, key: string) {
    return prisma.idempotencyKey.findUnique({
      where: { userId_key: { userId, key } },
    });
  },

  createPending(data: IdempotencyCreateInput) {
    return prisma.idempotencyKey.create({
      data: {
        ...data,
        status: 'PROCESSING',
      },
    });
  },

  markProcessing(id: string, data: Pick<IdempotencyCreateInput, 'method' | 'path' | 'requestHash' | 'lockedAt' | 'expiresAt'>) {
    return prisma.idempotencyKey.update({
      where: { id },
      data: {
        method: data.method,
        path: data.path,
        requestHash: data.requestHash,
        lockedAt: data.lockedAt,
        expiresAt: data.expiresAt,
        status: 'PROCESSING',
        responseStatus: null,
        responseBody: null,
      },
    });
  },

  markCompleted(id: string, responseStatus: number, responseBody: Prisma.InputJsonValue | typeof Prisma.JsonNull) {
    return prisma.idempotencyKey.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        responseStatus,
        responseBody,
      },
    });
  },

  delete(id: string) {
    return prisma.idempotencyKey.delete({
      where: { id },
    });
  },

  deleteExpired(before: Date) {
    return prisma.idempotencyKey.deleteMany({
      where: { expiresAt: { lte: before } },
    });
  },
};
