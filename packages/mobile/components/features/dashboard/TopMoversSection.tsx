import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import type { Stock } from '../../../types/stock';

interface Props {
  topGainers: Stock[];
  topLosers: Stock[];
  onPressTicker: (ticker: string) => void;
}

export function TopMoversSection({ topGainers, topLosers, onPressTicker }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;

  return (
    <View style={{ flexDirection: isCompact ? 'column' : 'row', gap: 12 }}>
      {topGainers.length > 0 && (
        <View style={{ flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: '#4ade8025', borderRadius: 20, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#4ade8008', borderBottomWidth: 1, borderBottomColor: '#4ade8018' }}>
            <TrendingUp size={12} color="#4ade80" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#4ade80' }}>صاعدة</Text>
          </View>
          {topGainers.map((s, i) => (
            <Pressable
              key={s.ticker}
              onPress={() => onPressTicker(s.ticker)}
              style={({ pressed }) => [
                { backgroundColor: pressed ? colors.hover : 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
                i < topGainers.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View>
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{s.ticker}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 1 }}>{s.price.toFixed(2)}</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#4ade80', fontVariant: ['tabular-nums'] }}>
                +{s.changePercent.toFixed(2)}%
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {topLosers.length > 0 && (
        <View style={{ flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: '#f8717125', borderRadius: 20, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f8717108', borderBottomWidth: 1, borderBottomColor: '#f8717118' }}>
            <TrendingDown size={12} color="#f87171" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#f87171' }}>هابطة</Text>
          </View>
          {topLosers.map((s, i) => (
            <Pressable
              key={s.ticker}
              onPress={() => onPressTicker(s.ticker)}
              style={({ pressed }) => [
                { backgroundColor: pressed ? colors.hover : 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
                i < topLosers.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View>
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{s.ticker}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 1 }}>{s.price.toFixed(2)}</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#f87171', fontVariant: ['tabular-nums'] }}>
                {s.changePercent.toFixed(2)}%
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
