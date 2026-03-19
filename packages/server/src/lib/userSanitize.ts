/**
 * Safe user fields to expose in API responses.
 * Excludes: passwordHash, salt, twoFactorSecret, failedLoginAttempts, lockedUntil, isDeleted.
 */
const SAFE_USER_KEYS = [
  'id', 'email', 'phone', 'fullName', 'username', 'isEmailVerified', 'twoFactorEnabled',
  'avatarUrl', 'riskTolerance', 'investmentHorizon', 'monthlyBudget', 'shariaMode',
  'onboardingCompleted', 'interestedSectors', 'language', 'theme', 'plan', 'planExpiresAt',
  'aiAnalysisUsedThisMonth', 'aiAnalysisResetDate', 'referralCode', 'referredBy', 'totalReferrals',
  'referralProDaysRemaining', 'referralProExpiresAt', 'notifySignals', 'notifyPortfolio', 'notifyNews',
  'notifyAchievements', 'notifyGoals',
  'lastLoginAt', 'loginStreak', 'lastPasswordChangeAt', 'lastUsernameChangeAt', 'usernameChangeCount',
  'isFirstLogin', 'hearAboutUs', 'investorProfile', 'userTitle', 'createdAt', 'updatedAt',
] as const;

export type SanitizedUser = Partial<Record<typeof SAFE_USER_KEYS[number], unknown>>;

/**
 * Returns a user object with only safe fields (no password hash, refresh tokens, lockout fields, or isDeleted).
 */
export function sanitizeUser<T extends Record<string, unknown>>(user: T | null): SanitizedUser | null {
  if (!user || typeof user !== 'object') return null;
  const out: SanitizedUser = {};
  for (const key of SAFE_USER_KEYS) {
    if (key in user && user[key] !== undefined) {
      (out as Record<string, unknown>)[key] = user[key];
    }
  }
  return out;
}
