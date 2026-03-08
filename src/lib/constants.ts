/** Plan prices (EGP) */
export const PLAN_PRICES = { pro: 149, yearly: 999 } as const;

/** Free tier limits — must match server/lib/plan.ts */
export const FREE_LIMITS = {
  aiAnalysisPerMonth: 3,
  portfolioStocks: 10,
  watchlistStocks: 20,
  goals: 3,
} as const;

/** UI/timeouts (ms) */
export const TIMEOUTS = {
  toast: 3000,
  debounce: 300,
  retry: 1000,
  reconnect: 5000,
  copiedFeedback: 2000,
  successFeedback: 2000,
  goodbyeDelay: 5000,
  cardAutoClose: 4000,
  usernameCheckDebounce: 500,
} as const;

/** Cache TTL in seconds */
export const CACHE_TTL = {
  prices: 60,
  news: 300,
  profile: 600,
} as const;
