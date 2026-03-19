import crypto from 'crypto';
import { prisma } from './prisma.ts';
import { logger } from './logger.ts';

function hash(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

export type AuditReq = { ip?: string; headers?: { 'user-agent'?: string } };

export async function auditLog(params: {
  userId?: number | string | null;
  action: string;
  req?: AuditReq;
  result?: 'success' | 'failure';
  metadata?: Record<string, unknown>;
  details?: string | null;
}): Promise<void> {
  try {
    const ip = params.req?.ip ?? 'unknown';
    const ua = params.req?.headers?.['user-agent'] ?? 'unknown';
    await prisma.auditLog.create({
      data: {
        userId: params.userId != null ? Number(params.userId) : null,
        action: params.action,
        details: params.details ?? null,
        ipAddress: params.req ? (ip === 'unknown' ? null : ip) : null,
        ipHash: hash(ip),
        userAgent: ua.length > 500 ? ua.slice(0, 500) : ua,
        result: params.result ?? null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (e) {
    logger.error('Audit log write failed', { error: e });
  }
}
