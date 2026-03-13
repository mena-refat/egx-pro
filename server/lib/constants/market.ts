import { ONE_MINUTE_MS, ONE_HOUR_MS } from './time.ts';

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
