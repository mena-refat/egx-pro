/** Watchlist - from Prisma (API: dates as ISO string) */
export interface Watchlist {
  id: string;
  userId: string;
  ticker: string;
  targetPrice: number | null;
  targetReachedNotifiedAt: string | null;
  createdAt: string;
}

/** Watchlist item - for UI */
export interface WatchlistItem {
  id: string;
  ticker: string;
  targetPrice?: number | null;
  createdAt: string;
}
