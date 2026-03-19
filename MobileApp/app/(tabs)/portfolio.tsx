import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../hooks/useTheme';
import { useLivePrices } from '../../hooks/useLivePrices';
import { usePortfolioData } from '../../hooks/useMarketData';
import apiClient from '../../lib/api/client';
import type { Stock } from '../../types/stock';
import { PortfolioBalanceCard } from '../../components/features/portfolio/PortfolioBalanceCard';
import { PortfolioHoldingsCard } from '../../components/features/portfolio/PortfolioHoldingsCard';
import { MarketMoversCard } from '../../components/features/portfolio/MarketMoversCard';
import { PortfolioPerformanceCard } from '../../components/features/portfolio/PortfolioPerformanceCard';

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

// ─────────────────────── PortfolioPage ───────────────────────
export default function PortfolioPage() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { holdings, summary, refreshing, refresh } = usePortfolioData();
  const { items: watchlist, reload: reloadWatchlist } = useWatchlist();
  const holdingTickers = holdings.map((h) => h.ticker);
  const watchlistTickers = useMemo(() => watchlist.map((s) => s.ticker), [watchlist]);
  const allTickers = useMemo(() => [...new Set([...holdingTickers, ...watchlistTickers])], [holdingTickers, watchlistTickers]);
  const { prices } = useLivePrices(allTickers);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refresh(), reloadWatchlist()]);
  }, [refresh, reloadWatchlist]);

  const handleDeleteGroup = useCallback((ids: string[], ticker: string) => {
    Alert.alert(
      'Delete asset',
      `Delete all ${ticker} positions from portfolio?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(ids.map((id) => apiClient.delete(`/api/portfolio/${id}`)));
              void refresh();
            } catch { /* silent */ }
          },
        },
      ],
    );
  }, [refresh]);

  const cardBackground = isDark ? '#111a2a' : colors.card;
  const pageBackground = isDark ? '#090f1a' : colors.bg;
  const subTextColor = isDark ? '#9aa6bf' : colors.textSub;
  const mutedTextColor = isDark ? '#6f7d98' : colors.textMuted;

  const movers = useMemo(() => {
    return watchlist.map((stock) => ({
      ticker: stock.ticker,
      price: prices[stock.ticker]?.price ?? stock.price,
      changePercent: prices[stock.ticker]?.changePercent ?? stock.changePercent,
    }));
  }, [watchlist, prices]);

  return (
    <ScreenWrapper padded={false} edges={['top']} contentStyle={{ backgroundColor: pageBackground }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 56, paddingHorizontal: 16, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#8b5cf6" colors={['#8b5cf6']} />
        }
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>Portfolio</Text>
          <Pressable
            onPress={() => router.push('/market')}
            style={{
              backgroundColor: '#8b5cf6',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 12,
            }}
          >
            <Plus size={14} color="#fff" strokeWidth={2.5} />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Add Asset</Text>
          </Pressable>
        </View>

        <View style={{ gap: 16 }}>
          <PortfolioBalanceCard
            totalValue={summary.totalValue}
            totalGainLoss={summary.totalGainLoss}
            totalGainLossPercent={summary.totalGainLossPercent}
            cardBackground={cardBackground}
            borderColor={colors.border}
            textColor={colors.text}
            mutedTextColor={mutedTextColor}
          />

          <PortfolioHoldingsCard
            holdings={holdings}
            livePrices={prices}
            cardBackground={cardBackground}
            borderColor={colors.border}
            textColor={colors.text}
            subTextColor={subTextColor}
            mutedTextColor={mutedTextColor}
            onPressTicker={(ticker) => router.push(`/stocks/${ticker}`)}
            onDeleteGroup={handleDeleteGroup}
          />

          <MarketMoversCard
            items={movers}
            cardBackground={cardBackground}
            borderColor={colors.border}
            textColor={colors.text}
            mutedTextColor={mutedTextColor}
          />

          <PortfolioPerformanceCard
            totalCost={summary.totalCost}
            totalGainLoss={summary.totalGainLoss}
            totalGainLossPercent={summary.totalGainLossPercent}
            cardBackground={cardBackground}
            borderColor={colors.border}
            textColor={colors.text}
            mutedTextColor={mutedTextColor}
          />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
