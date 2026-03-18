import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { PortfolioHero } from '../../components/features/dashboard/PortfolioHero';
import { Skeleton } from '../../components/ui/Skeleton';
import { useLivePrices } from '../../hooks/useLivePrices';
import { usePortfolioData } from '../../hooks/useMarketData';
import { getStockName } from '../../lib/egxStocks';

export default function PortfolioPage() {
  const router = useRouter();
  const { holdings, summary, loading, refreshing, refresh } = usePortfolioData();
  const tickers = holdings.map((h) => h.ticker);
  const { prices } = useLivePrices(tickers);

  return (
    <ScreenWrapper padded={false}>
      <ScrollView
        contentContainerClassName="px-4 pt-5 pb-10 gap-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#10b981"
            colors={['#10b981']}
          />
        }
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-white">محفظتي</Text>
          <Pressable
            onPress={() => router.push('/market')}
            className="flex-row items-center gap-1.5 bg-brand px-3 py-1.5 rounded-xl"
          >
            <Plus size={14} color="#fff" />
            <Text className="text-xs font-semibold text-white">إضافة سهم</Text>
          </Pressable>
        </View>

        <PortfolioHero
          totalValue={summary.totalValue}
          totalCost={summary.totalCost}
          totalGainLoss={summary.totalGainLoss}
          totalGainLossPercent={summary.totalGainLossPercent}
          loading={loading}
        />

        <View className="bg-[#111118] border border-white/[0.07] rounded-2xl overflow-hidden">
          <Text className="text-sm font-semibold text-white px-4 py-3 border-b border-white/[0.06]">
            الأسهم ({holdings.length})
          </Text>

          {loading ? (
            <View className="gap-1 p-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} height={56} />
              ))}
            </View>
          ) : holdings.length === 0 ? (
            <Pressable
              onPress={() => router.push('/market')}
              className="items-center py-10 gap-2"
            >
              <Text className="text-slate-500 text-sm">محفظتك فارغة</Text>
              <Text className="text-xs text-brand">ابدأ بإضافة أسهم</Text>
            </Pressable>
          ) : (
            holdings.map((h) => {
              const live = prices[h.ticker];
              const price = live?.price ?? h.currentPrice ?? h.avgPrice;
              const value = price * h.shares;
              const gainLoss = (price - h.avgPrice) * h.shares;
              const gainLossPct =
                h.avgPrice > 0 ? ((price - h.avgPrice) / h.avgPrice) * 100 : 0;
              const isProfit = gainLoss > 0;

              return (
                <Pressable
                  key={h.id}
                  onPress={() => router.push(`/stocks/${h.ticker}`)}
                  className="flex-row items-center px-4 py-3.5 border-b border-white/[0.04] active:bg-white/[0.02]"
                >
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-white">
                      {h.ticker}
                    </Text>
                    <Text
                      className="text-xs text-slate-500 mt-0.5"
                      numberOfLines={1}
                    >
                      {getStockName(h.ticker, 'ar')} · {h.shares} سهم
                    </Text>
                  </View>
                  <View className="items-end gap-1">
                    <Text className="text-sm font-bold text-white tabular-nums">
                      {value.toLocaleString('ar-EG', {
                        maximumFractionDigits: 0,
                      })}{' '}
                      EGP
                    </Text>
                    <Text
                      className={`text-xs font-medium tabular-nums ${
                        isProfit ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {isProfit ? '+' : ''}
                      {gainLossPct.toFixed(2)}%
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

