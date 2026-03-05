import crypto from 'crypto';
import { prisma } from './prisma.ts';

function hash(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 32);
}

export async function auditLog(params: {
  userId: string | null;
  action: string;
  req: { ip?: string; headers?: { 'user-agent'?: string } };
  result: 'success' | 'failure';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const ip = params.req.ip ?? 'unknown';
    const ua = params.req.headers?.['user-agent'] ?? 'unknown';
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        ipHash: hash(ip),
        userAgent: ua.length > 500 ? ua.slice(0, 500) : ua,
        result: params.result,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (e) {
    console.error('Audit log write failed:', e);
  }
}
