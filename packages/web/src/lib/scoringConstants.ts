// Scoring constants — mirrors the backend service exactly.
// Source of truth: packages/server/src/services/predictions.service.ts

export type MoveTier = 'LIGHT' | 'MEDIUM' | 'STRONG' | 'EXTREME';
export type PredictionTime = 'WEEK' | 'MONTH' | 'THREE_MONTHS' | 'SIX_MONTHS' | 'NINE_MONTHS' | 'YEAR';
export type PredictionMode = 'TIER' | 'EXACT';

export const TIER_ORDER: MoveTier[] = ['LIGHT', 'MEDIUM', 'STRONG', 'EXTREME'];

export const TIER_BASE_POINTS: Record<MoveTier, number> = {
  LIGHT: 25, MEDIUM: 55, STRONG: 100, EXTREME: 160,
};

// Timeframe multipliers
export const TIMEFRAME_MULTIPLIER: Record<PredictionTime, number> = {
  WEEK: 1.0, MONTH: 1.3, THREE_MONTHS: 1.8,
  SIX_MONTHS: 2.4, NINE_MONTHS: 3.0, YEAR: 4.0,
};

// Timeframe-specific tier ranges [min%, max%) — calibrated to EGX 40-year history.
// Individual stock σ_annual ≈ 55%; tiers are at 0-0.5σ / 0.5-1.5σ / 1.5-2.5σ / >2.5σ
export const TIMEFRAME_TIER_RANGES: Record<PredictionTime, Record<MoveTier, [number, number]>> = {
  WEEK:         { LIGHT: [1, 5],   MEDIUM: [5, 11],  STRONG: [11, 19],  EXTREME: [19, Infinity] },
  MONTH:        { LIGHT: [1, 8],   MEDIUM: [8, 25],  STRONG: [25, 40],  EXTREME: [40, Infinity] },
  THREE_MONTHS: { LIGHT: [1, 15],  MEDIUM: [15, 40], STRONG: [40, 70],  EXTREME: [70, Infinity] },
  SIX_MONTHS:   { LIGHT: [2, 20],  MEDIUM: [20, 60], STRONG: [60, 95],  EXTREME: [95, Infinity] },
  NINE_MONTHS:  { LIGHT: [2, 25],  MEDIUM: [25, 70], STRONG: [70, 120], EXTREME: [120, Infinity] },
  YEAR:         { LIGHT: [3, 28],  MEDIUM: [28, 82], STRONG: [82, 135], EXTREME: [135, Infinity] },
};

// ─── EXACT mode constants ─────────────────────────────────────────────────────

export interface ExactBand {
  tolerance: number;    // max % diff from target price
  basePoints: number;
  accuracyPct: number;
  labelAr: string;
  labelEn: string;
  color: string;
}

export const EXACT_BANDS: ExactBand[] = [
  { tolerance: 2,  basePoints: 500, accuracyPct: 100, labelAr: 'دقة تامة',  labelEn: 'Bullseye', color: 'text-emerald-400' },
  { tolerance: 5,  basePoints: 350, accuracyPct: 70,  labelAr: 'دقيق جداً', labelEn: 'Sharp',    color: 'text-green-400'  },
  { tolerance: 10, basePoints: 200, accuracyPct: 40,  labelAr: 'دقيق',      labelEn: 'Precise',  color: 'text-amber-400'  },
  { tolerance: 20, basePoints: 90,  accuracyPct: 18,  labelAr: 'قريب',      labelEn: 'Close',    color: 'text-orange-400' },
];

// [maxDays, multiplier]
export const EXACT_DAYS_MULTIPLIERS: Array<[number, number]> = [
  [7,        1.0],
  [30,       1.5],
  [90,       2.2],
  [180,      3.0],
  [365,      4.5],
  [Infinity, 6.0],
];

export function calcExactDaysMultiplier(createdAt: Date, expiresAt: Date): number {
  const days = Math.round((expiresAt.getTime() - createdAt.getTime()) / 86_400_000);
  for (const [maxDays, mult] of EXACT_DAYS_MULTIPLIERS) {
    if (days <= maxDays) return mult;
  }
  return 6.0;
}

export function calcExactMaxPoints(expiresAt: Date, createdAt = new Date()): number {
  return Math.round(500 * calcExactDaysMultiplier(createdAt, expiresAt));
}

/** Human-readable range label e.g. "5–11%" or ">19%" */
export function formatRange(tier: MoveTier, timeframe: PredictionTime): string {
  const [min, max] = TIMEFRAME_TIER_RANGES[timeframe][tier];
  return max === Infinity ? `>${min}%` : `${min}–${max}%`;
}

/** Points earned for exact tier + timeframe combo */
export function calcPoints(tier: MoveTier, timeframe: PredictionTime): number {
  return Math.round(TIER_BASE_POINTS[tier] * TIMEFRAME_MULTIPLIER[timeframe]);
}
