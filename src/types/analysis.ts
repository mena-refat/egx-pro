/** Analysis — from Prisma (API: createdAt as ISO string) */
export interface Analysis {
  id: string;
  userId: string;
  ticker: string;
  content: string;
  createdAt: string;
}

/** Analysis result — from AI/API response */
export interface AnalysisResult {
  summary: string;
  fundamental: {
    outlook: string;
    ratios: string;
    verdict: string;
  };
  technical: {
    signal: string;
    indicators: string;
    levels: string;
  };
  sentiment: string;
  verdict: string;
  priceTarget: {
    low: number;
    base: number;
    high: number;
  };
  suitability: string;
  disclaimer: string;
}
