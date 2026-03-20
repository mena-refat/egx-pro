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
  /** Watchlist fields - present when fetched via /watchlist */
  targetPrice?: number | null;
  targetDirection?: 'UP' | 'DOWN' | null;
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
  plan?: 'free' | 'pro' | 'yearly' | 'ultra' | 'ultra_yearly';
  planExpiresAt?: string | null;
  referralProExpiresAt?: string | null;
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

export interface LearnCard {
  term: string;
  emoji?: string;
  simple: string;
  detail?: string;
  inThisStock?: string;
}

export interface AnalysisResult {
  summary: string;
  verdictBadge?: string;
  confidenceScore?: number;
  confidenceReason?: string;
  priceTarget?: {
    current: number;
    targetLow: number;
    targetBase: number;
    targetHigh: number;
    stopLoss: number;
    potentialUpside?: string;
    potentialDownside?: string;
  };
  fundamental?: {
    score: number;
    highlights: string[];
    keyRatios?: Record<string, { value: string; explain: string }>;
  };
  technical?: {
    score: number;
    trend: string;
    highlights: string[];
    keyIndicators?: Record<string, { value: string; explain: string }>;
    support?: number;
    resistance?: number;
  };
  shortTerm?: {
    outlook: string;
    title: string;
    summary: string;
    reasons: string[];
    action: string;
  };
  mediumTerm?: {
    outlook: string;
    title: string;
    summary: string;
    reasons: string[];
    action: string;
  };
  longTerm?: {
    outlook: string;
    title: string;
    summary: string;
    reasons: string[];
    action: string;
  };
  sentiment?:
    | string
    | {
        overall: string;
        smartMoney?: string;
        news?: string;
        explain: string;
      };
  risks?: Array<{ risk: string; severity: string; explain: string }>;
  learnCards?: LearnCard[];
  suitability?: string;
  disclaimer: string;
  verdict?: string;
  shortTermOutlook?: string;
  mediumTermOutlook?: string;
  longTermOutlook?: string;
}

export interface CompareResult {
  summary: string;
  winner: string;
  winnerReason?: string;
  stock1?: {
    ticker: string;
    name: string;
    score: number;
    verdictBadge: string;
    fundamental: { score: number; summary: string };
    technical: { score: number; summary: string };
    strengths: string[];
    weaknesses: string[];
    risks: string[];
    priceTarget?: { target: number; stopLoss: number };
  };
  stock2?: {
    ticker: string;
    name: string;
    score: number;
    verdictBadge: string;
    fundamental: { score: number; summary: string };
    technical: { score: number; summary: string };
    strengths: string[];
    weaknesses: string[];
    risks: string[];
    priceTarget?: { target: number; stopLoss: number };
  };
  ticker1?: CompareResult['stock1'];
  ticker2?: CompareResult['stock2'];
  reason?: string;
  recommendation: string;
  learnCards?: LearnCard[];
  disclaimer?: string;
}

export interface RecommendationsResult {
  summary: string;
  portfolioHealth?: {
    score: number;
    grade?: string;
    diversification: string;
    riskLevel: string;
    issues: string[];
  };
  recommendations: Array<{
    ticker: string;
    name?: string;
    action: string;
    urgency?: string;
    reason: string;
    targetPrice?: number;
    stopLoss?: number;
    allocation?: string;
  }>;
  actionPlan?: { month1: string; month2: string; month3: string };
  sectorsToWatch?: string[];
  portfolioAdvice?: string;
  marketOutlook?: string;
  learnCards?: LearnCard[];
  disclaimer?: string;
}
