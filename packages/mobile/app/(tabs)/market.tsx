import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, RefreshControl,
  TextInput, useWindowDimensions, I18nManager,
} from 'react-native';
import type { ListRenderItem } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Search, ChevronDown, ChevronUp,
  BarChart2, Eye, EyeOff, DollarSign,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { MarketStatusBadge } from '../../components/shared/MarketStatusBadge';
import StockRow from '../../components/shared/StockRow';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import { useMarketData } from '../../hooks/useMarketData';
import { useLivePrices } from '../../hooks/useLivePrices';
import { getStockName } from '../../lib/egxStocks';
import { BRAND, BRAND_BG_STRONG, GREEN, RED, FONT, WEIGHT, RADIUS, SPACE } from '../../lib/theme';
import type { Stock, MarketOverview, CommodityData } from '../../types/stock';
import MarketTrendFilter, { type TrendTab, type MarketTrendCounts } from '../../components/features/stocks/MarketTrendFilter';

const ITEM_HEIGHT = 65;

function n(v: number, d = 0) {
  return v.toLocaleString('en-US', { maximumFractionDigits: d });
}
function pct(v: number) {
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
}
function getUsdValue(usdEgp?: MarketOverview['usdEgp']): number {
  if (!usdEgp) return 0;
  if (typeof usdEgp === 'number') return usdEgp;
  return usdEgp.value ?? 0;
}
function getUsdChange(usdEgp?: MarketOverview['usdEgp']): number {
  if (!usdEgp || typeof usdEgp === 'number') return 0;
  return usdEgp.changePercent ?? 0;
}

// ─── IndexCard ──────────────────────────────────────────────────
function IndexCard({ label, value, changePercent }: { label: string; value: number; changePercent: number }) {
  const { colors } = useTheme();
  const clr = changePercent === 0 ? colors.textMuted : changePercent > 0 ? GREEN : RED;
  return (
    <View style={{
      backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
      borderRadius: RADIUS.lg,
      paddingHorizontal: SPACE.md,
      paddingVertical: SPACE.md,
      width: '100%',
      minHeight: 76,
    }}>
      <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 5 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: FONT.md, fontWeight: WEIGHT.bold, fontVariant: ['tabular-nums'] }}>
        {value > 0 ? n(value) : '—'}
      </Text>
      {changePercent !== 0 && (
        <Text style={{ color: clr, fontSize: FONT.xs, fontWeight: WEIGHT.semibold, marginTop: 3 }}>
          {pct(changePercent)}
        </Text>
      )}
    </View>
  );
}

// ─── CommodityKaratTable ─────────────────────────────────────────
function CommodityKaratTable({ buy24, sell24, karats }: { buy24: number; sell24: number; karats: { label: string; ratio: number }[] }) {
  const { colors } = useTheme();
  return (
    <View style={{
      backgroundColor: colors.bg, borderRadius: RADIUS.md,
      marginHorizontal: SPACE.lg, marginBottom: SPACE.md,
      borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    }}>
      <View style={{
        flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between',
        paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm,
        backgroundColor: colors.hover, borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: WEIGHT.semibold, flex: 1 }}>العيار</Text>
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: WEIGHT.semibold, width: 90, textAlign: 'center' }}>شراء (EGP/جم)</Text>
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: WEIGHT.semibold, width: 90, textAlign: 'center' }}>بيع (EGP/جم)</Text>
      </View>
      {karats.map((k, i) => (
        <View
          key={k.label}
          style={{
            flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm + 2,
            borderBottomWidth: i < karats.length - 1 ? 1 : 0, borderBottomColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.semibold, flex: 1 }}>{k.label}</Text>
          <Text style={{ color: GREEN, fontSize: FONT.sm, fontWeight: WEIGHT.bold, width: 90, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
            {n(buy24 * k.ratio, 2)}
          </Text>
          <Text style={{ color: RED, fontSize: FONT.sm, fontWeight: WEIGHT.bold, width: 90, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
            {n(sell24 * k.ratio, 2)}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── ForexBuySellPanel ─────────────────────────────────────────
function ForexBuySellPanel({ buy, sell }: { buy: number; sell: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: SPACE.md, paddingHorizontal: SPACE.lg, gap: 6 }}>
      <View style={{ flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', gap: SPACE.md }}>
        <Text style={{ color: GREEN, fontSize: FONT.xs, fontWeight: WEIGHT.semibold }}>شراء</Text>
        <Text style={{ color: colors.text, fontSize: FONT.xs, fontWeight: WEIGHT.bold, fontVariant: ['tabular-nums'] }}>{n(buy, 2)} EGP</Text>
      </View>
      <View style={{ flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', gap: SPACE.md }}>
        <Text style={{ color: RED, fontSize: FONT.xs, fontWeight: WEIGHT.semibold }}>بيع</Text>
        <Text style={{ color: colors.text, fontSize: FONT.xs, fontWeight: WEIGHT.bold, fontVariant: ['tabular-nums'] }}>{n(sell, 2)} EGP</Text>
      </View>
    </View>
  );
}

// ─── CommodityRow ────────────────────────────────────────────────
function CommodityRow({ emoji, label, subtitle, priceLabel, priceValue, changePercent, buy, sell, expandedContent }: {
  emoji: string; label: string; subtitle?: string; priceLabel?: string;
  priceValue: number; changePercent?: number; buy?: number; sell?: number;
  expandedContent?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const isUp    = (changePercent ?? 0) >= 0;
  const pctClr  = (changePercent ?? 0) === 0 ? colors.textMuted : isUp ? GREEN : RED;
  const hasExpand = !!expandedContent;

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Pressable
        onPress={() => hasExpand && setExpanded((e) => !e)}
        style={({ pressed }) => ({
          backgroundColor: pressed && hasExpand ? colors.hover : 'transparent',
          paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
          flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
        })}
      >
        <View style={{ width: 42, height: 42, borderRadius: RADIUS.md, backgroundColor: colors.hover, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Text style={{ fontSize: 18 }}>{emoji}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: colors.text, fontSize: FONT.base, fontWeight: WEIGHT.bold }}>{label}</Text>
          {subtitle && <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{subtitle}</Text>}
          {buy !== undefined && sell !== undefined && (buy > 0 || sell > 0) && (
            <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: 3 }}>
              <Text style={{ color: GREEN, fontSize: 11, fontWeight: WEIGHT.semibold }}>شراء {n(buy, 2)}</Text>
              <Text style={{ color: colors.border, fontSize: 11 }}>|</Text>
              <Text style={{ color: RED, fontSize: 11, fontWeight: WEIGHT.semibold }}>بيع {n(sell, 2)}</Text>
            </View>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <Text style={{ color: colors.text, fontSize: FONT.base, fontWeight: WEIGHT.bold, fontVariant: ['tabular-nums'] }}>
            {priceValue > 0 ? n(priceValue, 2) : '—'}
          </Text>
          {(changePercent ?? 0) !== 0 && (
            <Text style={{ color: pctClr, fontSize: FONT.xs, fontWeight: WEIGHT.semibold, marginTop: 2 }}>
              {pct(changePercent ?? 0)}
            </Text>
          )}
          {priceLabel && <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 1 }}>{priceLabel}</Text>}
        </View>
        {hasExpand && (
          expanded ? <ChevronUp size={16} color={colors.textMuted} /> : <ChevronDown size={16} color={colors.textMuted} />
        )}
      </Pressable>
      {expanded && expandedContent}
    </View>
  );
}

// ─── CommoditiesSection ──────────────────────────────────────────
function CommoditiesSection({ overview }: { overview: MarketOverview }) {
  const { colors } = useTheme();
  const usdValue   = getUsdValue(overview.usdEgp);
  const usdChange  = getUsdChange(overview.usdEgp);
  const gold       = overview.gold as CommodityData | undefined;
  const silver     = overview.silver as CommodityData | undefined;

  const goldBuy24   = gold?.buyEgxPerGram  ?? 0;
  const goldSell24  = gold?.sellEgxPerGram ?? 0;
  const goldPrice   = (goldBuy24 > 0 || goldSell24 > 0) ? (goldBuy24 + goldSell24) / 2 : 0;
  const silverBuy   = silver?.buyEgxPerGram  ?? 0;
  const silverSell  = silver?.sellEgxPerGram ?? 0;
  const silverPrice = (silverBuy > 0 || silverSell > 0) ? (silverBuy + silverSell) / 2 : 0;

  // Approximation for display when API only provides mid USD/EGP.
  const usdBuy  = usdValue > 0 ? usdValue * 0.995 : 0;
  const usdSell = usdValue > 0 ? usdValue * 1.005 : 0;

  const goldKarats   = [{ label: 'عيار 24', ratio: 1 }, { label: 'عيار 21', ratio: 21/24 }, { label: 'عيار 18', ratio: 18/24 }, { label: 'عيار 14', ratio: 14/24 }];
  const silverKarats = [{ label: 'عيار 999', ratio: 1 }, { label: 'عيار 925', ratio: 925/999 }, { label: 'عيار 800', ratio: 800/999 }];

  return (
    <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: RADIUS.xl, overflow: 'hidden', marginHorizontal: SPACE.lg, marginBottom: SPACE.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ width: 26, height: 26, borderRadius: RADIUS.sm, backgroundColor: '#f59e0b18', alignItems: 'center', justifyContent: 'center' }}>
          <DollarSign size={13} color="#f59e0b" />
        </View>
        <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>العملات والسلع</Text>
        <Text style={{ color: colors.textMuted, fontSize: 11 }}>اضغط للتوسع</Text>
      </View>
      <CommodityRow
        emoji="💵"
        label="الدولار الأمريكي"
        subtitle="USD / EGP"
        priceValue={usdValue}
        changePercent={usdChange}
        priceLabel="EGP"
        expandedContent={(usdBuy > 0 || usdSell > 0) ? <ForexBuySellPanel buy={usdBuy} sell={usdSell} /> : undefined}
      />
      <CommodityRow
        emoji="🥇" label="الذهب" subtitle="عيار 24 — للجرام"
        priceValue={goldPrice} changePercent={gold?.changePercent} buy={goldBuy24} sell={goldSell24} priceLabel="EGP/جم"
        expandedContent={(goldBuy24 > 0 || goldSell24 > 0) ? <CommodityKaratTable buy24={goldBuy24} sell24={goldSell24} karats={goldKarats} /> : undefined}
      />
      <CommodityRow
        emoji="🥈" label="الفضة" subtitle="عيار 999 — للجرام"
        priceValue={silverPrice} changePercent={silver?.changePercent} buy={silverBuy} sell={silverSell} priceLabel="EGP/جم"
        expandedContent={(silverBuy > 0 || silverSell > 0) ? <CommodityKaratTable buy24={silverBuy} sell24={silverSell} karats={silverKarats} /> : undefined}
      />
    </View>
  );
}

// ─── IndicesSection ──────────────────────────────────────────────
const EGX_INDICES = [
  { key: 'egx30', label: 'EGX 30' }, { key: 'egx30Capped', label: 'EGX 30 Capped' },
  { key: 'egx70', label: 'EGX 70 EWI' }, { key: 'egx100', label: 'EGX 100 EWI' },
  { key: 'egx33', label: 'EGX 33 Shariah' }, { key: 'egx35', label: 'EGX 35 LV' },
] as const;

function IndicesSection({ overview, loading }: { overview: MarketOverview | null; loading: boolean }) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(true);
  return (
    <View style={{ marginHorizontal: SPACE.lg, marginBottom: SPACE.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
          <View style={{ width: 26, height: 26, borderRadius: RADIUS.sm, backgroundColor: BRAND_BG_STRONG, alignItems: 'center', justifyContent: 'center' }}>
            <BarChart2 size={13} color={BRAND} />
          </View>
          <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>المؤشرات</Text>
        </View>
        <Pressable
          onPress={() => setVisible((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: SPACE.sm, paddingVertical: 5, borderRadius: RADIUS.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
        >
          {visible ? <EyeOff size={13} color={colors.textSub} /> : <Eye size={13} color={colors.textSub} />}
          <Text style={{ color: colors.textSub, fontSize: FONT.xs, fontWeight: WEIGHT.semibold }}>{visible ? 'إخفاء' : 'إظهار'}</Text>
        </Pressable>
      </View>
      {visible && (
        loading ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, alignItems: 'stretch' }}>
            {[1,2,3,4,5,6].map((i) => (
              <View key={i} style={{ width: '48%' }}>
                <Skeleton.Box height={76} radius={RADIUS.lg} />
              </View>
            ))}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, alignItems: 'stretch' }}>
            {EGX_INDICES.map(({ key, label }) => {
              const data = overview?.[key];
              return (
                <View key={key} style={{ width: '48%' }}>
                  <IndexCard label={label} value={data?.value ?? 0} changePercent={data?.changePercent ?? 0} />
                </View>
              );
            })}
          </View>
        )
      )}
    </View>
  );
}

// ─── MarketListHeader ────────────────────────────────────────────
interface HeaderProps {
  overview: MarketOverview | null;
  loadingOverview: boolean;
  loadingStocks: boolean;
  isCompact: boolean;
  tab: TrendTab;
  setTab: (t: TrendTab) => void;
  search: string;
  setSearch: (s: string) => void;
  trendCounts: MarketTrendCounts;
}
const MarketListHeader = React.memo(function MarketListHeader({ overview, loadingOverview, loadingStocks, isCompact, tab, setTab, search, setSearch, trendCounts }: HeaderProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View>
      <View style={{ paddingTop: SPACE.lg }}>
        <IndicesSection overview={overview} loading={loadingOverview} />
      </View>
      {loadingOverview ? (
        <View style={{ marginHorizontal: SPACE.lg, marginBottom: SPACE.lg }}>
          <Skeleton.Box height={220} radius={RADIUS.xl} />
        </View>
      ) : overview ? (
        <CommoditiesSection overview={overview} />
      ) : null}
      {/* Search */}
      <View style={{
        marginHorizontal: SPACE.lg, marginBottom: SPACE.sm, marginTop: 4,
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
      <MarketTrendFilter
        tab={tab}
        setTab={setTab}
        counts={trendCounts}
        compact={isCompact}
      />
      {loadingStocks && (
        <View style={{ marginHorizontal: SPACE.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.xl, overflow: 'hidden', padding: SPACE.md, gap: 2 }}>
          {Array.from({ length: 8 }).map((_, i) => <Skeleton.Box key={i} height={60} radius={RADIUS.md} />)}
        </View>
      )}
    </View>
  );
});

// ─── MarketPage ──────────────────────────────────────────────────
export default function MarketPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const [tab, setTab] = useState<TrendTab>('gainers');
  const [search, setSearch] = useState('');
  const { overview, stocks, loadingStocks, loadingOverview, refreshing, refresh } = useMarketData();

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
    const losers = searchFiltered.filter((s) => s.changePercent < 0).sort((a, b) => (a.changePercent - b.changePercent) || (b.price - a.price));
    const all = [...searchFiltered].sort((a, b) => {
      const absA = Math.abs(a.changePercent);
      const absB = Math.abs(b.changePercent);
      if (absB !== absA) return absB - absA; // biggest move first (up or down)
      if (b.changePercent !== a.changePercent) return b.changePercent - a.changePercent; // prefer gainers in ties
      return b.price - a.price;
    });

    const trendCounts: MarketTrendCounts = {
      gainers: gainers.length,
      losers: losers.length,
      all: all.length,
    };

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
    <MarketListHeader
      overview={overview} loadingOverview={loadingOverview} loadingStocks={loadingStocks}
      isCompact={isCompact} tab={tab} setTab={setTab} search={search} setSearch={setSearch}
      trendCounts={trendDerived.trendCounts}
    />
  ), [overview, loadingOverview, loadingStocks, isCompact, tab, search, trendDerived.trendCounts]);

  const listEmpty = useMemo(() => (
    loadingStocks ? null : (
      <View style={{ marginHorizontal: SPACE.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.xl, alignItems: 'center', paddingVertical: 48 }}>
        <Text style={{ color: colors.textMuted, fontSize: FONT.base }}>
          {tab === 'gainers'
            ? t('market.noGainers')
            : tab === 'losers'
              ? t('market.noLosers')
              : t('market.noAll')}
        </Text>
      </View>
    )
  ), [loadingStocks, colors, tab, t]);

  return (
    <ScreenWrapper padded={false} edges={['top']}>
      <View style={{ flex: 1 }}>
        <View style={{
          borderBottomWidth: 1, borderBottomColor: colors.border,
          paddingHorizontal: SPACE.lg, paddingTop: isCompact ? 12 : 18, paddingBottom: isCompact ? 10 : 14,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Text style={{ color: colors.text, fontSize: isCompact ? 19 : 22, fontWeight: WEIGHT.extrabold }}>السوق</Text>
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
      </View>
    </ScreenWrapper>
  );
}
