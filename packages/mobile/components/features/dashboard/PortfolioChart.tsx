import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { TrendingUp } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import apiClient from '../../../lib/api/client';

const CHART_RANGES = [
  { id: '1w' as const, label: '1W' },
  { id: '1mo' as const, label: '1M' },
  { id: '3mo' as const, label: '3M' },
];
type ChartRange = '1w' | '1mo' | '3mo';
const CHART_H = 140;

function buildPortfolioPath(data: { value: number }[], width: number, height: number) {
  if (data.length < 2) return { linePath: '', areaPath: '' };
  const pad = { top: 12, bottom: 8 };
  const vals = data.map((d) => d.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const vRange = maxV - minV || 1;
  const toX = (i: number) => (i / (data.length - 1)) * width;
  const toY = (v: number) => pad.top + ((maxV - v) / vRange) * (height - pad.top - pad.bottom);
  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.value) }));
  const linePath = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    const prev = pts[i - 1];
    const cx = ((prev.x + p.x) / 2).toFixed(2);
    return `${acc} C ${cx} ${prev.y.toFixed(2)} ${cx} ${p.y.toFixed(2)} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }, '');
  const last = pts[pts.length - 1];
  const first = pts[0];
  const areaPath = `${linePath} L ${last.x.toFixed(2)} ${height} L ${first.x.toFixed(2)} ${height} Z`;
  return { linePath, areaPath };
}

interface Props {
  holdings: Array<{ ticker: string; shares: number; avgPrice: number }>;
}

export function PortfolioChart({ holdings }: Props) {
  const { colors } = useTheme();
  const [range, setRange] = useState<ChartRange>('1mo');
  const [data, setData] = useState<{ value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartWidth, setChartWidth] = useState(0);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    if (holdings.length === 0) { setData([]); setLoading(false); return; }
    const ctrl = new AbortController();
    setLoading(true);
    Promise.all(
      holdings.map((h) =>
        apiClient
          .get(`/api/stocks/${h.ticker}/history?range=${range}`, { signal: ctrl.signal })
          .then((res) => {
            const raw = (res.data as { data?: Array<{ date: string; price: number }> })?.data ?? res.data;
            return { ticker: h.ticker, shares: h.shares, history: Array.isArray(raw) ? raw as Array<{ date: string; price: number }> : [] };
          })
          .catch(() => ({ ticker: h.ticker, shares: h.shares, history: [] as Array<{ date: string; price: number }> })),
      ),
    ).then((results) => {
      if (ctrl.signal.aborted || !mountedRef.current) return;
      const dateMap = new Map<string, Record<string, number>>();
      for (const { ticker, history } of results) {
        for (const pt of history) {
          if (!dateMap.has(pt.date)) dateMap.set(pt.date, {});
          dateMap.get(pt.date)![ticker] = pt.price;
        }
      }
      const portfolioData = Array.from(dateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, prices]) => ({
          value: holdings.reduce((sum, h) => {
            const p = prices[h.ticker];
            return p ? sum + h.shares * p : sum;
          }, 0),
        }))
        .filter((d) => d.value > 0);
      setData(portfolioData);
    }).catch(() => { if (mountedRef.current) setData([]); })
      .finally(() => { if (!ctrl.signal.aborted && mountedRef.current) setLoading(false); });
    return () => ctrl.abort();
  }, [holdings, range]);

  const firstVal = data[0]?.value ?? 0;
  const lastVal = data[data.length - 1]?.value ?? 0;
  const gain = firstVal > 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;
  const isUp = gain >= 0;
  const lineColor = isUp ? '#4ade80' : '#f87171';
  const { linePath, areaPath } =
    chartWidth > 0 && data.length >= 2
      ? buildPortfolioPath(data, chartWidth, CHART_H)
      : { linePath: '', areaPath: '' };

  return (
    <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: colors.hover, alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={13} color={colors.textSub} />
          </View>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>أداء المحفظة</Text>
        </View>
        {data.length > 1 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: isUp ? '#4ade8018' : '#f8717118' }}>
            <Text style={{ color: lineColor, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {isUp ? '+' : ''}{gain.toFixed(2)}%
            </Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 12 }}>
        {CHART_RANGES.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => setRange(r.id)}
            style={{
              paddingHorizontal: 14, paddingVertical: 5, borderRadius: 10,
              backgroundColor: range === r.id ? '#8b5cf6' : colors.hover,
              borderWidth: 1,
              borderColor: range === r.id ? '#8b5cf6' : colors.border,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: range === r.id ? '#fff' : colors.textSub }}>
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#8b5cf6" size="small" />
        </View>
      ) : data.length < 2 ? (
        <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>لا توجد بيانات كافية</Text>
        </View>
      ) : (
        <View style={{ height: CHART_H }} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
          {chartWidth > 0 && (
            <Svg width={chartWidth} height={CHART_H}>
              <Defs>
                <LinearGradient id="portGradHome" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={lineColor} stopOpacity="0.22" />
                  <Stop offset="1" stopColor={lineColor} stopOpacity="0" />
                </LinearGradient>
              </Defs>
              {areaPath ? <Path d={areaPath} fill="url(#portGradHome)" /> : null}
              {linePath ? <Path d={linePath} stroke={lineColor} strokeWidth={2} fill="none" /> : null}
            </Svg>
          )}
        </View>
      )}
    </View>
  );
}
