import { View, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import {
  BRAND, BRAND_BG_STRONG,
  GREEN, GREEN_BG, RED, RED_BG, YELLOW, YELLOW_BG, BLUE, BLUE_BG,
  FONT, WEIGHT, RADIUS, SPACE,
} from '../../lib/theme';

type Variant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'brand' | 'outline';
type Size    = 'sm' | 'md';

interface Props {
  label:    string;
  variant?: Variant;
  size?:    Size;
  dot?:     boolean;
}

type ColorSet = { bg: string; text: string; border?: string };

function getColors(variant: Variant, fallbackBg: string, fallbackText: string): ColorSet {
  switch (variant) {
    case 'brand':   return { bg: BRAND_BG_STRONG, text: BRAND };
    case 'success': return { bg: GREEN_BG,        text: GREEN };
    case 'error':   return { bg: RED_BG,          text: RED };
    case 'warning': return { bg: YELLOW_BG,       text: YELLOW };
    case 'info':    return { bg: BLUE_BG,         text: BLUE };
    case 'outline': return { bg: 'transparent',   text: BRAND, border: BRAND };
    default:        return { bg: fallbackBg,       text: fallbackText };
  }
}

// Legacy plan-specific colors (backwards compat)
const PLAN_COLORS: Record<string, ColorSet> = {
  pro:          { bg: BLUE_BG,          text: BLUE },
  yearly:       { bg: `#6366f118`,      text: '#6366f1' },
  ultra:        { bg: YELLOW_BG,        text: YELLOW },
  ultra_yearly: { bg: `#f9731618`,      text: '#f97316' },
};

export function Badge({ label, variant = 'default', size = 'sm', dot }: Props) {
  const { colors } = useTheme();

  const planColor = PLAN_COLORS[label];
  const c: ColorSet = planColor
    ? planColor
    : getColors(variant, colors.hover, colors.textSub);

  const px = size === 'sm' ? SPACE.sm  : SPACE.md;
  const py = size === 'sm' ? 2          : 4;
  const fs = size === 'sm' ? FONT.xs    : FONT.sm;

  return (
    <View
      style={{
        alignSelf:        'flex-start',
        flexDirection:    'row',
        alignItems:       'center',
        gap:              4,
        paddingHorizontal: px,
        paddingVertical:   py,
        borderRadius:     RADIUS.full,
        backgroundColor:  c.bg,
        ...(c.border && { borderWidth: 1, borderColor: c.border }),
      }}
    >
      {dot && (
        <View style={{ width: 5, height: 5, borderRadius: RADIUS.full, backgroundColor: c.text }} />
      )}
      <Text style={{ fontSize: fs, fontWeight: WEIGHT.bold, color: c.text, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
  );
}
