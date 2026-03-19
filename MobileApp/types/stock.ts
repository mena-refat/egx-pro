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

export interface IndexData {
  value: number;
  change?: number;
  changePercent: number;
}

export interface CommodityData {
  value: number;
  change?: number;
  changePercent?: number;
  valueEgxPerGram?: number;
  buyEgxPerGram?: number;
  sellEgxPerGram?: number;
  isDelayed?: boolean;
}

export interface MarketOverview {
  egx30?: IndexData;
  egx30Capped?: IndexData;
  egx70?: IndexData;
  egx100?: IndexData;
  egx33?: IndexData;
  egx35?: IndexData;
  usdEgp?: { value: number; change?: number; changePercent?: number } | number;
  gold?: CommodityData;
  silver?: CommodityData;
  lastUpdated?: number;
}

