import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, RefreshControl, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, ChevronLeft, ChevronRight, Target, Star } from 'lucide-react-native';
import { I18nManager } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { PortfolioHero } from '../../components/features/dashboard/PortfolioHero';
import { WatchlistRow } from '../../components/features/dashboard/WatchlistRow';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import { useLivePrices } from '../../hooks/useLivePrices';
import { usePortfolioData } from '../../hooks/useMarketData';
import { getStockName } from '../../lib/egxStocks';
import apiClient from '../../lib/api/client';
import type { Stock } from '../../types/stock';

interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  isCompleted: boolean;
  currency: string;
}

function useWatchlist() {
  const [items, setItems] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refetch = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await apiClient.get('/api/watchlist', { signal });
      const raw = (res.data as { items?: Stock[] })?.items ?? res.data;
      if (!signal?.aborted && mountedRef.current) setItems(Array.isArray(raw) ? raw : []);
    } catch { if (!signal?.aborted && mountedRef.current) setItems([]); }
    finally { if (!signal?.aborted && mountedRef.current) setLoading(false); }
  }, []);

  useEffect(() => { const c = new AbortController(); void refetch(c.signal); return () => c.abort(); }, [refetch]);

  const reload = useCallback(() => { const c = new AbortController(); return refetch(c.signal); }, [refetch]);
  return { items, loading, reload };
}

function useGoalsPreview() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiClient.get('/api/goals').then((res) => {
      const data = res.data as { items?: Goal[] };
      setGoals(data.items ?? (Array.isArray(res.data) ? res.data : []));
    }).catch(() => setGoals([])).finally(() => setLoading(false));
  }, []);
  return { goals: goals.filter((g) => !g.isCompleted).slice(0, 3), loading };
}

export default function PortfolioPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { holdings, summary, loading, refreshing, refresh } = usePortfolioData();
  const { items: watchlist, loading: watchlistLoading, reload: reloadWatchlist } = useWatchlist();
  const { goals, loading: goalsLoading } = useGoalsPreview();

  const holdingTickers = holdings.map((h) => h.ticker);
  const watchlistTickers = useMemo(() => watchlist.map((s) => s.ticker), [watchlist]);
  const allTickers = useMemo(() => [...holdingTickers, ...watchlistTickers], [holdingTickers, watchlistTickers]);
  const { prices } = useLivePrices(allTickers);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refresh(), reloadWatchlist()]);
  }, [refresh, reloadWatchlist]);

  const ChevronIcon = I18nManager.isRTL ? ChevronRight : ChevronLeft;

  return (
    <ScreenWrapper padded={false}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#8b5cf6" colors={['#8b5cf6']} />
        }
      >
        {/* ─── Header ─── */}
        <View
          style={{ borderBottomColor: colors.border, borderBottomWidth: 0.5 }}
          className="flex-row items-center justify-between px-4 pt-5 pb-4"
        >
          <Text style={{ color: colors.text }} className="text-xl font-bold">محفظتي</Text>
          <Pressable
            onPress={() => router.push('/market')}
            className="flex-row items-center gap-1.5 bg-brand px-3 py-1.5 rounded-xl"
          >
            <Plus size={14} color="#fff" />
            <Text className="text-xs font-semibold text-white">إضافة سهم</Text>
          </Pressable>
        </View>

        <View className="px-4 pt-4 gap-4">
          {/* ─── Portfolio Hero ─── */}
          <PortfolioHero
            totalValue={summary.totalValue}
            totalCost={summary.totalCost}
            totalGainLoss={summary.totalGainLoss}
            totalGainLossPercent={summary.totalGainLossPercent}
            loading={loading}
          />

          {/* ─── Holdings ─── */}
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border rounded-2xl overflow-hidden"
          >
            <View style={{ borderBottomColor: colors.border }} className="flex-row items-center justify-between px-4 py-3 border-b">
              <Text style={{ color: colors.text }} className="text-sm font-semibold">
                الأسهم {holdings.length > 0 ? `(${holdings.length})` : ''}
              </Text>
            </View>
            {loading ? (
              <View className="gap-1 p-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} height={56} />)}
              </View>
            ) : holdings.length === 0 ? (
              <Pressable onPress={() => router.push('/market')} className="items-center py-10 gap-2">
                <Text style={{ color: colors.textMuted }} className="text-sm">محفظتك فارغة</Text>
                <Text className="text-xs text-brand">ابدأ بإضافة أسهم من السوق</Text>
              </Pressable>
            ) : (
              holdings.map((h) => {
                const live = prices[h.ticker];
                const price = live?.price ?? h.currentPrice ?? h.avgPrice;
                const value = price * h.shares;
                const gainLoss = (price - h.avgPrice) * h.shares;
                const gainLossPct = h.avgPrice > 0 ? ((price - h.avgPrice) / h.avgPrice) * 100 : 0;
                return (
                  <Pressable
                    key={h.id}
                    onPress={() => router.push(`/stocks/${h.ticker}`)}
                    style={({ pressed }) => [
                      { borderBottomColor: colors.border2, backgroundColor: pressed ? colors.hover : 'transparent' },
                    ]}
                    className="flex-row items-center px-4 py-3.5 border-b"
                  >
                    <View className="flex-1">
                      <Text style={{ color: colors.text }} className="text-sm font-bold">{h.ticker}</Text>
                      <Text style={{ color: colors.textSub }} className="text-xs mt-0.5" numberOfLines={1}>
                        {getStockName(h.ticker, 'ar')} · {h.shares} سهم
                      </Text>
                    </View>
                    <View className="items-end gap-1">
                      <Text style={{ color: colors.text }} className="text-sm font-bold tabular-nums">
                        {value.toLocaleString('ar-EG', { maximumFractionDigits: 0 })} EGP
                      </Text>
                      <Text className={`text-xs font-medium tabular-nums ${gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {gainLoss >= 0 ? '+' : ''}{gainLossPct.toFixed(2)}%
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

          {/* ─── Watchlist ─── */}
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border rounded-2xl overflow-hidden"
          >
            <View style={{ borderBottomColor: colors.border }} className="flex-row items-center justify-between px-4 py-3 border-b">
              <View className="flex-row items-center gap-2">
                <Star size={14} color="#8b5cf6" />
                <Text style={{ color: colors.text }} className="text-sm font-semibold">المراقبة</Text>
              </View>
              <Pressable onPress={() => router.push('/market')} className="flex-row items-center gap-1">
                <Text className="text-xs text-brand">إضافة</Text>
                <ChevronIcon size={12} color="#8b5cf6" />
              </Pressable>
            </View>
            {watchlistLoading ? (
              <View className="gap-3 p-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} height={44} />)}
              </View>
            ) : watchlist.length === 0 ? (
              <Pressable onPress={() => router.push('/market')} className="py-8 items-center gap-2">
                <Text style={{ color: colors.textMuted }} className="text-sm">قائمة المراقبة فارغة</Text>
                <Text className="text-xs text-brand">أضف أسهم للمراقبة</Text>
              </Pressable>
            ) : (
              watchlist.map((stock) => (
                <WatchlistRow key={stock.ticker} stock={stock} livePrice={prices[stock.ticker]} />
              ))
            )}
          </View>

          {/* ─── Goals Preview ─── */}
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border rounded-2xl overflow-hidden"
          >
            <View style={{ borderBottomColor: colors.border }} className="flex-row items-center justify-between px-4 py-3 border-b">
              <View className="flex-row items-center gap-2">
                <Target size={14} color="#4ade80" />
                <Text style={{ color: colors.text }} className="text-sm font-semibold">الأهداف المالية</Text>
              </View>
              <Pressable onPress={() => router.push('/goals')} className="flex-row items-center gap-1">
                <Text className="text-xs text-brand">إدارة الأهداف</Text>
                <ChevronIcon size={12} color="#8b5cf6" />
              </Pressable>
            </View>
            {goalsLoading ? (
              <View className="gap-3 p-4">{[1, 2].map((i) => <Skeleton key={i} height={44} />)}</View>
            ) : goals.length === 0 ? (
              <Pressable onPress={() => router.push('/goals')} className="py-8 items-center gap-2">
                <Text style={{ color: colors.textMuted }} className="text-sm">لا توجد أهداف نشطة</Text>
                <Text className="text-xs text-brand">أضف هدفاً مالياً</Text>
              </Pressable>
            ) : (
              goals.map((g, i) => {
                const pct = g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0;
                const barColor = pct >= 100 ? '#4ade80' : pct >= 60 ? '#8b5cf6' : '#f59e0b';
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => router.push('/goals')}
                    style={({ pressed }) => [
                      { borderBottomColor: colors.border2, backgroundColor: pressed ? colors.hover : 'transparent' },
                      i < goals.length - 1 && { borderBottomWidth: 1 },
                    ]}
                    className="px-4 py-3"
                  >
                    <View className="flex-row items-center justify-between mb-1.5">
                      <Text style={{ color: colors.text }} className="text-xs font-semibold" numberOfLines={1}>{g.title}</Text>
                      <Text className="text-xs font-bold" style={{ color: barColor }}>{pct.toFixed(0)}%</Text>
                    </View>
                    <View style={{ backgroundColor: colors.border2 }} className="h-1.5 rounded-full overflow-hidden">
                      <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                    </View>
                    <Text style={{ color: colors.textMuted }} className="text-xs mt-1">
                      {g.currentAmount.toLocaleString()} / {g.targetAmount.toLocaleString()} {g.currency}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
