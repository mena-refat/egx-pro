import { ONE_MINUTE_MS, ONE_HOUR_MS } from './time.ts';

/** Rate limits (requests per window) */
export const RATE_LIMITS = {
  login: { max: 5, windowMs: 15 * ONE_MINUTE_MS },
  register: { max: 3, windowMs: ONE_HOUR_MS },
  refresh: { max: 10, windowMs: ONE_MINUTE_MS },
  api: { max: 100, windowMs: ONE_MINUTE_MS },
} as const;
