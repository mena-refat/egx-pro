/** Time constants (ms) */
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const ONE_HOUR_MS = 60 * 60 * 1000;

/** Rate limits (requests per window) */
export const RATE_LIMITS = {
  login: 5,
  register: 3,
  api: 100,
} as const;

/** Plan prices (EGP) — for billing display/calculation */
export const PLAN_PRICES = { pro: 149, yearly: 999 } as const;
