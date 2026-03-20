// ─────────────────────────────────────────────────────────────────────────────
// Design Tokens — EGX Pro
// ─────────────────────────────────────────────────────────────────────────────

export const DARK = {
  bg:        '#090e1a',
  bgAlt:     '#0d1420',
  card:      '#111827',
  cardAlt:   '#162032',
  hover:     '#1a2535',
  border:    '#1e293b',
  border2:   '#243047',
  text:      '#f1f5f9',
  textSub:   '#94a3b8',
  textMuted: '#64748b',
  inputBg:   '#0d1420',
  overlay:   'rgba(0,0,0,0.7)',
  statusBar: 'light' as const,
} as const;

export const LIGHT = {
  bg:        '#f8fafc',
  bgAlt:     '#f1f5f9',
  card:      '#ffffff',
  cardAlt:   '#f8fafc',
  hover:     '#f1f5f9',
  border:    '#e2e8f0',
  border2:   '#cbd5e1',
  text:      '#0f172a',
  textSub:   '#475569',
  textMuted: '#94a3b8',
  inputBg:   '#ffffff',
  overlay:   'rgba(0,0,0,0.5)',
  statusBar: 'dark' as const,
} as const;

export type AppColors = typeof DARK | typeof LIGHT;

// ─────────────────────────────────────────────────────────────────────────────
// Semantic Color Constants
// ─────────────────────────────────────────────────────────────────────────────

export const BRAND          = '#8b5cf6';
export const BRAND_DARK     = '#7c3aed';
export const BRAND_LIGHT    = '#a78bfa';
export const BRAND_BG       = '#8b5cf610';
export const BRAND_BG_STRONG = '#8b5cf620';

export const GREEN    = '#22c55e';
export const GREEN_BG = '#22c55e18';
export const RED      = '#ef4444';
export const RED_BG   = '#ef444418';
export const YELLOW   = '#f59e0b';
export const YELLOW_BG = '#f59e0b18';
export const BLUE     = '#3b82f6';
export const BLUE_BG  = '#3b82f618';

export const POSITIVE = GREEN;
export const NEGATIVE = RED;
export const NEUTRAL  = '#94a3b8';

// ─────────────────────────────────────────────────────────────────────────────
// Typography Scale
// ─────────────────────────────────────────────────────────────────────────────

export const FONT = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   16,
  lg:   18,
  xl:   20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
} as const;

export const WEIGHT = {
  normal:    '400',
  medium:    '500',
  semibold:  '600',
  bold:      '700',
  extrabold: '800',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Spacing & Radius
// ─────────────────────────────────────────────────────────────────────────────

export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  full: 999,
} as const;

export const SPACE = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  '3xl': 32,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Shadow Utility
// ─────────────────────────────────────────────────────────────────────────────

export function cardShadow(dark: boolean) {
  return dark
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
      }
    : {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      };
}
