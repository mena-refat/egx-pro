/** Plan prices (EGP) */
export const PLAN_PRICES = { pro: 149, yearly: 999 } as const;

/** Free tier limits */
export const FREE_LIMITS = {
  goals: 3,
  portfolio: 5,
  watchlist: 10,
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
