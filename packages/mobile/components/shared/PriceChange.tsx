import { View, Text } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { POSITIVE, NEGATIVE, NEUTRAL, GREEN_BG, RED_BG, FONT, WEIGHT, RADIUS, SPACE } from '../../lib/theme';

type Size   = 'sm' | 'md' | 'lg';
type Layout = 'row' | 'column';

interface PriceChangeProps {
  price?:      number;
  change?:     number;
  changePct?:  number;
  currency?:   'EGP' | 'USD';
  size?:       Size;
  showIcon?:   boolean;
  layout?:     Layout;
}

const FONT_MAP: Record<Size, { price: number; change: number; icon: number }> = {
  sm: { price: FONT.sm,   change: FONT.xs,   icon: 11 },
  md: { price: FONT.base, change: FONT.sm,   icon: 13 },
  lg: { price: FONT.xl,   change: FONT.base, icon: 15 },
};

export function PriceChange({
  price,
  change,
  changePct,
  currency  = 'EGP',
  size      = 'md',
  showIcon  = true,
  layout    = 'row',
}: PriceChangeProps) {
  const { colors } = useTheme();
  const f = FONT_MAP[size];

  const safeChange  = isFinite(change   ?? 0) ? (change   ?? 0) : 0;
  const safePct     = isFinite(changePct ?? 0) ? (changePct ?? 0) : 0;
  const isUp        = safeChange > 0 || safePct > 0;
  const isDown      = safeChange < 0 || safePct < 0;
  const color       = isUp ? POSITIVE : isDown ? NEGATIVE : NEUTRAL;
  const bg          = isUp ? GREEN_BG : isDown ? RED_BG   : 'transparent';
  const prefix      = isUp ? '+' : '';

  const currencySymbol = currency === 'EGP' ? 'ج.م' : '$';

  return (
    <View style={{ flexDirection: layout === 'row' ? 'row' : 'column', alignItems: layout === 'row' ? 'center' : 'flex-end', gap: SPACE.xs }}>
      {price !== undefined && (
        <Text style={{ color: colors.text, fontSize: f.price, fontWeight: WEIGHT.bold }}>
          {isFinite(price) ? price.toFixed(2) : '—'}{' '}
          <Text style={{ color: colors.textSub, fontWeight: WEIGHT.normal, fontSize: f.change }}>
            {currencySymbol}
          </Text>
        </Text>
      )}

      {(change !== undefined || changePct !== undefined) && (
        <View
          style={{
            flexDirection:     'row',
            alignItems:        'center',
            gap:               3,
            paddingHorizontal: SPACE.sm,
            paddingVertical:   3,
            borderRadius:      RADIUS.sm,
            backgroundColor:   bg,
          }}
        >
          {showIcon && (
            isUp   ? <TrendingUp   size={f.icon} color={color} /> :
            isDown ? <TrendingDown size={f.icon} color={color} /> :
                     <Minus        size={f.icon} color={color} />
          )}
          {changePct !== undefined && (
            <Text style={{ color, fontSize: f.change, fontWeight: WEIGHT.semibold }}>
              {prefix}{safePct.toFixed(2)}%
            </Text>
          )}
          {change !== undefined && changePct === undefined && (
            <Text style={{ color, fontSize: f.change, fontWeight: WEIGHT.semibold }}>
              {prefix}{safeChange.toFixed(2)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
