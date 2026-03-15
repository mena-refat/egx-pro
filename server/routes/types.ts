import { Request } from 'express';

/** User shape attached by authenticate middleware (enough for auth + plan checks). */
export interface AuthUser {
  id: string;
  email: string | null;
  isEmailVerified?: boolean;
  plan?: string | null;
  planExpiresAt?: Date | null;
  referralProExpiresAt?: Date | null;
  isDeleted?: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  /** Set by authenticate for backward compatibility; same as user?.id */
  userId?: string;
  idempotencyKey?: string;
  idempotencyRecordId?: string;
}
