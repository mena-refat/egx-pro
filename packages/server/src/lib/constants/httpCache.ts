/** Browser / CDN cache hints for safe GET responses (paired with sendSuccessCached). */
export const HTTP_CACHE_SECONDS = {
  marketStatus: 12,
  marketOverviewPrivate: 10,
  stockListPrices: 5,
  stockGainersLosers: 8,
  stockSearch: 60,
  stockFinancials: 120,
  stockHistory: 60,
  stockNews: 45,
  stockQuote: 5,
} as const;
