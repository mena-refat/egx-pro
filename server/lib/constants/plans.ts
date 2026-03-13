/** Plan prices (EGP): pro monthly/yearly, ultra monthly/yearly */
export const PLAN_PRICES = {
  pro: 149,
  yearly: 1399,
  ultra: 299,
  ultra_yearly: 2499,
} as const;

/** Predictions: daily limits per plan, rate limit for create */
export const PREDICTION_LIMITS = {
  freeDaily: 3,
  proDaily: 10,
  createRatePerMin: 5,
  deletionWindowMinutes: 5,
  minAccountAgeHours: 24,
} as const;
