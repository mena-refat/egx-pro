/** Time constants (ms) */
export const ONE_MINUTE_MS = 60 * 1000;
export const ONE_HOUR_MS = 60 * 60 * 1000;
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Rate limits (requests per window) */
export const RATE_LIMITS = {
  login: { max: 5, windowMs: 15 * ONE_MINUTE_MS },
  register: { max: 3, windowMs: ONE_HOUR_MS },
  refresh: { max: 10, windowMs: ONE_MINUTE_MS },
  api: { max: 100, windowMs: ONE_MINUTE_MS },
} as const;

/** Market data (Redis + in-memory cache, polling) */
export const MARKET_DATA = {
  CACHE_KEY_PREFIX: 'stock:quote:',
  CACHE_TTL_SECONDS: 60,
  STALE_TTL_SECONDS: 3 * 60 * 60,
  CAIRO_TZ: 'Africa/Cairo',
  MARKET_OPEN_HOUR: 10,
  MARKET_CLOSE_HOUR: 15,
  POLL_INTERVAL_MS: 45_000,
  OFF_HOURS_INTERVAL_MS: 2 * ONE_HOUR_MS,
  MAX_FAILURES_BEFORE_DEPRIORITIZE: 3,
  DEPRIORITIZE_FOR_MS: ONE_HOUR_MS,
} as const;

/** Stock quote (Yahoo + Prisma cache, batch sizes) */
export const STOCK_QUOTE = {
  CACHE_TTL_MS: 5 * ONE_MINUTE_MS,
  BATCH_SIZE: 10,
  BATCH_DELAY_MS: 500,
  BULK_BATCH_SIZE: 20,
  BULK_BATCH_DELAY_MS: 400,
  AVAILABILITY_TIMEOUT_MS: 5000,
} as const;

/** Plan prices (EGP) — for billing display/calculation */
export const PLAN_PRICES = { pro: 149, yearly: 1399 } as const;

/** Predictions: daily limits per plan, rate limit for create */
export const PREDICTION_LIMITS = {
  freeDaily: 3,
  proDaily: 10,
  createRatePerMin: 5,
  deletionWindowMinutes: 5,
  minAccountAgeHours: 24,
} as const;
