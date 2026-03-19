/** Plan prices (EGP): pro monthly/yearly, ultra monthly/yearly. السنوي = دفع 10 أشهر (شهرين مجاناً) لتحفيز الاشتراك. */
export const PLAN_PRICES = {
  pro: 189,
  yearly: 1890,   // 189 × 10 — وفر شهرين
  ultra: 397,
  ultra_yearly: 3970, // 397 × 10 — وفر شهرين
} as const;

/** عدد الدعوات النشطة المطلوبة لمكافأة شهر Pro مجاناً */
export const REFERRAL_REQUIRED = 15;

/** Predictions: daily limits per plan, rate limit for create */
export const PREDICTION_LIMITS = {
  freeDaily: 3,
  proDaily: 10,
  createRatePerMin: 5,
  deletionWindowMinutes: 5,
  minAccountAgeHours: 24,
} as const;
