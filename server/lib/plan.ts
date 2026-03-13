/**
 * Free / Pro / Ultra plans: limits and helpers.
 * plan values: "free" | "pro" | "yearly" | "ultra" | "ultra_yearly"
 */

export const FREE_LIMITS = {
  aiAnalysisPerMonth: 3,
  portfolioStocks: 10,
  watchlistStocks: 20,
  goals: 3,
  priceAlerts: false,
} as const;

/** Pro: higher limits than free, still capped */
export const PRO_LIMITS = {
  aiAnalysisPerMonth: 30,
  portfolioStocks: 50,
  watchlistStocks: 50,
  goals: 10,
  priceAlerts: true,
} as const;

/** Ultra: highest limits (effectively unlimited for display) */
export const ULTRA_LIMITS = {
  aiAnalysisPerMonth: 999,
  portfolioStocks: 999,
  watchlistStocks: 999,
  goals: 999,
  priceAlerts: true,
} as const;

export type Plan = 'free' | 'pro' | 'yearly' | 'ultra' | 'ultra_yearly';

export type LimitKey = keyof typeof FREE_LIMITS;

export interface UserForPlan {
  plan?: string | null;
  planExpiresAt?: Date | null;
  referralProExpiresAt?: Date | null;
}

function isPlanActive(user: UserForPlan | null, plans: string[]): boolean {
  if (!user) return false;
  const now = new Date();
  const hasReferralPro = user.referralProExpiresAt != null && user.referralProExpiresAt > now;
  if (hasReferralPro && plans.includes('pro')) return true;
  const plan = (user.plan || 'free') as string;
  if (!plans.includes(plan)) return false;
  const expiresAt = user.planExpiresAt;
  return expiresAt == null || expiresAt > now;
}

/**
 * true if user has Pro (pro or yearly, or referral Pro).
 */
export function isPro(user: UserForPlan | null): boolean {
  return isPlanActive(user, ['pro', 'yearly']);
}

/**
 * true if user has Ultra (ultra or ultra_yearly).
 */
export function isUltra(user: UserForPlan | null): boolean {
  return isPlanActive(user, ['ultra', 'ultra_yearly']);
}

/**
 * true if user has any paid plan (Pro or Ultra, or referral Pro).
 */
export function isPaid(user: UserForPlan | null): boolean {
  return isPro(user) || isUltra(user);
}

/**
 * Returns the effective limit for the user for the given key.
 * Use for goals, portfolioStocks, watchlistStocks, aiAnalysisPerMonth.
 * priceAlerts: use isPaid(user) instead.
 */
export function getLimit(user: UserForPlan | null, key: LimitKey): number | boolean {
  if (!user) return key === 'priceAlerts' ? false : (FREE_LIMITS[key] as number);
  if (key === 'priceAlerts') return isPaid(user);
  if (isUltra(user)) return ULTRA_LIMITS[key] as number;
  if (isPro(user)) return PRO_LIMITS[key] as number;
  return FREE_LIMITS[key] as number;
}
