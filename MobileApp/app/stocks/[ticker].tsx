import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  Eye,
  EyeOff,
  Brain,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { PriceTag } from '../../components/shared/PriceTag';
import { StockChart } from '../../components/features/stocks/StockChart';
import { Skeleton } from '../../components/ui/Skeleton';
import { useLivePrices } from '../../hooks/useLivePrices';
import { getStockName, getStockInfo } from '../../lib/egxStocks';
import apiClient from '../../lib/api/client';
import type { Stock } from '../../types/stock';

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-2.5 border-b border-[#21262d]">
      <Text className="text-sm text-[#8b949e]">{label}</Text>
      <Text className="text-sm font-semibold text-[#e6edf3] tabular-nums">{value}</Text>
    </View>
  );
}

export default function StockDetailPage() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const router = useRouter();
  const { prices } = useLivePrices(ticker ? [ticker] : []);
  const [stock, setStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [wlLoading, setWlLoading] = useState(false);

  const stockInfo = ticker ? getStockInfo(ticker) : null;
  const live = ticker ? prices[ticker] : null;

  useEffect(() => {
    if (!ticker) return;
    const ctrl = new AbortController();

    apiClient
      .get('/api/stocks/prices', { signal: ctrl.signal })
      .then((res) => {
        const raw = (res.data as { data?: Stock[] })?.data ?? res.data;
        const list = Array.isArray(raw) ? raw : [];
        const found = list.find((s: Stock) => s.ticker.toUpperCase() === ticker.toUpperCase());
        setStock(found ?? null);
      })
      .catch(() => null)
      .finally(() => setLoading(false));

    apiClient
      .get('/api/watchlist', { signal: ctrl.signal })
      .then((res) => {
        const items = (res.data as { items?: Stock[] })?.items ?? res.data;
        const arr = Array.isArray(items) ? items : [];
        setInWatchlist(arr.some((s: Stock) => s.ticker === ticker));
      })
      .catch(() => null);

    return () => ctrl.abort();
  }, [ticker]);

  const toggleWatchlist = async () => {
    if (!ticker || wlLoading) return;
    setWlLoading(true);
    const prev = inWatchlist;
    setInWatchlist(!prev);
    try {
      if (prev) {
        await apiClient.delete(`/api/watchlist/${ticker}`);
      } else {
        await apiClient.post('/api/watchlist', { ticker });
      }
    } catch {
      setInWatchlist(prev);
    } finally {
      setWlLoading(false);
    }
  };

  if (!ticker) return null;

  const currentPrice = live?.price ?? stock?.price ?? 0;
  const currentChange = live?.change ?? stock?.change ?? 0;
  const currentChangePct = live?.changePercent ?? stock?.changePercent ?? 0;

  return (
    <ScreenWrapper padded={false}>
      {/* Navbar */}
      <View className="flex-row items-center justify-between px-4 pt-5 pb-3 border-b border-[#30363d]">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white/[0.04] border border-[#30363d] items-center justify-center"
        >
          {I18nManager.isRTL
            ? <ArrowRight size={16} color="#8b949e" />
            : <ArrowLeft size={16} color="#8b949e" />}
        </Pressable>

        <View className="flex-1 items-center">
          <Text className="text-base font-bold text-[#e6edf3]">{ticker}</Text>
          <Text className="text-xs text-[#8b949e]" numberOfLines={1}>
            {stockInfo?.nameAr ?? getStockName(ticker, 'ar')}
          </Text>
        </View>

        <Pressable
          onPress={toggleWatchlist}
          disabled={wlLoading}
          className="w-9 h-9 rounded-xl bg-white/[0.04] border border-[#30363d] items-center justify-center"
        >
          {wlLoading ? (
            <ActivityIndicator size="small" color="#8b5cf6" />
          ) : inWatchlist ? (
            <Eye size={16} color="#8b5cf6" />
          ) : (
            <EyeOff size={16} color="#656d76" />
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="px-4 pt-4 pb-10 gap-5"
        showsVerticalScrollIndicator={false}
      >
        {/* Price */}
        {loading ? (
          <View className="gap-2">
            <Skeleton height={40} className="w-40" />
            <Skeleton height={24} className="w-28" />
          </View>
        ) : (
          <View className="gap-2">
            <Text className="text-4xl font-bold text-[#e6edf3] tabular-nums">
              {currentPrice.toFixed(2)}{' '}
              <Text className="text-xl text-[#8b949e]">EGP</Text>
            </Text>
            <PriceTag change={currentChange} changePercent={currentChangePct} size="md" />
          </View>
        )}

        {/* Chart */}
        <StockChart ticker={ticker} />

        {/* Stats */}
        {stock && (
          <View className="bg-[#161b22] border border-[#30363d] rounded-2xl px-4 py-2">
            <Text className="text-sm font-semibold text-[#e6edf3] py-3 border-b border-[#30363d]">
              تفاصيل السهم
            </Text>
            <StatRow label="الافتتاح"        value={`${stock.open?.toFixed(2) ?? '—'} EGP`} />
            <StatRow label="أعلى سعر اليوم"  value={`${stock.high?.toFixed(2) ?? '—'} EGP`} />
            <StatRow label="أقل سعر اليوم"   value={`${stock.low?.toFixed(2) ?? '—'} EGP`} />
            <StatRow label="الإغلاق السابق"  value={`${stock.previousClose?.toFixed(2) ?? '—'} EGP`} />
            <StatRow label="حجم التداول"      value={stock.volume?.toLocaleString('ar-EG') ?? '—'} />
            {stock.isDelayed && (
              <View className="py-2">
                <Text className="text-xs text-amber-400 text-center">⚠ السعر متأخر 10 دقائق</Text>
              </View>
            )}
          </View>
        )}

        {/* AI Button */}
        <Pressable
          onPress={() => router.push(`/ai?ticker=${ticker}`)}
          className="bg-brand/10 border border-brand/30 rounded-2xl p-4 flex-row items-center gap-3"
        >
          <View className="w-10 h-10 rounded-xl bg-brand/20 items-center justify-center">
            <Brain size={18} color="#8b5cf6" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-[#e6edf3]">تحليل AI للسهم</Text>
            <Text className="text-xs text-[#8b949e] mt-0.5">احصل على تحليل شامل بالذكاء الاصطناعي</Text>
          </View>
          <ChevronLeft size={18} color="#8b5cf6" />
        </Pressable>
      </ScrollView>
    </ScreenWrapper>
  );
}
