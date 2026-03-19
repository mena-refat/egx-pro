import { Text, View } from 'react-native';

interface Props {
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  cardBackground: string;
  borderColor: string;
  textColor: string;
  mutedTextColor: string;
}

export function PortfolioPerformanceCard({
  totalCost,
  totalGainLoss,
  totalGainLossPercent,
  cardBackground,
  borderColor,
  textColor,
  mutedTextColor,
}: Props) {
  const isPositive = totalGainLoss > 0;
  const isNegative = totalGainLoss < 0;
  const accent = isPositive ? '#7ee2a8' : isNegative ? '#ff8b94' : mutedTextColor;

  return (
    <View style={{ backgroundColor: cardBackground, borderColor, borderWidth: 1, borderRadius: 16, padding: 16, gap: 14 }}>
      <Text style={{ color: textColor, fontSize: 16, fontWeight: '700' }}>Portfolio Performance</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ gap: 4 }}>
          <Text style={{ color: mutedTextColor, fontSize: 12 }}>Invested</Text>
          <Text style={{ color: textColor, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })} EGP
          </Text>
        </View>
        <View style={{ gap: 4, alignItems: 'flex-end' }}>
          <Text style={{ color: mutedTextColor, fontSize: 12 }}>P/L</Text>
          <Text style={{ color: accent, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {isPositive ? '+' : ''}{totalGainLoss.toLocaleString('en-US', { maximumFractionDigits: 0 })} EGP
          </Text>
        </View>
      </View>
      <View style={{ height: 8, backgroundColor: '#94a3b81a', borderRadius: 999, overflow: 'hidden' }}>
        <View
          style={{
            height: 8,
            width: `${Math.min(Math.abs(totalGainLossPercent), 100)}%`,
            backgroundColor: accent,
          }}
        />
      </View>
    </View>
  );
}
