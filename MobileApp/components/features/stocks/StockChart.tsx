import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { CartesianChart, Line } from 'victory-native';
import apiClient from '../../../lib/api/client';

interface DataPoint {
  date: string;
  price: number;
}

const RANGES = [
  { id: '1w', label: '1أ' },
  { id: '1mo', label: '1ش' },
  { id: '3mo', label: '3ش' },
  { id: '6mo', label: '6ش' },
  { id: '1y', label: '1س' },
] as const;

type Range = (typeof RANGES)[number]['id'];

interface Props {
  ticker: string;
  lineColor?: string;
}

export function StockChart({ ticker, lineColor }: Props) {
  const [range, setRange] = useState<Range>('1mo');
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
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
          setData(Array.isArray(raw) ? raw : []);
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

  const chartData = data.map((d, i) => ({
    x: i,
    y: d.price,
    date: d.date,
  }));

  const firstPrice = data[0]?.price ?? 0;
  const lastPrice = data[data.length - 1]?.price ?? 0;
  const isPositive = lastPrice >= firstPrice;
  const color = isPositive ? '#10b981' : '#ef4444';

  return (
    <View className="bg-[#111118] border border-white/[0.07] rounded-2xl p-4">
      <View className="flex-row gap-1 mb-4">
        {RANGES.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => setRange(r.id)}
            className={`flex-1 py-1.5 rounded-lg items-center ${
              range === r.id ? 'bg-brand' : 'bg-white/[0.04]'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                range === r.id ? 'text-white' : 'text-slate-400'
              }`}
            >
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View className="h-44 items-center justify-center">
          <ActivityIndicator color="#10b981" />
        </View>
      ) : data.length === 0 ? (
        <View className="h-44 items-center justify-center">
          <Text className="text-slate-500 text-sm">لا توجد بيانات</Text>
        </View>
      ) : (
        <View style={{ height: 176 }}>
          <CartesianChart data={chartData} xKey="x" yKeys={['y']}>
            {({ points }) => (
              <Line
                points={points.y}
                color={lineColor ?? color}
                strokeWidth={2}
                animate={{ type: 'timing', duration: 400 }}
              />
            )}
          </CartesianChart>
        </View>
      )}
    </View>
  );
}

