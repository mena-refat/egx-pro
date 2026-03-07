/** AuditLog — from Prisma (API: dates as ISO string) */
export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  ipHash: string | null;
  result: string | null;
  metadata: string | null;
  createdAt: string;
  timestamp?: string;
}
