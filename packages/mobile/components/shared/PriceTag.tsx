import { View, Text } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { GREEN_BG, RED_BG, RADIUS, SPACE, WEIGHT } from '../../lib/theme';

interface Props {
  change: number;
  changePercent: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function PriceTag({ change, changePercent, size = 'md', showIcon = true }: Props) {
  const safeChange = change ?? 0;
  const safePct = isFinite(changePercent) ? changePercent : 0;
  const isUp = safeChange > 0;
  const isDown = safeChange < 0;
  const color = isUp ? '#4ade80' : isDown ? '#f87171' : '#8b949e';
  const { colors } = useTheme();
  const bgColor = isUp ? GREEN_BG
    : isDown ? RED_BG
    : `${colors.textSub}14`; // small neutral glass effect

  const sizes = { sm: 11, md: 13, lg: 16 } as const;
  const iconSz = { sm: 12, md: 14, lg: 16 }[size];
  const prefix = isUp ? '+' : '';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACE.xs,
        paddingHorizontal: SPACE.sm,
        paddingVertical: SPACE.xs,
        borderRadius: RADIUS.lg,
        backgroundColor: bgColor,
      }}
    >
      {showIcon && (
        isUp ? (
          <TrendingUp size={iconSz} color={color} />
        ) : isDown ? (
          <TrendingDown size={iconSz} color={color} />
        ) : (
          <Minus size={iconSz} color={color} />
        )
      )}
      <Text style={{ color, fontSize: sizes[size], fontWeight: WEIGHT.semibold }}>
        {prefix}
        {safePct.toFixed(2)}%
      </Text>
    </View>
  );
}

export function StockPrice({ price, size = 'md' }: { price: number; size?: 'sm' | 'md' | 'lg' }) {
  const { colors } = useTheme();
  const sizes = { sm: 13, md: 15, lg: 20 } as const;
  const safePrice = isFinite(price) ? price : 0;
  return (
    <Text
      style={{
        color: colors.text,
        fontSize: sizes[size],
        fontWeight: WEIGHT.bold,
        fontVariant: ['tabular-nums'],
      }}
    >
      {safePrice.toFixed(2)}
    </Text>
  );
}
