import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import apiClient from '../../../lib/api/client';
import { useTheme } from '../../../hooks/useTheme';

interface DataPoint {
  date: string;
  price: number;
}

const RANGES = [
  { id: '1w',  label: '1أ' },
  { id: '1mo', label: '1ش' },
  { id: '3mo', label: '3ش' },
  { id: '6mo', label: '6ش' },
  { id: '1y',  label: '1س' },
] as const;

type Range = (typeof RANGES)[number]['id'];

interface Props {
  ticker: string;
  lineColor?: string;
}

const CHART_HEIGHT = 176;

function buildPaths(
  data: DataPoint[],
  width: number,
  height: number,
): { linePath: string; areaPath: string } {
  if (data.length < 2) return { linePath: '', areaPath: '' };

  const padding = { top: 10, bottom: 10 };
  const prices = data.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const toX = (i: number) => (i / (data.length - 1)) * width;
  const toY = (price: number) =>
    padding.top +
    ((maxPrice - price) / priceRange) * (height - padding.top - padding.bottom);

  const points = data.map((d, i) => ({ x: toX(i), y: toY(d.price) }));

  const linePath = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    const prev = points[i - 1];
    const cpX = ((prev.x + p.x) / 2).toFixed(2);
    return `${acc} C ${cpX} ${prev.y.toFixed(2)} ${cpX} ${p.y.toFixed(2)} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }, '');

  const last = points[points.length - 1];
  const first = points[0];
  const areaPath = `${linePath} L ${last.x.toFixed(2)} ${height} L ${first.x.toFixed(2)} ${height} Z`;

  return { linePath, areaPath };
}

export function StockChart({ ticker, lineColor }: Props) {
  const { colors } = useTheme();
  const [range, setRange] = useState<Range>('1mo');
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartWidth, setChartWidth] = useState(0);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    apiClient
      .get<DataPoint[]>(`/api/stocks/${ticker}/history?range=${range}`, {
        signal: ctrl.signal,
      })
      .then((res) => {
        if (!ctrl.signal.aborted && mountedRef.current) {
          const raw = (res.data as { data?: DataPoint[] })?.data ?? res.data;
          const list = Array.isArray(raw)
            ? raw.filter((d) => isFinite(d.price) && d.price > 0)
            : [];
          setData(list);
        }
      })
      .catch(() => {
        if (!ctrl.signal.aborted && mountedRef.current) setData([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted && mountedRef.current) setLoading(false);
      });
    return () => ctrl.abort();
  }, [ticker, range]);

  const firstPrice = data[0]?.price ?? 0;
  const lastPrice = data[data.length - 1]?.price ?? 0;
  const isPositive = lastPrice >= firstPrice;
  const color = lineColor ?? (isPositive ? '#4ade80' : '#f87171');
  const gradientId = `chart_grad_${ticker}`;

  const { linePath, areaPath } =
    chartWidth > 0 && data.length >= 2
      ? buildPaths(data, chartWidth, CHART_HEIGHT)
      : { linePath: '', areaPath: '' };

  return (
    <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl p-4">
      {/* Range selector */}
      <View className="flex-row gap-1 mb-4">
        {RANGES.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => setRange(r.id)}
            style={range === r.id ? {} : { backgroundColor: colors.hover }}
            className={`flex-1 py-1.5 rounded-lg items-center ${range === r.id ? 'bg-brand' : ''}`}
          >
            <Text
              style={{ color: range === r.id ? '#fff' : colors.textSub }}
              className="text-xs font-semibold"
            >
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ height: CHART_HEIGHT }} className="items-center justify-center">
          <ActivityIndicator color="#8b5cf6" />
        </View>
      ) : data.length === 0 ? (
        <View style={{ height: CHART_HEIGHT }} className="items-center justify-center">
          <Text style={{ color: colors.textMuted }} className="text-sm">لا توجد بيانات</Text>
        </View>
      ) : (
        <View
          style={{ height: CHART_HEIGHT }}
          onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
        >
          {chartWidth > 0 && (
            <Svg width={chartWidth} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={color} stopOpacity="0.2" />
                  <Stop offset="1" stopColor={color} stopOpacity="0" />
                </LinearGradient>
              </Defs>
              {areaPath ? <Path d={areaPath} fill={`url(#${gradientId})`} /> : null}
              {linePath ? <Path d={linePath} stroke={color} strokeWidth={2} fill="none" /> : null}
            </Svg>
          )}
        </View>
      )}
    </View>
  );
}
