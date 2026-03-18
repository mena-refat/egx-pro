export interface Stock {
  ticker: string;
  nameAr: string;
  nameEn: string;
  sector?: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  isDelayed?: boolean;
  priceTime?: string;
  open?: number;
  previousClose?: number;
  high?: number;
  low?: number;
  marketCap?: number;
  description?: string;
}

export interface MarketOverview {
  egx30?: { value: number; changePercent: number };
  egx70?: { value: number; changePercent: number };
  egx100?: { value: number; changePercent: number };
  usdEgp?: number;
  gold?: { price: number; changePercent: number };
  lastUpdated?: number;
}

