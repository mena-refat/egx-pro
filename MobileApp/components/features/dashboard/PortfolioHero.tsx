import { View, Text } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { Skeleton } from '../../ui/Skeleton';
import { useTheme } from '../../../hooks/useTheme';

interface Props {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  loading: boolean;
}

function fmt(n: number) {
  return n.toLocaleString('ar-EG', { maximumFractionDigits: 0 });
}

export function PortfolioHero({
  totalValue, totalCost, totalGainLoss, totalGainLossPercent, loading,
}: Props) {
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl overflow-hidden">
        <View className="flex-row">
          {[1, 2, 3].map((i) => (
            <View key={i} className="flex-1 p-4 gap-2">
              <Skeleton height={10} className="w-16" />
              <Skeleton height={24} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  const isProfit = totalGainLoss > 0;
  const isLoss = totalGainLoss < 0;
  const gainColor = isProfit ? '#4ade80' : isLoss ? '#f87171' : colors.textSub;

  return (
    <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl overflow-hidden">
      {/* Top: Total Value */}
      <View className="px-5 pt-5 pb-4" style={{ borderBottomColor: colors.border2, borderBottomWidth: 1 }}>
        <Text style={{ color: colors.textMuted }} className="text-xs uppercase tracking-wider mb-1">
          القيمة الإجمالية للمحفظة
        </Text>
        <View className="flex-row items-baseline gap-2">
          <Text style={{ color: colors.text }} className="text-3xl font-bold tabular-nums">{fmt(totalValue)}</Text>
          <Text style={{ color: colors.textMuted }} className="text-base">EGP</Text>
        </View>
        <View className="flex-row items-center gap-2 mt-2">
          {isProfit ? <TrendingUp size={13} color={gainColor} /> : isLoss ? <TrendingDown size={13} color={gainColor} /> : null}
          <Text className="text-sm font-semibold tabular-nums" style={{ color: gainColor }}>
            {isProfit ? '+' : ''}{fmt(totalGainLoss)} EGP ({isProfit ? '+' : ''}{totalGainLossPercent.toFixed(2)}%)
          </Text>
        </View>
      </View>

      {/* Bottom: Cost / Gain */}
      <View className="flex-row">
        <View className="flex-1 px-5 py-3.5" style={{ borderRightColor: colors.border2, borderRightWidth: 1 }}>
          <Text style={{ color: colors.textMuted }} className="text-xs mb-1">سعر الشراء</Text>
          <Text style={{ color: colors.text }} className="text-sm font-semibold tabular-nums">{fmt(totalCost)} EGP</Text>
        </View>
        <View className="flex-1 px-5 py-3.5">
          <Text style={{ color: colors.textMuted }} className="text-xs mb-1">الربح / الخسارة</Text>
          <Text className="text-sm font-semibold tabular-nums" style={{ color: gainColor }}>
            {isProfit ? '+' : ''}{fmt(totalGainLoss)} EGP
          </Text>
        </View>
      </View>
    </View>
  );
}
