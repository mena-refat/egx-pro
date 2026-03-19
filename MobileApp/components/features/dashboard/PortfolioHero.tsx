import { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, Pressable, PanResponder, type LayoutChangeEvent } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle } from 'react-native-svg';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { Skeleton } from '../../ui/Skeleton';
import { useTheme } from '../../../hooks/useTheme';

// ─────────────────────── types ───────────────────────
interface Holding { buyDate: string; shares: number; avgPrice: number }

interface ChartPoint {
  x: number;       // timestamp ms
  value: number;   // portfolio value
  label: string;   // x-axis label
}

interface Props {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  loading: boolean;
  holdings?: Holding[];
}

// ─────────────────────── constants ───────────────────────
const RANGES = ['1أ', '1ش', '3ش', '6ش', '1س', '3س', '5س'] as const;
const RANGE_KEYS = ['1D', '1W', '1M', '6M', '1Y', '3Y', '5Y'] as const;
type Range = (typeof RANGE_KEYS)[number];

const CHART_H = 130;
const PAD = { top: 10, bottom: 6, left: 0, right: 0 };

// ─────────────────────── data helpers ───────────────────────
function sampleTimeline(range: Range): Date[] {
  const now = new Date();
  const out: Date[] = [];

  if (range === '1D') {
    for (let h = 0; h <= now.getHours(); h++) {
      const d = new Date(now); d.setHours(h, 0, 0, 0); out.push(d);
    }
    return out;
  }

  const days =
    range === '1W' ? 7 :
    range === '1M' ? 30 :
    range === '6M' ? 180 :
    range === '1Y' ? 365 :
    range === '3Y' ? 365 * 3 :
    365 * 5;

  // sample to max ~80 points for perf
  const step = Math.ceil(days / 80);
  for (let i = days - 1; i >= 0; i -= step) {
    const d = new Date(now); d.setDate(now.getDate() - i); d.setHours(0, 0, 0, 0);
    out.push(d);
  }
  out.push(new Date()); // always end with "now"
  return out;
}

function buildChartData(
  holdings: Holding[],
  totalCost: number,
  totalValue: number,
  range: Range,
): ChartPoint[] {
  const now = new Date();
  const timeline = sampleTimeline(range);
  if (!timeline.length) return [];

  const sorted = [...holdings].sort((a, b) => new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime());

  const getValueAt = (t: Date): number => {
    const tMs = t.getTime();
    const nowMs = now.getTime();
    if (tMs >= nowMs) return totalValue;
    if (!sorted.length) return totalCost;
    const firstMs = new Date(sorted[0].buyDate).getTime();
    if (tMs < firstMs) return 0;
    let cumulative = 0;
    for (const h of sorted) {
      const dMs = new Date(h.buyDate).getTime();
      if (tMs >= dMs) cumulative += h.shares * h.avgPrice;
      else break;
    }
    return cumulative;
  };

  return timeline.map((d, i) => {
    const isLast = i === timeline.length - 1;
    const value = isLast ? totalValue : getValueAt(d);
    const label = fmtLabel(d, range);
    return { x: d.getTime(), value, label };
  });
}

function fmtLabel(d: Date, range: Range): string {
  if (range === '1D') {
    let h = d.getHours(); const ampm = h < 12 ? 'ص' : 'م';
    if (h === 0) h = 12; else if (h > 12) h -= 12;
    return `${h}${ampm}`;
  }
  if (range === '1W') return `${d.getDate()}/${d.getMonth() + 1}`;
  if (range === '1M') return `${d.getDate()}`;
  if (range === '6M' || range === '1Y') {
    const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    return months[d.getMonth()]?.slice(0, 3) ?? '';
  }
  return `${d.getFullYear()}`;
}

function fmtTooltipDate(x: number, range: Range): string {
  const d = new Date(x);
  if (range === '1D') return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (range === '1W' || range === '1M') return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
  return d.toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' });
}

// ─────────────────────── SVG path builder ───────────────────────
function buildPaths(data: ChartPoint[], width: number, height: number): { line: string; area: string } {
  if (data.length < 2) return { line: '', area: '' };
  const values = data.map((d) => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const toX = (i: number) => (i / (data.length - 1)) * width;
  const toY = (v: number) => PAD.top + ((maxV - v) / range) * (height - PAD.top - PAD.bottom);

  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.value) }));

  let line = '';
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (i === 0) { line += `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`; continue; }
    const prev = pts[i - 1];
    const cpX = ((prev.x + p.x) / 2).toFixed(1);
    line += ` C ${cpX} ${prev.y.toFixed(1)} ${cpX} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }

  const last = pts[pts.length - 1];
  const first = pts[0];
  const area = `${line} L ${last.x.toFixed(1)} ${height} L ${first.x.toFixed(1)} ${height} Z`;

  return { line, area };
}

// ─────────────────────── PortfolioChart ───────────────────────
function PortfolioChart({
  holdings, totalCost, totalValue, isProfit, colors,
}: {
  holdings: Holding[];
  totalCost: number;
  totalValue: number;
  isProfit: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [range, setRange] = useState<Range>('1M');
  const [width, setWidth] = useState(0);
  const [cursor, setCursor] = useState<{ idx: number; px: number; py: number } | null>(null);

  const data = useMemo(
    () => buildChartData(holdings, totalCost, totalValue, range),
    [holdings, totalCost, totalValue, range],
  );

  const hasData = data.length > 1 && totalValue > 0;
  const lineColor = isProfit ? '#4ade80' : '#f87171';
  const gradId = `pgGrad_${range}`;

  const { line, area } = useMemo(
    () => width > 0 && hasData ? buildPaths(data, width, CHART_H) : { line: '', area: '' },
    [data, width, hasData],
  );

  // ── cursor helpers ──
  const values = data.map((d) => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const vRange = maxV - minV || 1;
  const toY = useCallback(
    (v: number) => PAD.top + ((maxV - v) / vRange) * (CHART_H - PAD.top - PAD.bottom),
    [maxV, vRange],
  );

  const panRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => hasData && width > 0,
      onMoveShouldSetPanResponder: () => hasData && width > 0,
      onPanResponderGrant: (e) => moveCursor(e.nativeEvent.locationX),
      onPanResponderMove: (e) => moveCursor(e.nativeEvent.locationX),
      onPanResponderRelease: () => setCursor(null),
      onPanResponderTerminate: () => setCursor(null),
    }),
  );

  const moveCursor = (lx: number) => {
    if (!data.length || width === 0) return;
    const ratio = Math.max(0, Math.min(1, lx / width));
    const idx = Math.round(ratio * (data.length - 1));
    const pt = data[idx];
    if (!pt) return;
    const px = (idx / (data.length - 1)) * width;
    const py = toY(pt.value);
    setCursor({ idx, px, py });
  };

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const cursorPoint = cursor ? data[cursor.idx] : null;

  return (
    <View style={{ gap: 12 }}>
      {/* Range selector */}
      <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
        {RANGE_KEYS.map((r, i) => {
          const isSelected = range === r;
          return (
            <Pressable
              key={r}
              onPress={() => { setRange(r); setCursor(null); }}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
                backgroundColor: isSelected ? '#8b5cf6' : colors.hover,
              }}
            >
              <Text style={{ color: isSelected ? '#fff' : colors.textSub, fontSize: 12, fontWeight: '600' }}>
                {RANGES[i]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Tooltip */}
      {cursorPoint && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {fmtTooltipDate(cursorPoint.x, range)}
          </Text>
          <Text style={{ color: lineColor, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {cursorPoint.value.toLocaleString('ar-EG', { maximumFractionDigits: 0 })} EGP
          </Text>
        </View>
      )}

      {/* Chart */}
      {!hasData ? (
        <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.hover, borderRadius: 10 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>لا توجد بيانات كافية</Text>
        </View>
      ) : (
        <View onLayout={onLayout} style={{ height: CHART_H }}>
          {width > 0 && (
            <Svg width={width} height={CHART_H} style={{ position: 'absolute' }}>
              <Defs>
                <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={lineColor} stopOpacity="0.25" />
                  <Stop offset="1" stopColor={lineColor} stopOpacity="0.02" />
                </LinearGradient>
              </Defs>
              {area ? <Path d={area} fill={`url(#${gradId})`} /> : null}
              {line ? <Path d={line} stroke={lineColor} strokeWidth={2.5} fill="none" /> : null}

              {/* Cursor vertical line */}
              {cursor && (
                <>
                  <Line
                    x1={cursor.px} y1={0} x2={cursor.px} y2={CHART_H}
                    stroke={lineColor} strokeWidth={1} strokeDasharray="3,3"
                    opacity={0.6}
                  />
                  <Circle cx={cursor.px} cy={cursor.py} r={5} fill={lineColor} />
                  <Circle cx={cursor.px} cy={cursor.py} r={9} fill={lineColor} opacity={0.2} />
                </>
              )}
            </Svg>
          )}
          {/* Touch overlay */}
          <View
            style={{ ...{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } }}
            {...panRef.current.panHandlers}
          />
        </View>
      )}

      {/* X-axis labels */}
      {hasData && width > 0 && !cursor && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 }}>
          {[data[0], data[Math.floor(data.length / 2)], data[data.length - 1]].map((pt, i) => (
            <Text key={i} style={{ color: colors.textMuted, fontSize: 10, fontVariant: ['tabular-nums'] }}>
              {pt ? fmtLabel(new Date(pt.x), range) : ''}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ─────────────────────── PortfolioHero ───────────────────────
function fmt(n: number) {
  return n.toLocaleString('ar-EG', { maximumFractionDigits: 0 });
}

export function PortfolioHero({
  totalValue, totalCost, totalGainLoss, totalGainLossPercent, loading, holdings = [],
}: Props) {
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl overflow-hidden">
        <View className="px-5 pt-5 pb-4 gap-2">
          <Skeleton height={11} className="w-24" />
          <Skeleton height={36} className="w-40" />
          <Skeleton height={14} className="w-32" />
        </View>
        <View style={{ borderTopColor: colors.border, borderTopWidth: 1 }} className="px-5 py-4">
          <Skeleton height={CHART_H + 40} />
        </View>
      </View>
    );
  }

  const isProfit = totalGainLoss > 0;
  const isLoss = totalGainLoss < 0;
  const gainColor = isProfit ? '#4ade80' : isLoss ? '#f87171' : colors.textSub;
  const hasChart = holdings.length > 0 && totalValue > 0;

  return (
    <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl overflow-hidden">
      {/* ── Stats header ── */}
      <View className="px-5 pt-5 pb-4" style={{ borderBottomColor: colors.border, borderBottomWidth: hasChart ? 1 : 0 }}>
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

        {/* ── Cost row ── */}
        <View className="flex-row gap-4 mt-3 pt-3" style={{ borderTopColor: colors.border, borderTopWidth: 1 }}>
          <View className="flex-1">
            <Text style={{ color: colors.textMuted }} className="text-xs mb-0.5">سعر الشراء</Text>
            <Text style={{ color: colors.text }} className="text-sm font-semibold tabular-nums">{fmt(totalCost)} EGP</Text>
          </View>
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <View className="flex-1">
            <Text style={{ color: colors.textMuted }} className="text-xs mb-0.5">الربح / الخسارة</Text>
            <Text className="text-sm font-semibold tabular-nums" style={{ color: gainColor }}>
              {isProfit ? '+' : ''}{fmt(totalGainLoss)} EGP
            </Text>
          </View>
        </View>
      </View>

      {/* ── Chart ── */}
      {hasChart && (
        <View className="px-4 pt-4 pb-4">
          <PortfolioChart
            holdings={holdings}
            totalCost={totalCost}
            totalValue={totalValue}
            isProfit={isProfit || (!isLoss)}
            colors={colors}
          />
        </View>
      )}
    </View>
  );
}
