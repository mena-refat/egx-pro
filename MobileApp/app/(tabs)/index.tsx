import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, TrendingUp, TrendingDown } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { PortfolioHero } from '../../components/features/dashboard/PortfolioHero';
import { WatchlistRow } from '../../components/features/dashboard/WatchlistRow';
import { MarketStatusBadge } from '../../components/shared/MarketStatusBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuthStore } from '../../store/authStore';
import { useLivePrices } from '../../hooks/useLivePrices';
import { usePortfolioData } from '../../hooks/useMarketData';
import apiClient from '../../lib/api/client';
import type { Stock } from '../../types/stock';

function useWatchlist() {
  const [items, setItems] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const fetch = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await apiClient.get('/api/watchlist', { signal });
      const raw = (res.data as { items?: Stock[] })?.items ?? res.data;
      if (!signal?.aborted && mountedRef.current) {
        setItems(Array.isArray(raw) ? raw : []);
      }
    } catch {
      if (!signal?.aborted && mountedRef.current) {
        setItems([]);
      }
    } finally {
      if (!signal?.aborted && mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void fetch(ctrl.signal);
    return () => ctrl.abort();
  }, [fetch]);

  const refetch = useCallback(() => {
    const ctrl = new AbortController();
    void fetch(ctrl.signal);
  }, [fetch]);

  return { items, loading, refetch };
}

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const {
    holdings,
    summary,
    loading: portfolioLoading,
    refreshing,
    refresh,
  } = usePortfolioData();
  const { items: watchlist, loading: watchlistLoading, refetch: refetchWatchlist } =
    useWatchlist();

  const watchlistTickers = useMemo(
    () => watchlist.map((s) => s.ticker),
    [watchlist],
  );
  const { prices } = useLivePrices(watchlistTickers);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refresh(), refetchWatchlist()]);
  }, [refresh, refetchWatchlist]);

  const topGainer = holdings.reduce<(typeof holdings)[number] | null>(
    (best, h) => {
      const pct = prices[h.ticker]?.changePercent ?? h.gainLossPercent ?? 0;
      const bestPct =
        best != null
          ? prices[best.ticker]?.changePercent ?? best.gainLossPercent ?? 0
          : -Infinity;
      return pct > 0 && pct > bestPct ? h : best;
    },
    null,
  );

  const topLoser = holdings.reduce<(typeof holdings)[number] | null>(
    (worst, h) => {
      const pct = prices[h.ticker]?.changePercent ?? h.gainLossPercent ?? 0;
      const worstPct =
        worst != null
          ? prices[worst.ticker]?.changePercent ?? worst.gainLossPercent ?? Infinity
          : Infinity;
      return pct < 0 && pct < worstPct ? h : worst;
    },
    null,
  );

  return (
    <ScreenWrapper>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pt-4 pb-8 gap-5"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#10b981"
            colors={['#10b981']}
          />
        }
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xs text-slate-500">أهلاً بك،</Text>
            <Text className="text-lg font-bold text-white mt-0.5">
              {user?.fullName?.split(' ')[0] ?? 'مستثمر'}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <MarketStatusBadge />
            <Pressable
              onPress={() => router.push('/settings/notifications')}
              className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.07] items-center justify-center"
            >
              <Bell size={16} color="#94a3b8" />
            </Pressable>
          </View>
        </View>

        <PortfolioHero
          totalValue={summary.totalValue}
          totalCost={summary.totalCost}
          totalGainLoss={summary.totalGainLoss}
          totalGainLossPercent={summary.totalGainLossPercent}
          loading={portfolioLoading}
        />

        {(topGainer || topLoser) && (
          <View className="flex-row gap-3">
            {topGainer && (
              <Pressable
                onPress={() => router.push(`/stocks/${topGainer.ticker}`)}
                className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3"
              >
                <View className="flex-row items-center gap-1.5 mb-2">
                  <TrendingUp size={12} color="#10b981" />
                  <Text className="text-xs text-emerald-400 font-medium">
                    أفضل أداء
                  </Text>
                </View>
                <Text className="text-sm font-bold text-white">
                  {topGainer.ticker}
                </Text>
                <Text className="text-xs text-emerald-400 mt-0.5">
                  +
                  {(
                    prices[topGainer.ticker]?.changePercent ??
                    topGainer.gainLossPercent ??
                    0
                  ).toFixed(2)}
                  %
                </Text>
              </Pressable>
            )}
            {topLoser && (
              <Pressable
                onPress={() => router.push(`/stocks/${topLoser.ticker}`)}
                className="flex-1 bg-red-500/10 border border-red-500/20 rounded-xl p-3"
              >
                <View className="flex-row items-center gap-1.5 mb-2">
                  <TrendingDown size={12} color="#ef4444" />
                  <Text className="text-xs text-red-400 font-medium">
                    أقل أداء
                  </Text>
                </View>
                <Text className="text-sm font-bold text-white">
                  {topLoser.ticker}
                </Text>
                <Text className="text-xs text-red-400 mt-0.5">
                  {(
                    prices[topLoser.ticker]?.changePercent ??
                    topLoser.gainLossPercent ??
                    0
                  ).toFixed(2)}
                  %
                </Text>
              </Pressable>
            )}
          </View>
        )}

        <View className="bg-[#111118] border border-white/[0.07] rounded-2xl px-4 py-3">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold text-white">
              قائمة المراقبة
            </Text>
            <Pressable onPress={() => router.push('/market')}>
              <Text className="text-xs text-brand">عرض السوق</Text>
            </Pressable>
          </View>

          {watchlistLoading ? (
            <View className="gap-3 py-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height={44} />
              ))}
            </View>
          ) : watchlist.length === 0 ? (
            <Pressable
              onPress={() => router.push('/market')}
              className="py-6 items-center gap-2"
            >
              <Text className="text-sm text-slate-500">
                قائمة المراقبة فارغة
              </Text>
              <Text className="text-xs text-brand">أضف أسهم الآن</Text>
            </Pressable>
          ) : (
            watchlist.slice(0, 6).map((stock) => (
              <WatchlistRow
                key={stock.ticker}
                stock={stock}
                livePrice={prices[stock.ticker]}
              />
            ))
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

