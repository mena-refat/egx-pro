import { View, Text } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

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
  const color = isUp ? '#10b981' : isDown ? '#ef4444' : '#94a3b8';
  const bgColor = isUp ? 'bg-emerald-500/10' : isDown ? 'bg-red-500/10' : 'bg-white/5';
  const sizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' } as const;
  const iconSz = { sm: 12, md: 14, lg: 16 }[size];
  const prefix = isUp ? '+' : '';

  return (
    <View className={`flex-row items-center gap-1 px-2 py-1 rounded-lg ${bgColor}`}>
      {showIcon &&
        (isUp ? (
          <TrendingUp size={iconSz} color={color} />
        ) : isDown ? (
          <TrendingDown size={iconSz} color={color} />
        ) : (
          <Minus size={iconSz} color={color} />
        ))}
      <Text className={`${sizes[size]} font-semibold`} style={{ color }}>
        {prefix}
        {safePct.toFixed(2)}%
      </Text>
    </View>
  );
}

export function StockPrice({ price, size = 'md' }: { price: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' } as const;
  const safePrice = isFinite(price) ? price : 0;
  return (
    <Text className={`${sizes[size]} font-bold text-white tabular-nums`}>
      {safePrice.toFixed(2)}
    </Text>
  );
}

