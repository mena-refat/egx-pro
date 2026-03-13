/** Plan prices (EGP): pro monthly/yearly, ultra monthly/yearly */
export const PLAN_PRICES = {
  pro: 149,
  yearly: 1399,
  ultra: 299,
  ultra_yearly: 2499,
} as const;

/** Yearly savings vs monthly * 12 (percent). Used for "Save X%" on toggle. */
export const YEARLY_SAVINGS_PERCENT = {
  pro: Math.round((1 - PLAN_PRICES.yearly / (PLAN_PRICES.pro * 12)) * 100),
  ultra: Math.round((1 - PLAN_PRICES.ultra_yearly / (PLAN_PRICES.ultra * 12)) * 100),
} as const;

/** Free tier limits — MUST match server/lib/plan.ts */
export const FREE_LIMITS = {
  aiAnalysisPerMonth: 3,
  portfolioStocks: 3,
  watchlistStocks: 5,
  goals: 1,
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

/** Pagination defaults */
export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 50,
} as const;

/** Discover / username search autocomplete */
export const DISCOVER = {
  minUsernameLength: 2,
  autocompleteLimit: 5,
} as const;
