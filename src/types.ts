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
}

export interface User {
  id: string;
  email?: string;
  phone?: string;
  fullName: string;
  username?: string;
  riskTolerance?: string;
  investmentHorizon?: number;
  monthlyBudget?: number;
  shariaMode?: boolean;
  onboardingCompleted?: boolean;
  interestedSectors?: string[];
  twoFactorEnabled?: boolean;
  language?: string;
  theme?: string;
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
