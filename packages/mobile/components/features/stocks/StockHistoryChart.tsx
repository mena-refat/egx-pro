import { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../../hooks/useTheme';
import { FONT, GREEN, RADIUS, RED, SPACE, WEIGHT } from '../../../lib/theme';
import type { HistoryRange, StockHistoryPoint } from '../../../hooks/useStockHistory';

const RANGES: HistoryRange[] = ['1w', '1mo', '3mo', '6mo', '1y'];

function buildPath(points: StockHistoryPoint[], width: number, height: number) {
  if (points.length < 2) return '';
  const prices = points.map((p) => p.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const spread = Math.max(max - min, 0.0001);
  return points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p.close - min) / spread) * height;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export function StockHistoryChart({
  history,
  range,
  onRangeChange,
  loading,
  changePercent,
}: {
  history: StockHistoryPoint[];
  range: HistoryRange;
  onRangeChange: (r: HistoryRange) => void;
  loading: boolean;
  changePercent: number;
}) {
  const { colors } = useTheme();
  const lineColor = changePercent >= 0 ? GREEN : RED;
  const path = useMemo(() => buildPath(history, 320, 130), [history]);

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: RADIUS.xl,
        padding: SPACE.md,
        marginBottom: SPACE.md,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACE.sm }}>
        <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>
          حركة السعر
        </Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {RANGES.map((r) => (
            <Pressable
              key={r}
              onPress={() => onRangeChange(r)}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: r === range ? `${lineColor}22` : colors.bgAlt,
                borderWidth: 1,
                borderColor: r === range ? lineColor : colors.border,
              }}
            >
              <Text style={{ color: r === range ? lineColor : colors.textSub, fontSize: FONT.xs }}>{r}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ height: 150, alignItems: 'center', justifyContent: 'center' }}>
        {loading ? (
          <ActivityIndicator color={lineColor} />
        ) : history.length >= 2 ? (
          <Svg width="100%" height={150} viewBox="0 0 320 150">
            <Path d={path} fill="none" stroke={lineColor} strokeWidth={2.5} />
          </Svg>
        ) : (
          <Text style={{ color: colors.textMuted, fontSize: FONT.xs }}>لا توجد بيانات كافية للرسم</Text>
        )}
      </View>
    </View>
  );
}
