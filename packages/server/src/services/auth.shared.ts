import { sanitizeUser } from '../lib/userSanitize.ts';

export const REFRESH_TOKEN_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const LOCKOUT_MINUTES = 30;
export const MAX_FAILED_ATTEMPTS = 5;

export type AuthContext = {
  ip?: string | null;
  userAgent?: string | null;
  auditReq?: import('../lib/audit.ts').AuditReq | null;
};

export function toUserPayload(user: {
  id: number;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  username: string | null;
  onboardingCompleted: boolean | null;
  isFirstLogin: boolean | null;
  [k: string]: unknown;
}) {
  const safe = sanitizeUser(user as Record<string, unknown>);
  const payload = safe ?? {
    id: user.id,
    email: user.email ?? undefined,
    phone: user.phone ?? undefined,
    fullName: user.fullName ?? '',
    username: user.username ?? undefined,
    onboardingCompleted: user.onboardingCompleted,
    isFirstLogin: user.isFirstLogin,
  };
  if (typeof (payload as Record<string, unknown>).fullName !== 'string') {
    (payload as Record<string, unknown>).fullName = user.fullName ?? '';
  }
  return payload;
}
