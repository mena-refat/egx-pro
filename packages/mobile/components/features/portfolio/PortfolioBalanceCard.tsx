import { View, Text } from 'react-native';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react-native';

interface Props {
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  cardBackground: string;
  borderColor: string;
  textColor: string;
  mutedTextColor: string;
}

export function PortfolioBalanceCard({
  totalValue, totalGainLoss, totalGainLossPercent,
  cardBackground, borderColor, textColor, mutedTextColor,
}: Props) {
  const isPositive = totalGainLoss > 0;
  const isNegative = totalGainLoss < 0;
  const gainColor = isPositive ? '#4ade80' : isNegative ? '#f87171' : mutedTextColor;
  const gainBg   = isPositive ? '#4ade8018' : isNegative ? '#f8717118' : '#8c959f18';

  return (
    <View style={{
      backgroundColor: cardBackground, borderColor, borderWidth: 1,
      borderRadius: 16, paddingHorizontal: 20, paddingVertical: 20, gap: 12,
    }}>
      <Text style={{ color: mutedTextColor, fontSize: 12, fontWeight: '600' }}>إجمالي المحفظة</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <Text style={{ color: textColor, fontSize: 40, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
          {totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </Text>
        <Text style={{ color: mutedTextColor, fontSize: 15, marginBottom: 6 }}>EGP</Text>
      </View>

      <View style={{
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8,
        backgroundColor: gainBg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
      }}>
        {isPositive
          ? <TrendingUp size={14} color={gainColor} />
          : isNegative
          ? <TrendingDown size={14} color={gainColor} />
          : <Minus size={14} color={gainColor} />}
        <Text style={{ color: gainColor, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {isPositive ? '+' : ''}{totalGainLoss.toLocaleString('en-US', { maximumFractionDigits: 0 })} EGP
        </Text>
        <Text style={{ color: gainColor, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          ({isPositive ? '+' : ''}{totalGainLossPercent.toFixed(2)}%)
        </Text>
      </View>
    </View>
  );
}
