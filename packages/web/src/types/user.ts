/** Subscription / plan */
export type Plan = 'free' | 'pro' | 'yearly' | 'ultra' | 'ultra_yearly';

/** UI theme */
export type Theme = 'dark' | 'light' | 'system';

/** App language */
export type Language = 'ar' | 'en';

/** User title (ناشئ | مستثمر | محترف | أسطورة) */
export type UserTitle = 'ناشئ' | 'مستثمر' | 'محترف' | 'أسطورة';

/** User - aligned with Prisma User model (API: dates as ISO string) */
export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  passwordHash?: string | null;
  salt?: string | null;
  fullName: string | null;
  username: string | null;
  isPrivate?: boolean;
  showPortfolio?: boolean;
  isEmailVerified?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorEnabledAt?: string | null;
  avatarUrl?: string | null;
  riskTolerance?: string | null;
  investmentHorizon?: number | null;
  monthlyBudget?: number | null;
  shariaMode?: boolean;
  onboardingCompleted?: boolean;
  interestedSectors?: string | null;
  language: string;
  theme: string;
  plan: Plan;
  planExpiresAt?: string | null;
  aiAnalysisUsedThisMonth?: number;
  aiAnalysisResetDate?: string | null;
  referralCode?: string | null;
  referredBy?: string | null;
  referralUsed?: string | null;
  totalReferrals?: number;
  referralProDaysRemaining?: number;
  referralProExpiresAt?: string | null;
  notifySignals?: boolean;
  notifyPortfolio?: boolean;
  notifyNews?: boolean;
  notifyAchievements?: boolean;
  notifyGoals?: boolean;
  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
  loginStreak?: number;
  lastPasswordChangeAt?: string | null;
  lastUsernameChangeAt?: string | null;
  usernameChangeCount?: number;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletionScheduledFor?: string | null;
  isFirstLogin?: boolean;
  hearAboutUs?: string | null;
  investorProfile?: unknown;
  userTitle: UserTitle;
  failedLoginAttempts?: number;
  lockedUntil?: string | null;
  unseenAchievements?: string[];
  createdAt: string;
  updatedAt: string;
}

/** Session row (from RefreshToken + device/location) - for UI */
export interface Session {
  id: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  city: string | null;
  country: string | null;
  lastActivity: string;
  createdAt: string;
  isCurrent: boolean;
}

/** RefreshToken - from Prisma (API: dates as ISO string) */
export interface RefreshToken {
  id: string;
  token: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
  deviceInfo?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  os?: string | null;
  ipAddress?: string | null;
  city?: string | null;
  country?: string | null;
  isRevoked: boolean;
}
