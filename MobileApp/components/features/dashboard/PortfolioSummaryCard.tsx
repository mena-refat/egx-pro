import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { Skeleton } from '../../ui/Skeleton';

function fmtMoney(n: number) {
  return Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  loading: boolean;
  onPress: () => void;
}

export function PortfolioSummaryCard({
  totalValue, totalCost, totalGainLoss, totalGainLossPercent, loading, onPress,
}: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const isUp = totalGainLoss > 0;
  const isDown = totalGainLoss < 0;
  const gainColor = isUp ? '#4ade80' : isDown ? '#f87171' : colors.textSub;
  const gainBg = isUp ? '#4ade8018' : isDown ? '#f8717118' : colors.hover;

  if (loading) {
    return (
      <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, marginHorizontal: 16, overflow: 'hidden' }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20, alignItems: 'center', gap: 12 }}>
          <Skeleton height={10} className="w-32" />
          <Skeleton height={52} className="w-56" />
          <Skeleton height={22} className="w-44" />
        </View>
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border }}>
          {[1, 2].map((i) => (
            <View key={i} style={{ flex: 1, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center', gap: 6 }}>
              <Skeleton height={10} className="w-20" />
              <Skeleton height={14} className="w-28" />
            </View>
          ))}
        </View>
      </View>
    );
  }

  const [whole, dec] = fmtMoney(totalValue).split('.');
  const sign = isUp ? '+' : isDown ? '-' : '';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.hover : colors.card,
        borderColor: colors.border, borderWidth: 1,
        borderRadius: 20, marginHorizontal: 16, overflow: 'hidden',
      })}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20, alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted, fontSize: 11, letterSpacing: 1.5, marginBottom: 14 }}>
          قيمة محفظتي
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4, marginBottom: 12 }}>
          <Text style={{ color: colors.textMuted, fontSize: isCompact ? 15 : 18, fontWeight: '500', marginBottom: 4 }}>EGP</Text>
          <Text style={{ color: colors.text, fontSize: isCompact ? 38 : 48, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] }}>
            {whole}
          </Text>
          <Text style={{ color: colors.text, fontSize: isCompact ? 19 : 24, fontWeight: '600', marginBottom: 6, fontVariant: ['tabular-nums'] }}>
            .{dec}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ color: gainColor, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
            {sign}EGP {fmtMoney(totalGainLoss)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: gainBg }}>
            <Text style={{ color: gainColor, fontSize: 12, fontWeight: '800' }}>
              {isUp ? '▲' : isDown ? '▼' : '●'}
            </Text>
            <Text style={{ color: gainColor, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {Math.abs(totalGainLossPercent).toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border }}>
        <View style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.border }}>
          <Text style={{ color: colors.textMuted, fontSize: 10, letterSpacing: 0.5, marginBottom: 4 }}>قيمة الشراء</Text>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
            {totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })} EGP
          </Text>
        </View>
        <View style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: 10, letterSpacing: 0.5, marginBottom: 4 }}>الربح / الخسارة</Text>
          <Text style={{ color: gainColor, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
            {sign}{fmtMoney(totalGainLoss)} EGP
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
