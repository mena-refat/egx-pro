import { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../hooks/useTheme';
import { useLivePrices } from '../../hooks/useLivePrices';
import { usePortfolioData } from '../../hooks/useMarketData';
import { useWatchlist } from '../../hooks/useWatchlist';
import apiClient from '../../lib/api/client';
import { PortfolioBalanceCard } from '../../components/features/portfolio/PortfolioBalanceCard';
import { PortfolioHoldingsCard } from '../../components/features/portfolio/PortfolioHoldingsCard';
import { MarketMoversCard } from '../../components/features/portfolio/MarketMoversCard';
import { PortfolioPerformanceCard } from '../../components/features/portfolio/PortfolioPerformanceCard';

export default function PortfolioPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { holdings, summary, refreshing, refresh } = usePortfolioData();
  const { items: watchlist, refetch: reloadWatchlist } = useWatchlist();
  const holdingTickers = useMemo(() => holdings.map((h) => h.ticker), [holdings]);
  const watchlistTickers = useMemo(() => watchlist.map((s) => s.ticker), [watchlist]);
  const allTickers = useMemo(() => [...new Set([...holdingTickers, ...watchlistTickers])], [holdingTickers, watchlistTickers]);
  const { prices } = useLivePrices(allTickers);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refresh(), reloadWatchlist()]);
  }, [refresh, reloadWatchlist]);

  const handleDeleteGroup = useCallback((ids: string[], ticker: string) => {
    Alert.alert(
      'حذف السهم',
      `حذف جميع مراكز ${ticker} من المحفظة؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف', style: 'destructive',
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

  const movers = useMemo(() => {
    return watchlist.map((stock) => ({
      ticker: stock.ticker,
      price: prices[stock.ticker]?.price ?? stock.price,
      changePercent: prices[stock.ticker]?.changePercent ?? stock.changePercent,
    }));
  }, [watchlist, prices]);

  return (
    <ScreenWrapper padded={false} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 56, paddingHorizontal: 16, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#8b5cf6" colors={['#8b5cf6']} />
        }
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>محفظتي</Text>
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
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>إضافة سهم</Text>
          </Pressable>
        </View>

        <View style={{ gap: 16 }}>
          <PortfolioBalanceCard
            totalValue={summary.totalValue}
            totalGainLoss={summary.totalGainLoss}
            totalGainLossPercent={summary.totalGainLossPercent}
            cardBackground={colors.card}
            borderColor={colors.border}
            textColor={colors.text}
            mutedTextColor={colors.textMuted}
          />

          <PortfolioHoldingsCard
            holdings={holdings}
            livePrices={prices}
            cardBackground={colors.card}
            borderColor={colors.border}
            textColor={colors.text}
            subTextColor={colors.textSub}
            mutedTextColor={colors.textMuted}
            onPressTicker={(ticker) => router.push(`/stocks/${ticker}`)}
            onDeleteGroup={handleDeleteGroup}
          />

          <MarketMoversCard
            items={movers}
            cardBackground={colors.card}
            borderColor={colors.border}
            textColor={colors.text}
            mutedTextColor={colors.textMuted}
          />

          <PortfolioPerformanceCard
            totalCost={summary.totalCost}
            totalGainLoss={summary.totalGainLoss}
            totalGainLossPercent={summary.totalGainLossPercent}
            cardBackground={colors.card}
            borderColor={colors.border}
            textColor={colors.text}
            mutedTextColor={colors.textMuted}
          />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
