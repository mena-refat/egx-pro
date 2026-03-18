import { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, TrendingUp, TrendingDown } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { PriceTag } from '../../components/shared/PriceTag';
import { MarketStatusBadge } from '../../components/shared/MarketStatusBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { useMarketData } from '../../hooks/useMarketData';
import { useLivePrices } from '../../hooks/useLivePrices';
import { getStockName } from '../../lib/egxStocks';
import type { Stock } from '../../types/stock';

type Tab = 'gainers' | 'losers' | 'all';

export default function MarketPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('gainers');
  const [search, setSearch] = useState('');
  const { overview, stocks, loadingStocks, loadingOverview, refreshing, refresh } =
    useMarketData();
  const allTickers = useMemo(() => stocks.map((s) => s.ticker), [stocks]);
  const { prices } = useLivePrices(allTickers);

  const enriched = useMemo(
    () =>
      stocks.map((s) => ({
        ...s,
        ...(prices[s.ticker] && {
          price: prices[s.ticker].price,
          change: prices[s.ticker].change,
          changePercent: prices[s.ticker].changePercent,
        }),
      })),
    [stocks, prices],
  );

  const filtered = useMemo(() => {
    let list = [...enriched];
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter(
        (s) =>
          s.ticker.includes(q) ||
          getStockName(s.ticker, 'ar').includes(search) ||
          getStockName(s.ticker, 'en').toUpperCase().includes(q),
      );
    }
    if (tab === 'gainers') {
      return list
        .filter((s) => s.changePercent > 0)
        .sort((a, b) => b.changePercent - a.changePercent);
    }
    if (tab === 'losers') {
      return list
        .filter((s) => s.changePercent < 0)
        .sort((a, b) => a.changePercent - b.changePercent);
    }
    return list.sort((a, b) => b.changePercent - a.changePercent);
  }, [enriched, tab, search]);

  const renderStock = useCallback(
    ({ item: s }: { item: Stock }) => (
      <Pressable
        onPress={() => router.push(`/stocks/${s.ticker}`)}
        className="flex-row items-center justify-between py-3.5 px-4 border-b border-white/[0.04] active:bg-white/[0.03]"
      >
        <View className="flex-1">
          <Text className="text-sm font-bold text-white">{s.ticker}</Text>
          <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
            {getStockName(s.ticker, 'ar')}
          </Text>
        </View>
        <View className="items-end gap-1">
          <Text className="text-sm font-bold text-white tabular-nums">
            {s.price.toFixed(2)}
          </Text>
          <PriceTag
            change={s.change}
            changePercent={s.changePercent}
            size="sm"
            showIcon={false}
          />
        </View>
      </Pressable>
    ),
    [router],
  );

  return (
    <ScreenWrapper padded={false}>
      <View className="flex-1">
        <View className="px-4 pt-5 pb-3 gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-white">السوق</Text>
            <MarketStatusBadge />
          </View>

          {loadingOverview ? (
            <View className="flex-row gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height={52} className="flex-1" />
              ))}
            </View>
          ) : (
            overview && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="-mx-1"
              >
                {[
                  { label: 'EGX30', data: overview.egx30 },
                  { label: 'EGX70', data: overview.egx70 },
                  { label: 'EGX100', data: overview.egx100 },
                  overview.usdEgp
                    ? {
                        label: 'USD/EGP',
                        data: { value: overview.usdEgp, changePercent: 0 },
                      }
                    : null,
                ]
                  .filter(Boolean)
                  .map(
                    (idx) =>
                      idx && (
                        <View
                          key={idx.label}
                          className="bg-[#111118] border border-white/[0.07] rounded-xl px-3 py-2.5 mx-1 min-w-[90px]"
                        >
                          <Text className="text-xs text-slate-500 mb-1">
                            {idx.label}
                          </Text>
                          <Text className="text-sm font-bold text-white tabular-nums">
                            {idx.data?.value.toLocaleString('ar-EG', {
                              maximumFractionDigits: 0,
                            })}
                          </Text>
                          {idx.data?.changePercent !== 0 && (
                            <Text
                              className={`text-xs font-medium mt-0.5 ${
                                (idx.data?.changePercent ?? 0) >= 0
                                  ? 'text-emerald-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {(idx.data?.changePercent ?? 0) > 0 ? '+' : ''}
                              {idx.data?.changePercent?.toFixed(2)}%
                            </Text>
                          )}
                        </View>
                      ),
                  )}
              </ScrollView>
            )
          )}

          <View className="flex-row items-center bg-[#111118] border border-white/[0.07] rounded-xl px-3 gap-2">
            <Search size={15} color="#64748b" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="ابحث عن سهم..."
              placeholderTextColor="#64748b"
              className="flex-1 py-2.5 text-sm text-white"
            />
          </View>

          <View className="flex-row bg-[#111118] border border-white/[0.07] rounded-xl p-1 gap-1">
            {[
              { id: 'gainers', label: 'الصاعدة', icon: TrendingUp },
              { id: 'losers', label: 'الهابطة', icon: TrendingDown },
              { id: 'all', label: 'الكل', icon: null },
            ].map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setTab(t.id as Tab)}
                className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg ${
                  tab === t.id ? 'bg-brand' : ''
                }`}
              >
                {t.icon && (
                  <t.icon
                    size={12}
                    color={tab === t.id ? '#fff' : '#64748b'}
                  />
                )}
                <Text
                  className={`text-xs font-semibold ${
                    tab === t.id ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {loadingStocks ? (
          <View className="px-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} height={52} />
            ))}
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.ticker}
            renderItem={renderStock}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor="#10b981"
                colors={['#10b981']}
              />
            }
            showsVerticalScrollIndicator={false}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={10}
            ListEmptyComponent={
              <View className="items-center py-12">
                <Text className="text-slate-500 text-sm">لا توجد نتائج</Text>
              </View>
            }
          />
        )}
      </View>
    </ScreenWrapper>
  );
}

