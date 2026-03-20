/** Stock - list/card view */
export interface Stock {
  id?: string;
  ticker: string;
  nameAr: string;
  nameEn: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  isDelayed?: boolean;
  priceTime?: string;
  /** From API when available */
  name?: string;
  marketCap?: number;
  description?: string;
  open?: number;
  previousClose?: number;
  high?: number;
  low?: number;
  high52w?: number;
  low52w?: number;
}

/** Stock details - full quote / depth view */
export interface StockDetails extends Stock {
  open: number;
  high: number;
  low: number;
  prevClose: number;
  avgValue: number;
  totalValue: number;
  week52High: number;
  week52Low: number;
  marketCap: number;
  divYield: number;
  eps: number;
  peRatio: number;
  isSharia: boolean;
  indices: string[];
}

/** Single price level in depth */
export interface PriceDepthEntry {
  price: number;
  quantity: number;
}

/** Order book depth */
export interface PriceDepth {
  bids: PriceDepthEntry[];
  asks: PriceDepthEntry[];
  bidTotal: number;
  askTotal: number;
}
