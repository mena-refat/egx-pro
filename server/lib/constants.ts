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

/** Plan prices (EGP) — for billing display/calculation */
export const PLAN_PRICES = { pro: 149, yearly: 1399 } as const;
