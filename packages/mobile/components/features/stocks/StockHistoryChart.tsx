import { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../../hooks/useTheme';
import { FONT, GREEN, RADIUS, RED, SPACE, WEIGHT } from '../../../lib/theme';
import type { HistoryRange, StockHistoryPoint } from '../../../hooks/useStockHistory';

const RANGES: HistoryRange[] = ['1w', '1mo', '3mo', '6mo', '1y', '5y'];

const W = 320;
const PATH_H = 120;   // height the price line draws within
const T = 28;         // top margin  → max label lives in y: 0..T
const B = 28;         // bottom margin → min label lives in y: T+PATH_H..SVG_H
const SVG_H = T + PATH_H + B; // 176 — total SVG height

function buildPath(points: StockHistoryPoint[], w: number) {
  if (points.length < 2) return '';
  const prices = points.map((p) => p.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const spread = Math.max(max - min, 0.0001);
  return points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      // path y: T (peak) → T + PATH_H (trough) — never enters top/bottom margins
      const y = T + PATH_H - ((p.close - min) / spread) * PATH_H;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function fmt(v: number) {
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const { t } = useTranslation();

  // Color reflects the selected period direction
  const lineColor = useMemo(() => {
    if (history.length >= 2) {
      return history[history.length - 1].close >= history[0].close ? GREEN : RED;
    }
    return changePercent >= 0 ? GREEN : RED;
  }, [history, changePercent]);

  const path = useMemo(() => buildPath(history, W), [history]);

  const { minPrice, maxPrice, minPtX, maxPtX } = useMemo(() => {
    if (history.length < 2) return { minPrice: 0, maxPrice: 0, minPtX: 0, maxPtX: 0 };
    const prices = history.map((p) => p.close);
    let minIdx = 0;
    let maxIdx = 0;
    prices.forEach((p, i) => {
      if (p < prices[minIdx]) minIdx = i;
      if (p > prices[maxIdx]) maxIdx = i;
    });
    return {
      minPrice: prices[minIdx],
      maxPrice: prices[maxIdx],
      minPtX: (minIdx / (history.length - 1)) * W,
      maxPtX: (maxIdx / (history.length - 1)) * W,
    };
  }, [history]);

  const hasData = history.length >= 2;

  // Smart text anchor: if point is in the right 55%, anchor text to end (text extends left)
  const maxAnchor = maxPtX > W * 0.55 ? 'end' : 'start';
  const minAnchor = minPtX > W * 0.55 ? 'end' : 'start';
  const maxTextX = maxAnchor === 'end' ? maxPtX - 8 : maxPtX + 8;
  const minTextX = minAnchor === 'end' ? minPtX - 8 : minPtX + 8;

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
      {/* Header + range selector */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.sm }}>
        <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>
          {t('stockDetail.priceMovement')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {RANGES.map((r) => (
            <Pressable
              key={r}
              onPress={() => onRangeChange(r)}
              style={{
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: 999,
                backgroundColor: r === range ? `${lineColor}22` : colors.bgAlt,
                borderWidth: 1,
                borderColor: r === range ? lineColor : colors.border,
              }}
            >
              <Text style={{ color: r === range ? lineColor : colors.textSub, fontSize: 11 }}>{r}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Chart — SVG_H px tall, path lives in the middle T..T+PATH_H strip */}
      <View style={{ height: SVG_H, justifyContent: 'center' }}>
        {loading ? (
          <ActivityIndicator color={lineColor} />
        ) : hasData ? (
          <Svg width="100%" height={SVG_H} viewBox={`0 0 ${W} ${SVG_H}`}>
            {/* Price line — stays strictly within y: T to T+PATH_H */}
            <Path d={path} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinejoin="round" />

            {/*
              MAX label — lives in the TOP margin (y: 0..T = 0..28)
              Dot is at the top edge of the path (y=T), label text above it
            */}
            <Circle cx={maxPtX} cy={T} r={3} fill={lineColor} />
            <SvgText
              x={maxTextX}
              y={T - 10}
              textAnchor={maxAnchor}
              fill={lineColor}
              fontSize={10}
              fontWeight="bold"
            >
              {`↑ ${fmt(maxPrice)}`}
            </SvgText>

            {/*
              MIN label — lives in the BOTTOM margin (y: T+PATH_H..SVG_H = 148..176)
              Dot is at the bottom edge of the path (y=T+PATH_H), label text below it
            */}
            <Circle cx={minPtX} cy={T + PATH_H} r={3} fill={lineColor} />
            <SvgText
              x={minTextX}
              y={T + PATH_H + 18}
              textAnchor={minAnchor}
              fill={lineColor}
              fontSize={10}
              fontWeight="bold"
            >
              {`↓ ${fmt(minPrice)}`}
            </SvgText>
          </Svg>
        ) : (
          <Text style={{ color: colors.textMuted, fontSize: FONT.xs }}>{t('stockDetail.notEnoughData')}</Text>
        )}
      </View>
    </View>
  );
}
