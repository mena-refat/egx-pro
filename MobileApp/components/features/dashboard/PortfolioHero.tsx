import { View, Text } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { Skeleton } from '../../ui/Skeleton';

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
  totalValue,
  totalCost,
  totalGainLoss,
  totalGainLossPercent,
  loading,
}: Props) {
  if (loading) {
    return (
      <View className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden">
        <View className="flex-row divide-x divide-[#30363d]">
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
  const gainColor = isProfit ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-[#8b949e]';
  const gainColorHex = isProfit ? '#4ade80' : isLoss ? '#f87171' : '#8b949e';

  return (
    <View className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden">
      {/* Top: Total Value */}
      <View className="px-5 pt-5 pb-4 border-b border-[#21262d]">
        <Text className="text-xs text-[#656d76] uppercase tracking-wider mb-1">
          القيمة الإجمالية للمحفظة
        </Text>
        <View className="flex-row items-baseline gap-2">
          <Text className="text-3xl font-bold text-[#e6edf3] tabular-nums">{fmt(totalValue)}</Text>
          <Text className="text-base text-[#8b949e]">EGP</Text>
        </View>
        <View className="flex-row items-center gap-2 mt-2">
          {isProfit ? (
            <TrendingUp size={13} color={gainColorHex} />
          ) : isLoss ? (
            <TrendingDown size={13} color={gainColorHex} />
          ) : null}
          <Text className={`text-sm font-semibold ${gainColor}`}>
            {isProfit ? '+' : ''}{fmt(totalGainLoss)} EGP ({isProfit ? '+' : ''}{totalGainLossPercent.toFixed(2)}%)
          </Text>
        </View>
      </View>

      {/* Bottom: Cost / Gain row */}
      <View className="flex-row">
        <View className="flex-1 px-5 py-3.5 border-r border-[#21262d]">
          <Text className="text-xs text-[#656d76] mb-1">سعر الشراء</Text>
          <Text className="text-sm font-semibold text-[#e6edf3] tabular-nums">{fmt(totalCost)} EGP</Text>
        </View>
        <View className="flex-1 px-5 py-3.5">
          <Text className="text-xs text-[#656d76] mb-1">الربح / الخسارة</Text>
          <Text className={`text-sm font-semibold tabular-nums ${gainColor}`}>
            {isProfit ? '+' : ''}{fmt(totalGainLoss)} EGP
          </Text>
        </View>
      </View>
    </View>
  );
}
