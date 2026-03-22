export type DataPoint = { value: number; change: number; changePercent: number };

export interface MarketOverview {
  usdEgp: DataPoint;
  egx30: DataPoint;
  egx30Capped?: DataPoint;
  egx70: DataPoint;
  egx100: DataPoint;
  egx33?: DataPoint;
  egx35?: DataPoint;
  gold: DataPoint & {
    valueEgxPerGram?: number;
    buyEgxPerGram?: number;
    sellEgxPerGram?: number;
    isDelayed?: boolean;
  };
  silver: DataPoint & {
    valueEgxPerGram?: number;
    buyEgxPerGram?: number;
    sellEgxPerGram?: number;
    isDelayed?: boolean;
  };
  lastUpdated: number;
  egxStatus?: { status: string; label?: { ar: string; en: string } };
  goldMarketStatus?: { isOpen: boolean; label?: { ar: string; en: string } };
}

export interface MarketNewsItem {
  title: string;
  summary?: string;
  publishedAt: string;
  sentiment?: string | null;
  tickers?: string[];
  isMarketWide?: boolean;
  source?: string;
  url?: string;
}
