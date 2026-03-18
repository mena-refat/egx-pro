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
      <View className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5 gap-4">
        <Skeleton height={14} className="w-32" />
        <Skeleton height={36} className="w-48" />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Skeleton height={40} />
          </View>
          <View className="flex-1">
            <Skeleton height={40} />
          </View>
        </View>
      </View>
    );
  }

  const isProfit = totalGainLoss > 0;
  const isLoss = totalGainLoss < 0;
  const gainColor = isProfit
    ? 'text-emerald-400'
    : isLoss
    ? 'text-red-400'
    : 'text-slate-400';

  // keep icon colors aligned with the same semantic palette as gainColor
  const gainColorHex = isProfit
    ? '#34d399' // emerald-400
    : isLoss
    ? '#f87171' // red-400
    : '#94a3b8'; // slate-400

  return (
    <View className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5 gap-4">
      <Text className="text-xs text-slate-500 uppercase tracking-wider">
        القيمة الإجمالية للمحفظة
      </Text>

      <View className="flex-row items-baseline gap-2">
        <Text className="text-3xl font-bold text-white tabular-nums">
          {fmt(totalValue)}
        </Text>
        <Text className="text-base text-slate-400">EGP</Text>
      </View>

      <View className="flex-row items-center gap-2">
        {isProfit ? (
          <TrendingUp size={14} color={gainColorHex} />
        ) : isLoss ? (
          <TrendingDown size={14} color={gainColorHex} />
        ) : null}
        <Text className={`text-sm font-semibold ${gainColor}`}>
          {isProfit ? '+' : ''}
          {fmt(totalGainLoss)} EGP (
          {isProfit ? '+' : ''}
          {totalGainLossPercent.toFixed(2)}%)
        </Text>
      </View>

      <View className="flex-row gap-3 pt-2 border-t border-white/[0.06]">
        <View className="flex-1">
          <Text className="text-xs text-slate-500 mb-1">سعر الشراء</Text>
          <Text className="text-sm font-semibold text-white tabular-nums">
            {fmt(totalCost)} EGP
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-slate-500 mb-1">الربح / الخسارة</Text>
          <Text className={`text-sm font-semibold tabular-nums ${gainColor}`}>
            {isProfit ? '+' : ''}
            {fmt(totalGainLoss)} EGP
          </Text>
        </View>
      </View>
    </View>
  );
}

