import { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, PanResponder, type LayoutChangeEvent } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle } from 'react-native-svg';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { Skeleton } from '../../ui/Skeleton';
import { useTheme } from '../../../hooks/useTheme';

interface Holding { buyDate?: string; shares: number; avgPrice: number }
interface ChartPoint { x: number; value: number; label: string }

interface Props {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  loading: boolean;
  holdings?: Holding[];
}

const RANGE_LABELS = ['اليوم', 'أسبوع', 'شهر', '٦ أشهر', 'سنة', '٣ سنوات', '٥ سنوات'] as const;
const RANGE_KEYS = ['1D', '1W', '1M', '6M', '1Y', '3Y', '5Y'] as const;
type Range = (typeof RANGE_KEYS)[number];
const CHART_H = 148;

// ─── timeline sampler ───
function sampleTimeline(range: Range): Date[] {
  const now = new Date();
  const out: Date[] = [];
  if (range === '1D') {
    for (let h = 0; h <= now.getHours(); h++) {
      const d = new Date(now); d.setHours(h, 0, 0, 0); out.push(d);
    }
    return out;
  }
  const days = range === '1W' ? 7 : range === '1M' ? 30 : range === '6M' ? 180 :
    range === '1Y' ? 365 : range === '3Y' ? 365 * 3 : 365 * 5;
  const step = Math.ceil(days / 90);
  for (let i = days - 1; i >= 0; i -= step) {
    const d = new Date(now); d.setDate(now.getDate() - i); d.setHours(0, 0, 0, 0); out.push(d);
  }
  out.push(new Date());
  return out;
}

function buildChartData(holdings: Holding[], totalCost: number, totalValue: number, range: Range): ChartPoint[] {
  const now = new Date();
  const timeline = sampleTimeline(range);
  if (!timeline.length) return [];
  const sorted = [...holdings]
    .filter(h => h.buyDate)
    .sort((a, b) => new Date(a.buyDate!).getTime() - new Date(b.buyDate!).getTime());

  const getValueAt = (t: Date): number => {
    const tMs = t.getTime();
    if (tMs >= now.getTime()) return totalValue;
    if (!sorted.length) return totalCost;
    const firstMs = new Date(sorted[0].buyDate!).getTime();
    if (tMs < firstMs) return 0;
    let cum = 0;
    for (const h of sorted) {
      if (tMs >= new Date(h.buyDate!).getTime()) cum += h.shares * h.avgPrice;
      else break;
    }
    return cum;
  };

  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const fmtLabel = (d: Date): string => {
    if (range === '1D') {
      let h = d.getHours(); const ap = h < 12 ? 'ص' : 'م';
      if (h === 0) h = 12; else if (h > 12) h -= 12;
      return `${h}${ap}`;
    }
    if (range === '1W' || range === '1M') return `${d.getDate()}/${d.getMonth()+1}`;
    if (range === '6M' || range === '1Y') return months[d.getMonth()]?.slice(0,3) ?? '';
    return `${d.getFullYear()}`;
  };

  return timeline.map((d, i) => ({
    x: d.getTime(),
    value: i === timeline.length - 1 ? totalValue : getValueAt(d),
    label: fmtLabel(d),
  }));
}

function buildPaths(data: ChartPoint[], w: number, h: number): { line: string; area: string } {
  if (data.length < 2) return { line: '', area: '' };
  const vals = data.map(d => d.value);
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const PAD_T = 12, PAD_B = 8;
  const toX = (i: number) => (i / (data.length - 1)) * w;
  const toY = (v: number) => PAD_T + ((maxV - v) / range) * (h - PAD_T - PAD_B);
  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.value) }));
  let line = '';
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (i === 0) { line += `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`; continue; }
    const prev = pts[i - 1];
    const cx = ((prev.x + p.x) / 2).toFixed(1);
    line += ` C ${cx} ${prev.y.toFixed(1)} ${cx} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }
  const last = pts[pts.length - 1], first = pts[0];
  const area = `${line} L ${last.x.toFixed(1)} ${h} L ${first.x.toFixed(1)} ${h} Z`;
  return { line, area };
}

function fmtTooltipDate(x: number, range: Range): string {
  const d = new Date(x);
  if (range === '1D') return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (range === '1W' || range === '1M') return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// ─── Chart component ───
function PortfolioChart({ holdings, totalCost, totalValue, gainColor }: {
  holdings: Holding[]; totalCost: number; totalValue: number; gainColor: string;
}) {
  const { colors } = useTheme();
  const [range, setRange] = useState<Range>('1M');
  const [width, setWidth] = useState(0);
  const [cursor, setCursor] = useState<{ idx: number; px: number; py: number } | null>(null);

  const data = useMemo(() => buildChartData(holdings, totalCost, totalValue, range), [holdings, totalCost, totalValue, range]);
  const hasData = data.length > 1 && totalValue > 0;

  const vals = data.map(d => d.value);
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const vRange = maxV - minV || 1;
  const PAD_T = 12, PAD_B = 8;
  const toY = useCallback((v: number) => PAD_T + ((maxV - v) / vRange) * (CHART_H - PAD_T - PAD_B), [maxV, vRange]);

  const { line, area } = useMemo(
    () => width > 0 && hasData ? buildPaths(data, width, CHART_H) : { line: '', area: '' },
    [data, width, hasData],
  );

  const moveCursor = useCallback((lx: number) => {
    if (!data.length || width === 0) return;
    const idx = Math.round(Math.max(0, Math.min(1, lx / width)) * (data.length - 1));
    const pt = data[idx];
    if (!pt) return;
    setCursor({ idx, px: (idx / (data.length - 1)) * width, py: toY(pt.value) });
  }, [data, width, toY]);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => hasData && width > 0,
    onMoveShouldSetPanResponder: () => hasData && width > 0,
    onPanResponderGrant: e => moveCursor(e.nativeEvent.locationX),
    onPanResponderMove: e => moveCursor(e.nativeEvent.locationX),
    onPanResponderRelease: () => setCursor(null),
    onPanResponderTerminate: () => setCursor(null),
  }));

  const cursorPt = cursor ? data[cursor.idx] : null;

  return (
    <View style={{ gap: 14 }}>
      {/* Range pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 0 }}>
        {RANGE_KEYS.map((r, i) => {
          const active = range === r;
          return (
            <Pressable
              key={r}
              onPress={() => { setRange(r); setCursor(null); }}
              style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                backgroundColor: active ? gainColor : colors.hover,
                borderWidth: active ? 0 : 1, borderColor: colors.border,
              }}
            >
              <Text style={{ color: active ? '#fff' : colors.textSub, fontSize: 12, fontWeight: active ? '700' : '500' }}>
                {RANGE_LABELS[i]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Tooltip row */}
      <View style={{ height: 36, justifyContent: 'center' }}>
        {cursorPt ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{fmtTooltipDate(cursorPt.x, range)}</Text>
            <Text style={{ color: gainColor, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {cursorPt.value.toLocaleString('en-US', { maximumFractionDigits: 0 })} EGP
            </Text>
          </View>
        ) : hasData ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {[data[0], data[Math.floor(data.length / 2)], data[data.length - 1]].map((pt, i) => (
              <Text key={i} style={{ color: colors.textMuted, fontSize: 10, fontVariant: ['tabular-nums'], flex: i === 1 ? 0 : 1, textAlign: i === 2 ? 'right' : 'left' }}>
                {pt ? pt.label : ''}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      {/* SVG */}
      {!hasData ? (
        <View style={{ height: CHART_H, backgroundColor: colors.hover, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>لا توجد بيانات كافية</Text>
        </View>
      ) : (
        <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ height: CHART_H }}>
          {width > 0 && (
            <Svg width={width} height={CHART_H} style={{ position: 'absolute' }}>
              <Defs>
                <LinearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={gainColor} stopOpacity="0.22" />
                  <Stop offset="1" stopColor={gainColor} stopOpacity="0" />
                </LinearGradient>
              </Defs>
              {area ? <Path d={area} fill="url(#pg)" /> : null}
              {line ? <Path d={line} stroke={gainColor} strokeWidth={2} fill="none" /> : null}
              {cursor && (
                <>
                  <Line x1={cursor.px} y1={4} x2={cursor.px} y2={CHART_H - 4}
                    stroke={gainColor} strokeWidth={1.5} strokeDasharray="4,4" opacity={0.5} />
                  <Circle cx={cursor.px} cy={cursor.py} r={10} fill={gainColor} opacity={0.15} />
                  <Circle cx={cursor.px} cy={cursor.py} r={5} fill={gainColor} />
                  <Circle cx={cursor.px} cy={cursor.py} r={3} fill="#fff" />
                </>
              )}
            </Svg>
          )}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} {...pan.current.panHandlers} />
        </View>
      )}
    </View>
  );
}

// ─── PortfolioHero ───
export function PortfolioHero({ totalValue, totalCost, totalGainLoss, totalGainLossPercent, loading, holdings = [] }: Props) {
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, overflow: 'hidden' }}>
        <View style={{ padding: 20, gap: 10 }}>
          <Skeleton height={11} width={120} />
          <Skeleton height={38} width={200} />
          <Skeleton height={16} width={160} />
        </View>
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <View style={{ flexDirection: 'row' }}>
          {[0, 1].map(i => (
            <View key={i} style={{ flex: 1, padding: 16, gap: 6, borderRightWidth: i === 0 ? 1 : 0, borderRightColor: colors.border }}>
              <Skeleton height={10} width={60} />
              <Skeleton height={18} width={90} />
            </View>
          ))}
        </View>
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <View style={{ padding: 16 }}>
          <Skeleton height={CHART_H + 80} />
        </View>
      </View>
    );
  }

  const isUp = totalGainLoss > 0;
  const isDown = totalGainLoss < 0;
  const gainColor = isUp ? '#4ade80' : isDown ? '#f87171' : colors.textSub;
  const hasChart = holdings.filter(h => h.buyDate).length > 0 && totalValue > 0;

  return (
    <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, overflow: 'hidden' }}>

      {/* ── Total value ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18 }}>
        <Text style={{ color: colors.textMuted, fontSize: 11, letterSpacing: 0.8, marginBottom: 6 }}>
          إجمالي المحفظة
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 10 }}>
          <Text style={{ color: colors.text, fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'], lineHeight: 40 }}>
            {totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 15, fontWeight: '500', marginBottom: 4 }}>EGP</Text>
        </View>

        {/* Gain/loss pill */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
          backgroundColor: isUp ? '#4ade8018' : isDown ? '#f8717118' : colors.hover,
          paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
          {isUp ? <TrendingUp size={13} color={gainColor} /> : isDown ? <TrendingDown size={13} color={gainColor} /> : <Minus size={13} color={gainColor} />}
          <Text style={{ color: gainColor, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {isUp ? '+' : ''}{totalGainLoss.toLocaleString('en-US', { maximumFractionDigits: 0 })} EGP
          </Text>
          <View style={{ width: 1, height: 12, backgroundColor: gainColor, opacity: 0.3 }} />
          <Text style={{ color: gainColor, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {isUp ? '+' : ''}{totalGainLossPercent.toFixed(2)}%
          </Text>
        </View>
      </View>

      {/* ── Cost / Gain row ── */}
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border }}>
        <View style={{ flex: 1, paddingHorizontal: 20, paddingVertical: 14, borderRightWidth: 1, borderRightColor: colors.border }}>
          <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>رأس المال</Text>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
            {totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '400' }}> EGP</Text>
          </Text>
        </View>
        <View style={{ flex: 1, paddingHorizontal: 20, paddingVertical: 14 }}>
          <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>الربح / الخسارة</Text>
          <Text style={{ color: gainColor, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
            {isUp ? '+' : ''}{totalGainLoss.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            <Text style={{ fontSize: 11, fontWeight: '400' }}> EGP</Text>
          </Text>
        </View>
      </View>

      {/* ── Chart ── */}
      {hasChart && (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
          <PortfolioChart
            holdings={holdings}
            totalCost={totalCost}
            totalValue={totalValue}
            gainColor={gainColor}
          />
        </View>
      )}
    </View>
  );
}
