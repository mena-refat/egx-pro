/** Analysis — from Prisma (API: createdAt as ISO string) */
export interface Analysis {
  id: string;
  userId: string;
  ticker: string;
  content: string;
  createdAt: string;
}

/** Analysis result — from AI/API response (single stock, 42-factor framework) */
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

/** Compare two stocks — API response */
export interface CompareResult {
  summary: string;
  ticker1: { verdict: string; strengths: string[]; weaknesses: string[] };
  ticker2: { verdict: string; strengths: string[]; weaknesses: string[] };
  winner: string;
  reason: string;
  disclaimer?: string;
}

/** Personal recommendations — API response */
export interface RecommendationsResult {
  summary: string;
  recommendations: Array<{ ticker: string; action: string; reason: string }>;
  portfolioAdvice?: string;
  disclaimer?: string;
}
