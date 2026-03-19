import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { I18nManager } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { WatchlistRow } from '../../components/features/dashboard/WatchlistRow';
import { MarketStatusBadge } from '../../components/shared/MarketStatusBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { PriceTag } from '../../components/shared/PriceTag';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useLivePrices } from '../../hooks/useLivePrices';
import { useMarketData } from '../../hooks/useMarketData';
import apiClient from '../../lib/api/client';
import type { Stock } from '../../types/stock';

function useWatchlist() {
  const [items, setItems] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const fetch = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await apiClient.get('/api/watchlist', { signal });
      const raw = (res.data as { items?: Stock[] })?.items ?? res.data;
      if (!signal?.aborted && mountedRef.current)
        setItems(Array.isArray(raw) ? raw : []);
    } catch {
      if (!signal?.aborted && mountedRef.current) setItems([]);
    } finally {
      if (!signal?.aborted && mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void fetch(ctrl.signal);
    return () => ctrl.abort();
  }, [fetch]);

  const refetch = useCallback(() => {
    const ctrl = new AbortController();
    return fetch(ctrl.signal);
  }, [fetch]);

  return { items, loading, refetch };
}

export default function HomePage() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);

  const { overview, stocks, loadingOverview, loadingStocks, refreshing, refresh } =
    useMarketData();
  const { items: watchlist, loading: watchlistLoading, refetch: refetchWatchlist } =
    useWatchlist();

  const watchlistTickers = useMemo(() => watchlist.map((s) => s.ticker), [watchlist]);
  const { prices } = useLivePrices(watchlistTickers);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refresh(), refetchWatchlist()]);
  }, [refresh, refetchWatchlist]);

  const topGainers = useMemo(
    () => [...stocks].filter((s) => s.changePercent > 0)
         .sort((a, b) => b.changePercent - a.changePercent)
         .slice(0, 4),
    [stocks],
  );
  const topLosers = useMemo(
    () => [...stocks].filter((s) => s.changePercent < 0)
         .sort((a, b) => a.changePercent - b.changePercent)
         .slice(0, 4),
    [stocks],
  );

  const ChevronIcon = I18nManager.isRTL ? ChevronRight : ChevronLeft;

  return (
    <ScreenWrapper padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#8b5cf6"
            colors={['#8b5cf6']}
          />
        }
      >
        {/* ─── Header ─── */}
        <View
          style={{ borderBottomColor: colors.border, borderBottomWidth: 0.5 }}
          className="flex-row items-center justify-between px-4 pt-5 pb-4"
        >
          <View>
            <Text style={{ color: colors.textMuted }} className="text-xs">أهلاً بك،</Text>
            <Text style={{ color: colors.text }} className="text-lg font-bold mt-0.5">
              {user?.fullName?.split(' ')[0] ?? 'مستثمر'}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <MarketStatusBadge />
            <Pressable
              onPress={() => router.push('/settings/notifications')}
              style={{ backgroundColor: colors.hover, borderColor: colors.border }}
              className="w-9 h-9 rounded-xl border items-center justify-center"
            >
              <Bell size={16} color={colors.textSub} />
            </Pressable>
          </View>
        </View>

        {/* ─── EGX Indices ─── */}
        <View className="px-4 pt-4 pb-2">
          <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider mb-3">
            المؤشرات
          </Text>
          {loadingOverview ? (
            <View className="flex-row gap-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={64} className="flex-1" />)}
            </View>
          ) : overview ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
              {[
                { label: 'EGX 30',  data: overview.egx30  },
                { label: 'EGX 70',  data: overview.egx70  },
                { label: 'EGX 100', data: overview.egx100 },
                overview.usdEgp
                  ? { label: 'USD/EGP', data: { value: overview.usdEgp, changePercent: 0 } }
                  : null,
              ]
                .filter(Boolean)
                .map((idx) => idx && (
                  <View
                    key={idx.label}
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}
                    className="border rounded-2xl px-4 py-3 mx-1 min-w-[100px]"
                  >
                    <Text style={{ color: colors.textMuted }} className="text-xs mb-1">{idx.label}</Text>
                    <Text style={{ color: colors.text }} className="text-sm font-bold tabular-nums">
                      {idx.data?.value.toLocaleString('ar-EG', { maximumFractionDigits: 0 })}
                    </Text>
                    {(idx.data?.changePercent ?? 0) !== 0 && (
                      <Text
                        className="text-xs font-medium mt-0.5"
                        style={{ color: (idx.data?.changePercent ?? 0) >= 0 ? '#4ade80' : '#f87171' }}
                      >
                        {(idx.data?.changePercent ?? 0) > 0 ? '+' : ''}
                        {idx.data?.changePercent?.toFixed(2)}%
                      </Text>
                    )}
                  </View>
                ))}
            </ScrollView>
          ) : null}
        </View>

        {/* ─── Top Movers ─── */}
        {!loadingStocks && (topGainers.length > 0 || topLosers.length > 0) && (
          <View className="px-4 pt-3 pb-2">
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider">
                الأكثر تحركاً
              </Text>
              <Pressable onPress={() => router.push('/market')}>
                <Text className="text-xs text-brand">السوق ←</Text>
              </Pressable>
            </View>
            <View className="flex-row gap-3">
              {/* Gainers */}
              {topGainers.length > 0 && (
                <View
                  style={{ backgroundColor: colors.card, borderColor: colors.border }}
                  className="flex-1 border rounded-2xl overflow-hidden"
                >
                  <View className="flex-row items-center gap-1.5 px-3 py-2.5 border-b border-emerald-500/20 bg-emerald-500/5">
                    <TrendingUp size={12} color="#4ade80" />
                    <Text className="text-xs font-semibold text-emerald-400">صاعدة</Text>
                  </View>
                  {topGainers.map((s) => (
                    <Pressable
                      key={s.ticker}
                      onPress={() => router.push(`/stocks/${s.ticker}`)}
                      style={{ borderBottomColor: colors.border2 }}
                      className="flex-row items-center justify-between px-3 py-2.5 border-b last:border-b-0"
                    >
                      <Text style={{ color: colors.text }} className="text-xs font-bold">{s.ticker}</Text>
                      <Text className="text-xs font-semibold text-emerald-400">
                        +{s.changePercent.toFixed(2)}%
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {/* Losers */}
              {topLosers.length > 0 && (
                <View
                  style={{ backgroundColor: colors.card, borderColor: colors.border }}
                  className="flex-1 border rounded-2xl overflow-hidden"
                >
                  <View className="flex-row items-center gap-1.5 px-3 py-2.5 border-b border-red-500/20 bg-red-500/5">
                    <TrendingDown size={12} color="#f87171" />
                    <Text className="text-xs font-semibold text-red-400">هابطة</Text>
                  </View>
                  {topLosers.map((s) => (
                    <Pressable
                      key={s.ticker}
                      onPress={() => router.push(`/stocks/${s.ticker}`)}
                      style={{ borderBottomColor: colors.border2 }}
                      className="flex-row items-center justify-between px-3 py-2.5 border-b last:border-b-0"
                    >
                      <Text style={{ color: colors.text }} className="text-xs font-bold">{s.ticker}</Text>
                      <Text className="text-xs font-semibold text-red-400">
                        {s.changePercent.toFixed(2)}%
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* ─── Quick Watchlist ─── */}
        <View className="px-4 pt-3">
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border rounded-2xl overflow-hidden"
          >
            <View
              style={{ borderBottomColor: colors.border }}
              className="flex-row items-center justify-between px-4 py-3 border-b"
            >
              <Text style={{ color: colors.text }} className="text-sm font-semibold">قائمة المراقبة</Text>
              <Pressable
                onPress={() => router.push('/portfolio')}
                className="flex-row items-center gap-1"
              >
                <Text className="text-xs text-brand">عرض الكل</Text>
                <ChevronIcon size={12} color="#8b5cf6" />
              </Pressable>
            </View>

            {watchlistLoading ? (
              <View className="gap-3 p-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} height={44} />)}
              </View>
            ) : watchlist.length === 0 ? (
              <Pressable
                onPress={() => router.push('/market')}
                className="py-8 items-center gap-2"
              >
                <Text style={{ color: colors.textMuted }} className="text-sm">قائمة المراقبة فارغة</Text>
                <Text className="text-xs text-brand">أضف أسهم من السوق</Text>
              </Pressable>
            ) : (
              watchlist.slice(0, 4).map((stock) => (
                <WatchlistRow
                  key={stock.ticker}
                  stock={stock}
                  livePrice={prices[stock.ticker]}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
