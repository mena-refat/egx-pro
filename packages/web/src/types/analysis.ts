export interface LearnCard {
  term: string;
  emoji?: string;
  simple: string;
  detail?: string;
  inThisStock?: string;
}

/** Analysis - from Prisma (API: createdAt as ISO string) */
export interface Analysis {
  id: string;
  userId: string;
  ticker: string;
  content: string;
  createdAt: string;
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

  sentiment?: {
    overall: string;
    smartMoney?: string;
    news?: string;
    explain: string;
  };

  risks?: Array<{
    risk: string;
    severity: string;
    explain: string;
  }>;

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
  winnerReason: string;

  stock1: {
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

  stock2: {
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

  recommendation: string;
  learnCards?: LearnCard[];
  disclaimer?: string;

  ticker1?: CompareResult['stock1'];
  ticker2?: CompareResult['stock2'];
  reason?: string;
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

  actionPlan?: {
    month1: string;
    month2: string;
    month3: string;
  };

  sectorsToWatch?: string[];
  portfolioAdvice?: string;
  marketOutlook?: string;
  learnCards?: LearnCard[];
  disclaimer?: string;
}
