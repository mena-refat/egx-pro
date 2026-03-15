import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { AppError } from '../lib/errors.ts';
import { IDEMPOTENCY } from '../lib/constants.ts';
import { logger } from '../lib/logger.ts';
import { IdempotencyRepository } from '../repositories/idempotency.repository.ts';

type BeginParams = {
  userId: string;
  key: string;
  method: string;
  path: string;
  body: unknown;
};

type ReplayResult = {
  kind: 'replay';
  recordId: string;
  status: number;
  body: unknown;
};

type ProceedResult = {
  kind: 'proceed';
  recordId: string;
};

type BeginResult = ReplayResult | ProceedResult;

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalize(record[key]);
        return acc;
      }, {});
  }
  return value;
}

function hashRequest(method: string, path: string, body: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify({ method, path, body: normalize(body) }))
    .digest('hex');
}

function isStale(lockTime: Date, now: Date): boolean {
  return now.getTime() - lockTime.getTime() > IDEMPOTENCY.lockTimeoutMs;
}

export const IdempotencyService = {
  async begin(params: BeginParams): Promise<BeginResult> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + IDEMPOTENCY.ttlMs);
    const requestHash = hashRequest(params.method, params.path, params.body);
    const pendingData = {
      userId: params.userId,
      key: params.key,
      method: params.method,
      path: params.path,
      requestHash,
      lockedAt: now,
      expiresAt,
    };

    let record = await IdempotencyRepository.findByUserAndKey(params.userId, params.key);
    let createdRecord = false;
    if (!record) {
      try {
        record = await IdempotencyRepository.createPending(pendingData);
        createdRecord = true;
      } catch {
        record = await IdempotencyRepository.findByUserAndKey(params.userId, params.key);
      }
    }

    if (!record) {
      throw new AppError('IDEMPOTENCY_RESERVATION_FAILED', 409);
    }

    const sameRequest =
      record.method === params.method &&
      record.path === params.path &&
      record.requestHash === requestHash;
    const expired = record.expiresAt.getTime() <= now.getTime();

    if (!sameRequest) {
      throw new AppError('IDEMPOTENCY_KEY_REUSED', 409);
    }

    if (!expired && record.status === 'COMPLETED' && record.responseStatus && record.responseBody !== null) {
      return {
        kind: 'replay',
        recordId: record.id,
        status: record.responseStatus,
        body: record.responseBody,
      };
    }

    if (!expired && record.status === 'PROCESSING' && !createdRecord && !isStale(record.lockedAt, now)) {
      throw new AppError('IDEMPOTENCY_IN_PROGRESS', 409);
    }

    if (expired || record.status !== 'PROCESSING' || isStale(record.lockedAt, now)) {
      record = await IdempotencyRepository.markProcessing(record.id, {
        method: params.method,
        path: params.path,
        requestHash,
        lockedAt: now,
        expiresAt,
      });
    }

    return {
      kind: 'proceed',
      recordId: record.id,
    };
  },

  async complete(recordId: string, status: number, body: unknown): Promise<void> {
    const responseBody =
      body === undefined ? Prisma.JsonNull : (body as Prisma.InputJsonValue);
    await IdempotencyRepository.markCompleted(recordId, status, responseBody);
  },

  async release(recordId: string): Promise<void> {
    await IdempotencyRepository.delete(recordId).catch((error: unknown) => {
      logger.warn('Failed to release idempotency record', {
        recordId,
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      });
    });
  },
};
