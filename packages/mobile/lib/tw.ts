import type { TextStyle, ViewStyle } from 'react-native';
import {
  BRAND,
  BLUE,
  GREEN,
  RED,
  YELLOW,
  WEIGHT,
} from './theme';

type Style = ViewStyle & TextStyle;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return null;
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;
  return { r, g, b };
}

function rgbaFromHex(hex: string, alpha01: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const a = Math.max(0, Math.min(1, alpha01));
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
}

function spacingFromTailwindNumber(raw: string): number | null {
  // tailwind spacing scale is typically 4px * value (e.g. 4 => 16px, 2 => 8px, 0.5 => 2px)
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return null;
  return n * 4;
}

function parsePxValue(raw: string): number | null {
  // e.g. "10px" => 10
  const m = raw.match(/^(\d+(?:\.\d+)?)px$/);
  if (!m) return null;
  const n = Number.parseFloat(m[1] ?? '');
  return Number.isFinite(n) ? n : null;
}

const BASE_COLORS: Record<string, string> = {
  brand: BRAND,
  'blue-500': BLUE,
  'emerald-500': '#10b981',
  'emerald-400': '#34d399',
  'green-500': GREEN,
  'red-500': RED,
  'red-400': RED,
  'violet-500': BRAND,
  'yellow-500': YELLOW,
  'yellow-400': '#facc15',
  'amber-500': YELLOW,
  'amber-400': '#fbbf24',
  black: '#000000',
  white: '#ffffff',
};

function colorFromToken(token: string): { color?: string; alpha?: number } {
  // supports: "bg-brand", "bg-brand/15", "text-blue-500/20"
  const m = token.match(/^(bg|text)-([a-z0-9-]+)(?:\/(\d+(?:\.\d+)?))?$/);
  if (!m) return {};

  const group = m[2] ?? '';
  const op = m[3];
  const alpha01 = op != null ? Number.parseFloat(op) / 100 : undefined;
  return {
    color: BASE_COLORS[group] ?? undefined,
    alpha: alpha01,
  };
}

export function tw(className: string): Style {
  const out: Style = {};
  const tokens = className.split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    // layout: flex
    if (token === 'flex-row') out.flexDirection = 'row';
    if (token === 'flex-col') out.flexDirection = 'column';
    if (token === 'items-center') out.alignItems = 'center';
    if (token === 'items-start') out.alignItems = 'flex-start';
    if (token === 'items-end') out.alignItems = 'flex-end';
    if (token === 'justify-center') out.justifyContent = 'center';
    if (token === 'justify-between') out.justifyContent = 'space-between';
    if (token === 'justify-start') out.justifyContent = 'flex-start';
    if (token === 'justify-end') out.justifyContent = 'flex-end';
    if (token === 'flex-wrap') out.flexWrap = 'wrap';

    // flex sizing
    if (token === 'flex-1') out.flex = 1;
    if (token === 'shrink-0') out.flexShrink = 0;
    if (token === 'grow') out.flexGrow = 1;
    if (token === 'self-start') out.alignSelf = 'flex-start';
    if (token === 'self-end') out.alignSelf = 'flex-end';

    // absolute positioning
    if (token === 'absolute') out.position = 'absolute';

    // borders/radius
    if (token === 'border') out.borderWidth = 1;
    if (token === 'border-2') out.borderWidth = 2;
    if (token === 'border-b') out.borderBottomWidth = 1;
    if (token === 'border-t') out.borderTopWidth = 1;
    if (token === 'border-l') out.borderLeftWidth = 1;
    if (token === 'border-r') out.borderRightWidth = 1;
    if (token === 'rounded-sm') out.borderRadius = 8;
    if (token === 'rounded-md') out.borderRadius = 12;
    if (token === 'rounded-lg') out.borderRadius = 16;
    if (token === 'rounded-xl') out.borderRadius = 12;
    if (token === 'rounded-2xl') out.borderRadius = 24;
    if (token === 'rounded-full') out.borderRadius = 999;
    if (token === 'rounded-t-3xl') {
      out.borderTopLeftRadius = 24;
      out.borderTopRightRadius = 24;
    }

    if (token === 'overflow-hidden') out.overflow = 'hidden';

    // gap
    const gap = token.match(/^gap-(\d+(?:\.\d+)?)$/);
    if (gap) {
      const v = spacingFromTailwindNumber(gap[1]);
      if (v != null) out.gap = v;
    }

    // padding/margin
    const padAll = token.match(/^p-(\d+(?:\.\d+)?)$/);
    if (padAll) {
      const v = spacingFromTailwindNumber(padAll[1]);
      if (v != null) out.padding = v;
    }

    const px = token.match(/^px-(\d+(?:\.\d+)?)$/);
    if (px) {
      const v = spacingFromTailwindNumber(px[1]);
      if (v != null) out.paddingHorizontal = v;
    }
    const py = token.match(/^py-(\d+(?:\.\d+)?)$/);
    if (py) {
      const v = spacingFromTailwindNumber(py[1]);
      if (v != null) out.paddingVertical = v;
    }
    const pt = token.match(/^pt-(\d+(?:\.\d+)?)$/);
    if (pt) {
      const v = spacingFromTailwindNumber(pt[1]);
      if (v != null) out.paddingTop = v;
    }
    const pb = token.match(/^pb-(\d+(?:\.\d+)?)$/);
    if (pb) {
      const v = spacingFromTailwindNumber(pb[1]);
      if (v != null) out.paddingBottom = v;
    }

    const mt = token.match(/^mt-(\d+(?:\.\d+)?)$/);
    if (mt) {
      const v = spacingFromTailwindNumber(mt[1]);
      if (v != null) out.marginTop = v;
    }
    const mb = token.match(/^mb-(\d+(?:\.\d+)?)$/);
    if (mb) {
      const v = spacingFromTailwindNumber(mb[1]);
      if (v != null) out.marginBottom = v;
    }
    const mx = token.match(/^mx-(\d+(?:\.\d+)?)$/);
    if (mx) {
      const v = spacingFromTailwindNumber(mx[1]);
      if (v != null) out.marginHorizontal = v;
    }

    // width/height
    if (token === 'w-full') out.width = '100%';
    if (token === 'h-full') out.height = '100%';
    if (token === 'w-screen') out.width = '100%';
    if (token === 'h-screen') out.height = '100%';

    const w = token.match(/^w-(\d+(?:\.\d+)?)$/);
    if (w) {
      const v = spacingFromTailwindNumber(w[1]);
      if (v != null) out.width = v;
    }
    const h = token.match(/^h-(\d+(?:\.\d+)?)$/);
    if (h) {
      const v = spacingFromTailwindNumber(h[1]);
      if (v != null) out.height = v;
    }

    const minW = token.match(/^min-w-\[(.+)\]$/);
    if (minW) {
      const v = parsePxValue(minW[1]);
      if (v != null) out.minWidth = v;
    }

    // top/bottom/left/right offsets
    const top = token.match(/^top-(\d+(?:\.\d+)?)$/);
    if (top) {
      const v = spacingFromTailwindNumber(top[1]);
      if (v != null) out.top = v;
    }
    const bottom = token.match(/^bottom-(\d+(?:\.\d+)?)$/);
    if (bottom) {
      const v = spacingFromTailwindNumber(bottom[1]);
      if (v != null) out.bottom = v;
    }
    const left = token.match(/^left-(\d+(?:\.\d+)?)$/);
    if (left) {
      const v = spacingFromTailwindNumber(left[1]);
      if (v != null) out.left = v;
    }
    const right = token.match(/^right-(\d+(?:\.\d+)?)$/);
    if (right) {
      const v = spacingFromTailwindNumber(right[1]);
      if (v != null) out.right = v;
    }

    // text
    if (token === 'text-center') out.textAlign = 'center';
    if (token === 'text-left') out.textAlign = 'left';
    if (token === 'text-right') out.textAlign = 'right';

    if (token === 'text-xs') out.fontSize = 11;
    if (token === 'text-sm') out.fontSize = 13;
    if (token === 'text-base') out.fontSize = 15;
    if (token === 'text-lg') out.fontSize = 18;
    if (token === 'text-xl') out.fontSize = 20;
    if (token === 'text-2xl') out.fontSize = 24;
    if (token === 'text-3xl') out.fontSize = 28;
    if (token === 'text-4xl') out.fontSize = 32;

    const textArb = token.match(/^text-\[(\d+(?:\.\d+)?)px\]$/);
    if (textArb) {
      const v = Number.parseFloat(textArb[1] ?? '');
      if (Number.isFinite(v)) out.fontSize = v;
    }
    // text-[#RRGGBB]/AA (AA = 0-100)
    const textHexAlpha = token.match(/^text-\[#([0-9a-fA-F]{6})\]\/(\d+(?:\.\d+)?)$/);
    if (textHexAlpha) {
      const hex = `#${textHexAlpha[1]}`;
      const alpha = Number.parseFloat(textHexAlpha[2] ?? '');
      out.color = rgbaFromHex(hex, Number.isFinite(alpha) ? alpha / 100 : 1);
    }

    if (token === 'font-bold') out.fontWeight = WEIGHT.bold;
    if (token === 'font-semibold') out.fontWeight = WEIGHT.semibold;
    if (token === 'font-medium') out.fontWeight = WEIGHT.medium;

    if (token === 'leading-5') out.lineHeight = 20;
    if (token === 'leading-4') out.lineHeight = 16;
    if (token === 'leading-6') out.lineHeight = 24;

    if (token === 'tabular-nums') out.fontVariant = ['tabular-nums'];

    if (token === 'line-through') out.textDecorationLine = 'line-through';
    if (token === 'underline') out.textDecorationLine = 'underline';
    if (token === 'uppercase') out.textTransform = 'uppercase';
    if (token === 'lowercase') out.textTransform = 'lowercase';
    if (token === 'capitalize') out.textTransform = 'capitalize';

    // letter-spacing (tracking)
    const tracking = token.match(/^tracking-(tight|normal|wide|wider|widest)$/);
    if (tracking) {
      const map: Record<string, number> = { tight: -0.5, normal: 0, wide: 0.5, wider: 1, widest: 2 };
      const v = map[tracking[1] ?? ''];
      if (v != null) out.letterSpacing = v;
    }

    // colors: bg-*/text-*/border-*
    if (token.startsWith('bg-') || token.startsWith('text-')) {
      const parsed = colorFromToken(token);
      if (parsed.color) {
        out[token.startsWith('bg-') ? 'backgroundColor' : 'color'] = parsed.alpha == null
          ? parsed.color
          : rgbaFromHex(parsed.color, parsed.alpha);
      }
    }

    const borderColor = token.match(/^border-([a-z0-9-]+)(?:\/(\d+(?:\.\d+)?))?$/);
    if (borderColor) {
      const group = borderColor[1] ?? '';
      const op = borderColor[2];
      const base = BASE_COLORS[group];
      if (base) {
        if (op == null) out.borderColor = base;
        else out.borderColor = rgbaFromHex(base, Number.parseFloat(op) / 100);
      }
    }
  }

  return out;
}

