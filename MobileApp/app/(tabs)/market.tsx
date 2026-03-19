import { useMemo, useState, useCallback, useEffect } from 'react';
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
import { useTheme } from '../../hooks/useTheme';
import { useMarketData } from '../../hooks/useMarketData';
import { useLivePrices } from '../../hooks/useLivePrices';
import { getStockName } from '../../lib/egxStocks';
import type { Stock } from '../../types/stock';

type Tab = 'gainers' | 'losers' | 'all';

export default function MarketPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('gainers');
  const [search, setSearch] = useState('');
  const { overview, stocks, loadingStocks, loadingOverview, refreshing, refresh } =
    useMarketData();

  const [visibleTickers, setVisibleTickers] = useState<string[]>([]);
  const { prices } = useLivePrices(visibleTickers);

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
    if (tab === 'gainers') return list.filter((s) => s.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent);
    if (tab === 'losers')  return list.filter((s) => s.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent);
    return list.sort((a, b) => b.changePercent - a.changePercent);
  }, [enriched, tab, search]);

  useEffect(() => {
    setVisibleTickers(filtered.slice(0, 30).map((s) => s.ticker));
  }, [filtered]);

  const renderStock = useCallback(
    ({ item: s }: { item: Stock }) => (
      <Pressable
        onPress={() => router.push(`/stocks/${s.ticker}`)}
        style={({ pressed }) => [
          { borderBottomColor: colors.border2, backgroundColor: pressed ? colors.hover : 'transparent' },
        ]}
        className="flex-row items-center justify-between py-3.5 px-4 border-b"
      >
        <View className="flex-1">
          <Text style={{ color: colors.text }} className="text-sm font-bold">{s.ticker}</Text>
          <Text style={{ color: colors.textSub }} className="text-xs mt-0.5" numberOfLines={1}>
            {getStockName(s.ticker, 'ar')}
          </Text>
        </View>
        <View className="items-end gap-1">
          <Text style={{ color: colors.text }} className="text-sm font-bold tabular-nums">
            {(s.price ?? 0).toFixed(2)}
          </Text>
          <PriceTag change={s.change} changePercent={s.changePercent} size="sm" showIcon={false} />
        </View>
      </Pressable>
    ),
    [router, colors],
  );

  return (
    <ScreenWrapper padded={false}>
      <View className="flex-1">
        <View className="px-4 pt-5 pb-3 gap-3">
          <View className="flex-row items-center justify-between">
            <Text style={{ color: colors.text }} className="text-xl font-bold">الأسواق</Text>
            <MarketStatusBadge />
          </View>

          {/* Index Overview */}
          {loadingOverview ? (
            <View className="flex-row gap-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} height={52} className="flex-1" />)}
            </View>
          ) : (
            overview && (
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
                      className="border rounded-xl px-3 py-2.5 mx-1 min-w-[90px]"
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
            )
          )}

          {/* Search */}
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="flex-row items-center border rounded-xl px-3 gap-2"
          >
            <Search size={15} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="ابحث عن سهم..."
              placeholderTextColor={colors.textMuted}
              style={{ color: colors.text }}
              className="flex-1 py-2.5 text-sm"
            />
          </View>

          {/* Tabs */}
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="flex-row border rounded-xl p-1 gap-1"
          >
            {[
              { id: 'gainers', label: 'الصاعدة', icon: TrendingUp },
              { id: 'losers',  label: 'الهابطة', icon: TrendingDown },
              { id: 'all',     label: 'الكل',     icon: null },
            ].map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setTab(t.id as Tab)}
                className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg ${
                  tab === t.id ? 'bg-brand' : ''
                }`}
              >
                {t.icon && (
                  <t.icon size={12} color={tab === t.id ? '#fff' : colors.textMuted} />
                )}
                <Text
                  className="text-xs font-semibold"
                  style={{ color: tab === t.id ? '#fff' : colors.textMuted }}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {loadingStocks ? (
          <View className="px-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={52} />)}
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
                tintColor="#8b5cf6"
                colors={['#8b5cf6']}
              />
            }
            showsVerticalScrollIndicator={false}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={10}
            ListEmptyComponent={
              <View className="items-center py-12">
                <Text style={{ color: colors.textMuted }} className="text-sm">لا توجد نتائج</Text>
              </View>
            }
          />
        )}
      </View>
    </ScreenWrapper>
  );
}
