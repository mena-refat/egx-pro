export interface Stock {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  sector: string;
  description: string;
  /** From API when available */
  open?: number;
  previousClose?: number;
  high?: number;
  low?: number;
  high52w?: number;
  low52w?: number;
}

export interface User {
  id: string;
  email?: string;
  isEmailVerified?: boolean;
  phone?: string;
  fullName: string;
  username?: string;
  riskTolerance?: string;
  investmentHorizon?: number;
  monthlyBudget?: number;
  shariaMode?: boolean;
  onboardingCompleted?: boolean;
  isFirstLogin?: boolean;
  interestedSectors?: string[];
  twoFactorEnabled?: boolean;
  language?: string;
  theme?: string;
  avatarUrl?: string | null;
  plan?: 'free' | 'pro' | 'yearly';
  planExpiresAt?: string | null;
  aiAnalysisUsedThisMonth?: number;
  aiAnalysisResetDate?: string | null;
  notifySignals?: boolean;
  notifyPortfolio?: boolean;
  notifyNews?: boolean;
  hearAboutUs?: string;
  investorProfile?: unknown;
}

export interface PortfolioHolding {
  id: string;
  ticker: string;
  shares: number;
  avgPrice: number;
  buyDate: string;
}

export interface WatchlistItem {
  id: string;
  ticker: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  type: string;
}

export interface AnalysisResult {
  summary: string;
  fundamental?: {
    outlook: string;
    ratios: string;
    verdict: string;
  };
  technical?: {
    signal: string;
    indicators: string;
    levels: string;
  };
  sentiment?: string;
  verdict: string;
  priceTarget?: {
    low: number;
    base: number;
    high: number;
  };
  shortTermOutlook?: string;
  mediumTermOutlook?: string;
  longTermOutlook?: string;
  suitability?: string;
  disclaimer: string;
}

export interface CompareResult {
  summary: string;
  ticker1: { verdict: string; strengths: string[]; weaknesses: string[] };
  ticker2: { verdict: string; strengths: string[]; weaknesses: string[] };
  winner: string;
  reason: string;
  disclaimer?: string;
}

export interface RecommendationsResult {
  summary: string;
  recommendations: Array<{ ticker: string; action: string; reason: string }>;
  portfolioAdvice?: string;
  disclaimer?: string;
}
