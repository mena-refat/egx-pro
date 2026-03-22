import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, RefreshControl,
  TextInput, useWindowDimensions,
} from 'react-native';
import type { ListRenderItem } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Search } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { MarketStatusBadge } from '../../components/shared/MarketStatusBadge';
import StockRow from '../../components/shared/StockRow';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import { useMarketData } from '../../hooks/useMarketData';
import { useLivePrices } from '../../hooks/useLivePrices';
import { getStockName } from '../../lib/egxStocks';
import { BRAND, FONT, WEIGHT, RADIUS, SPACE } from '../../lib/theme';
import type { Stock } from '../../types/stock';
import MarketTrendFilter, { type TrendTab, type MarketTrendCounts } from '../../components/features/stocks/MarketTrendFilter';

const ITEM_HEIGHT = 65;

export default function StocksPage() {
  const router = useRouter();
  const { colors, isRTL } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;

  const [tab, setTab] = useState<TrendTab>('gainers');
  const [search, setSearch] = useState('');

  const { stocks, loadingStocks, refreshing, refresh } = useMarketData();

  const [visibleTickers, setVisibleTickers] = useState<string[]>([]);
  const { prices } = useLivePrices(visibleTickers);

  const enriched = useMemo(
    () => stocks.map((s) => ({
      ...s,
      ...(prices[s.ticker] && {
        price: prices[s.ticker].price,
        change: prices[s.ticker].change,
        changePercent: prices[s.ticker].changePercent,
      }),
    })),
    [stocks, prices],
  );

  const searchFiltered = useMemo(() => {
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
    return list;
  }, [enriched, search]);

  const trendDerived = useMemo(() => {
    const gainers = searchFiltered.filter((s) => s.changePercent > 0).sort((a, b) => (b.changePercent - a.changePercent) || (b.price - a.price));
    const losers  = searchFiltered.filter((s) => s.changePercent < 0).sort((a, b) => (a.changePercent - b.changePercent) || (b.price - a.price));
    const all     = [...searchFiltered].sort((a, b) => {
      const absA = Math.abs(a.changePercent);
      const absB = Math.abs(b.changePercent);
      if (absB !== absA) return absB - absA;
      if (b.changePercent !== a.changePercent) return b.changePercent - a.changePercent;
      return b.price - a.price;
    });
    const trendCounts: MarketTrendCounts = { gainers: gainers.length, losers: losers.length, all: all.length };
    return { gainers, losers, all, trendCounts };
  }, [searchFiltered]);

  const filtered = tab === 'gainers' ? trendDerived.gainers : tab === 'losers' ? trendDerived.losers : trendDerived.all;

  useEffect(() => {
    setVisibleTickers(filtered.slice(0, 30).map((s) => s.ticker));
  }, [filtered]);

  const keyExtractor = useCallback((item: Stock) => item.ticker, []);

  const renderItem: ListRenderItem<Stock> = useCallback(({ item: s, index }) => (
    <StockRow
      stock={s}
      livePrice={prices[s.ticker]}
      onPress={() => router.push(`/stocks/${s.ticker}`)}
      last={index === filtered.length - 1}
    />
  ), [router, prices, filtered.length]);

  const getItemLayout = useCallback((_: ArrayLike<Stock> | null | undefined, index: number) => ({
    length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index,
  }), []);

  const listHeader = useMemo(() => (
    <View>
      {/* Search */}
      <View style={{
        marginHorizontal: SPACE.lg, marginBottom: SPACE.sm, marginTop: SPACE.lg,
        backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
        borderRadius: RADIUS.lg, flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: SPACE.md, gap: SPACE.sm,
      }}>
        <Search size={15} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('market.search')}
          placeholderTextColor={colors.textMuted}
          style={{ color: colors.text, flex: 1, paddingVertical: 11, fontSize: FONT.base }}
        />
      </View>
      <MarketTrendFilter tab={tab} setTab={setTab} counts={trendDerived.trendCounts} compact={isCompact} />
      {loadingStocks && (
        <View style={{ marginHorizontal: SPACE.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.xl, overflow: 'hidden', padding: SPACE.md, gap: 2 }}>
          {Array.from({ length: 8 }).map((_, i) => <Skeleton.Box key={i} height={60} radius={RADIUS.md} />)}
        </View>
      )}
    </View>
  ), [colors, search, t, tab, trendDerived.trendCounts, isCompact, loadingStocks]);

  const listEmpty = useMemo(() => (
    loadingStocks ? null : (
      <View style={{ marginHorizontal: SPACE.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.xl, alignItems: 'center', paddingVertical: 48 }}>
        <Text style={{ color: colors.textMuted, fontSize: FONT.base }}>
          {tab === 'gainers' ? t('market.noGainers') : tab === 'losers' ? t('market.noLosers') : t('market.noAll')}
        </Text>
      </View>
    )
  ), [loadingStocks, colors, tab, t]);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <ScreenWrapper padded={false} edges={['top']}>
      {/* Header */}
      <View style={{
        borderBottomWidth: 1, borderBottomColor: colors.border,
        paddingHorizontal: SPACE.lg,
        paddingTop: isCompact ? 12 : 18, paddingBottom: isCompact ? 10 : 14,
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center', gap: SPACE.md,
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{ backgroundColor: colors.hover, borderColor: colors.border, borderWidth: 1, width: 36, height: 36, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' }}
        >
          <BackIcon size={16} color={colors.textSub} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: isCompact ? 19 : 22, fontWeight: WEIGHT.extrabold, flex: 1 }}>
          {t('market.stocks')}
        </Text>
        <MarketStatusBadge />
      </View>

      <FlatList
        data={loadingStocks ? [] : filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={<View style={{ height: 32 }} />}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={BRAND} colors={[BRAND]} />
        }
      />
    </ScreenWrapper>
  );
}
