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
  fundamental?: { score: number; highlights: string[] };
  technical?: {
    score: number;
    trend: string;
    highlights: string[];
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
  sentiment?: { overall: string; explain: string };
  risks?: Array<{ risk: string; severity: string; explain: string }>;
  suitability?: string;
  disclaimer: string;
  verdict?: string;
}

export type PredictionDir = 'UP' | 'DOWN';
export type PredictionTime =
  | 'WEEK'
  | 'MONTH'
  | 'THREE_MONTHS'
  | 'SIX_MONTHS'
  | 'NINE_MONTHS'
  | 'YEAR';
export type PredictionStatus = 'ACTIVE' | 'HIT' | 'MISSED' | 'EXPIRED';
export type UserRank = 'BEGINNER' | 'ANALYST' | 'SENIOR' | 'EXPERT' | 'LEGEND';

export interface FeedPrediction {
  id: string;
  userId: string;
  ticker: string;
  direction: PredictionDir;
  targetPrice: number;
  priceAtCreation: number;
  timeframe: PredictionTime;
  reason: string | null;
  status: PredictionStatus;
  pointsEarned: number | null;
  accuracyPct: number | null;
  createdAt: string;
  expiresAt: string;
  isPublic: boolean;
  likeCount: number;
  isLikedByMe: boolean;
  user?: { id: string; username: string | null; avatarUrl: string | null };
  userRank?: UserRank;
  userAccuracyRate?: number;
}

export interface GoalRecord {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline: string | null;
  category: string;
  status: string;
  achievedAt: string | null;
  createdAt: string;
}

