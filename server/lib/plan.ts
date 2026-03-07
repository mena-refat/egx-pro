/**
 * Free vs Pro plan: limits and isPro helper.
 * plan values: "free" | "pro" | "yearly"
 */

export const FREE_LIMITS = {
  aiAnalysisPerMonth: 3,
  portfolioStocks: 10,
  watchlistStocks: 20,
  goals: 3,
  priceAlerts: false, // free has no price alerts
} as const;

export type Plan = 'free' | 'pro' | 'yearly';

export interface UserForPlan {
  plan?: string | null;
  planExpiresAt?: Date | null;
  referralProExpiresAt?: Date | null;
}

/**
 * true if user has Pro (plan = pro | yearly, or referral Pro active).
 */
export function isPro(user: UserForPlan | null): boolean {
  if (!user) return false;
  const now = new Date();
  const plan = (user.plan || 'free') as string;
  const hasReferralPro = user.referralProExpiresAt != null && user.referralProExpiresAt > now;
  if (hasReferralPro) return true;
  return plan === 'pro' || plan === 'yearly';
}
