/** Portfolio - from Prisma (API: dates as ISO string) */
export interface Portfolio {
  id: string;
  userId: string;
  ticker: string;
  shares: number;
  avgPrice: number;
  buyDate: string;
  createdAt: string;
  updatedAt: string;
}

/** Portfolio holding - for UI / API response */
export interface PortfolioHolding {
  id: string;
  ticker: string;
  shares: number;
  avgPrice: number;
  buyDate: string;
}
