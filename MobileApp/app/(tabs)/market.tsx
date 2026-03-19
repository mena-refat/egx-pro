import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, RefreshControl,
  TextInput, I18nManager, useWindowDimensions,
} from 'react-native';
import type { ListRenderItem } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search, TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  BarChart2, Eye, EyeOff, DollarSign,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { MarketStatusBadge } from '../../components/shared/MarketStatusBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import { useMarketData } from '../../hooks/useMarketData';
import { useLivePrices } from '../../hooks/useLivePrices';
import { getStockName } from '../../lib/egxStocks';
import type { Stock, MarketOverview, CommodityData } from '../../types/stock';

type Tab = 'gainers' | 'losers' | 'all';

const ITEM_HEIGHT = 65;

// ─── helpers ───────────────────────────────────────────────────
function n(v: number, d = 0) {
  return v.toLocaleString('en-US', { maximumFractionDigits: d });
}

function pct(v: number) {
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
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

// ─── IndexCard ─────────────────────────────────────────────────
function IndexCard({
  label, value, changePercent, colors,
}: {
  label: string;
  value: number;
  changePercent: number;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const isUp = changePercent >= 0;
  const clr = changePercent === 0 ? colors.textMuted : isUp ? '#4ade80' : '#f87171';
  return (
    <View style={{
      backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
      borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, flex: 1,
    }}>
      <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 5 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
        {value > 0 ? n(value) : '—'}
      </Text>
      {changePercent !== 0 && (
        <Text style={{ color: clr, fontSize: 12, fontWeight: '600', marginTop: 3 }}>
          {pct(changePercent)}
        </Text>
      )}
    </View>
  );
}

// ─── CommodityKaratTable ────────────────────────────────────────
function CommodityKaratTable({
  buy24, sell24, karats, colors,
}: {
  buy24: number;
  sell24: number;
  karats: { label: string; ratio: number }[];
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={{
      backgroundColor: colors.bg, borderRadius: 12,
      marginHorizontal: 16, marginBottom: 12,
      borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    }}>
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between',
        paddingHorizontal: 14, paddingVertical: 8,
        backgroundColor: colors.hover, borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', flex: 1 }}>العيار</Text>
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', width: 90, textAlign: 'center' }}>شراء (EGP/جم)</Text>
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', width: 90, textAlign: 'center' }}>بيع (EGP/جم)</Text>
      </View>
      {karats.map((k, i) => {
        const buyK = buy24 * k.ratio;
        const sellK = sell24 * k.ratio;
        return (
          <View
            key={k.label}
            style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              paddingHorizontal: 14, paddingVertical: 10,
              borderBottomWidth: i < karats.length - 1 ? 1 : 0, borderBottomColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', flex: 1 }}>{k.label}</Text>
            <Text style={{ color: '#4ade80', fontSize: 13, fontWeight: '700', width: 90, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
              {n(buyK, 2)}
            </Text>
            <Text style={{ color: '#f87171', fontSize: 13, fontWeight: '700', width: 90, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
              {n(sellK, 2)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── CommodityRow ───────────────────────────────────────────────
function CommodityRow({
  emoji, label, subtitle, priceLabel, priceValue, changePercent, buy, sell, expandedContent, colors,
}: {
  emoji: string;
  label: string;
  subtitle?: string;
  priceLabel?: string;
  priceValue: number;
  changePercent?: number;
  buy?: number;
  sell?: number;
  expandedContent?: React.ReactNode;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [expanded, setExpanded] = useState(false);
  const isUp = (changePercent ?? 0) >= 0;
  const pctClr = (changePercent ?? 0) === 0 ? colors.textMuted : isUp ? '#4ade80' : '#f87171';
  const hasExpand = !!expandedContent;

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Pressable
        onPress={() => hasExpand && setExpanded((e) => !e)}
        style={({ pressed }) => ({
          backgroundColor: pressed && hasExpand ? colors.hover : 'transparent',
          paddingHorizontal: 16, paddingVertical: 13,
          flexDirection: 'row', alignItems: 'center', gap: 12,
        })}
      >
        <View style={{
          width: 42, height: 42, borderRadius: 12,
          backgroundColor: colors.hover, borderWidth: 1, borderColor: colors.border,
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Text style={{ fontSize: 18 }}>{emoji}</Text>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{label}</Text>
          {subtitle && (
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{subtitle}</Text>
          )}
          {buy !== undefined && sell !== undefined && buy > 0 && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 3 }}>
              <Text style={{ color: '#4ade80', fontSize: 11, fontWeight: '600' }}>
                شراء {n(buy, 2)}
              </Text>
              <Text style={{ color: colors.border, fontSize: 11 }}>|</Text>
              <Text style={{ color: '#f87171', fontSize: 11, fontWeight: '600' }}>
                بيع {n(sell, 2)}
              </Text>
            </View>
          )}
        </View>

        <View style={{ alignItems: I18nManager.isRTL ? 'flex-start' : 'flex-end', flexShrink: 0 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {priceValue > 0 ? n(priceValue, 2) : '—'}
          </Text>
          {(changePercent ?? 0) !== 0 && (
            <Text style={{ color: pctClr, fontSize: 12, fontWeight: '600', marginTop: 2 }}>
              {pct(changePercent ?? 0)}
            </Text>
          )}
          {priceLabel && (
            <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 1 }}>{priceLabel}</Text>
          )}
        </View>

        {hasExpand && (
          <View style={{ flexShrink: 0, marginLeft: 4 }}>
            {expanded
              ? <ChevronUp size={16} color={colors.textMuted} />
              : <ChevronDown size={16} color={colors.textMuted} />}
          </View>
        )}
      </Pressable>

      {expanded && expandedContent}
    </View>
  );
}

// ─── CommoditiesSection ─────────────────────────────────────────
function CommoditiesSection({
  overview, colors,
}: {
  overview: MarketOverview;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const usdValue = getUsdValue(overview.usdEgp);
  const usdChangePct = getUsdChange(overview.usdEgp);

  const gold = overview.gold as CommodityData | undefined;
  const silver = overview.silver as CommodityData | undefined;

  const goldBuy24 = gold?.buyEgxPerGram ?? 0;
  const goldSell24 = gold?.sellEgxPerGram ?? 0;
  const goldPrice = goldBuy24 > 0 ? (goldBuy24 + goldSell24) / 2 : 0;

  const silverBuy999 = silver?.buyEgxPerGram ?? 0;
  const silverSell999 = silver?.sellEgxPerGram ?? 0;
  const silverPrice = silverBuy999 > 0 ? (silverBuy999 + silverSell999) / 2 : 0;

  const goldKarats = [
    { label: 'عيار 24', ratio: 1 },
    { label: 'عيار 21', ratio: 21 / 24 },
    { label: 'عيار 18', ratio: 18 / 24 },
    { label: 'عيار 14', ratio: 14 / 24 },
  ];

  const silverKarats = [
    { label: 'عيار 999', ratio: 1 },
    { label: 'عيار 925', ratio: 925 / 999 },
    { label: 'عيار 800', ratio: 800 / 999 },
  ];

  return (
    <View style={{
      backgroundColor: colors.card, borderColor: colors.border,
      borderWidth: 1, borderRadius: 20, overflow: 'hidden', marginHorizontal: 16, marginBottom: 16,
    }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 16, paddingVertical: 13,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: '#f59e0b18', alignItems: 'center', justifyContent: 'center' }}>
          <DollarSign size={13} color="#f59e0b" />
        </View>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>العملات والسلع</Text>
        <Text style={{ color: colors.textMuted, fontSize: 11 }}>اضغط للتوسع</Text>
      </View>

      <CommodityRow
        emoji="💵"
        label="الدولار الأمريكي"
        subtitle="USD / EGP"
        priceValue={usdValue}
        changePercent={usdChangePct}
        priceLabel="EGP"
        colors={colors}
      />

      <CommodityRow
        emoji="🥇"
        label="الذهب"
        subtitle="عيار 24 — للجرام"
        priceValue={goldPrice}
        changePercent={gold?.changePercent}
        buy={goldBuy24}
        sell={goldSell24}
        priceLabel="EGP/جم"
        expandedContent={
          goldBuy24 > 0 ? (
            <CommodityKaratTable
              buy24={goldBuy24} sell24={goldSell24}
              karats={goldKarats} colors={colors}
            />
          ) : undefined
        }
        colors={colors}
      />

      <CommodityRow
        emoji="🥈"
        label="الفضة"
        subtitle="عيار 999 — للجرام"
        priceValue={silverPrice}
        changePercent={silver?.changePercent}
        buy={silverBuy999}
        sell={silverSell999}
        priceLabel="EGP/جم"
        expandedContent={
          silverBuy999 > 0 ? (
            <CommodityKaratTable
              buy24={silverBuy999} sell24={silverSell999}
              karats={silverKarats} colors={colors}
            />
          ) : undefined
        }
        colors={colors}
      />
    </View>
  );
}

// ─── IndicesSection ─────────────────────────────────────────────
const EGX_INDICES = [
  { key: 'egx30',       label: 'EGX 30' },
  { key: 'egx30Capped', label: 'EGX 30 Capped' },
  { key: 'egx70',       label: 'EGX 70 EWI' },
  { key: 'egx100',      label: 'EGX 100 EWI' },
  { key: 'egx33',       label: 'EGX 33 Shariah' },
  { key: 'egx35',       label: 'EGX 35 LV' },
] as const;

function IndicesSection({
  overview, loading, colors,
}: {
  overview: MarketOverview | null;
  loading: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [visible, setVisible] = useState(true);

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: '#8b5cf618', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart2 size={13} color="#8b5cf6" />
          </View>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>المؤشرات</Text>
        </View>
        <Pressable
          onPress={() => setVisible((v) => !v)}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 5,
            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
            backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
          }}
        >
          {visible ? <EyeOff size={13} color={colors.textSub} /> : <Eye size={13} color={colors.textSub} />}
          <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '600' }}>
            {visible ? 'إخفاء' : 'إظهار'}
          </Text>
        </Pressable>
      </View>

      {visible && (
        loading ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={{ flex: 1, minWidth: '45%' }}>
                <Skeleton height={76} borderRadius={20} />
              </View>
            ))}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {EGX_INDICES.map(({ key, label }) => {
              const data = overview?.[key];
              return (
                <View key={key} style={{ flex: 1, minWidth: '45%' }}>
                  <IndexCard
                    label={label}
                    value={data?.value ?? 0}
                    changePercent={data?.changePercent ?? 0}
                    colors={colors}
                  />
                </View>
              );
            })}
          </View>
        )
      )}
    </View>
  );
}

// ─── StockRow (memoized) ─────────────────────────────────────────
const StockRow = React.memo(function StockRow({
  s, onPress, colors,
}: {
  s: Stock;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const isUp = s.changePercent > 0;
  const isNeutral = s.changePercent === 0;
  const gainColor = isNeutral ? colors.textSub : isUp ? '#4ade80' : '#f87171';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.hover : colors.card,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        paddingHorizontal: 16, paddingVertical: 12,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      })}
    >
      <View style={{
        width: 40, height: 40, borderRadius: 10,
        backgroundColor: '#8b5cf618', borderWidth: 1, borderColor: '#8b5cf628',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Text style={{ color: '#8b5cf6', fontSize: 8, fontWeight: '800', letterSpacing: -0.3 }} numberOfLines={1}>
          {s.ticker.slice(0, 4)}
        </Text>
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{s.ticker}</Text>
        <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
          {getStockName(s.ticker, 'ar')}
        </Text>
      </View>

      <View style={{ alignItems: I18nManager.isRTL ? 'flex-start' : 'flex-end', flexShrink: 0 }}>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {(s.price ?? 0).toFixed(2)}
        </Text>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3,
          backgroundColor: isNeutral ? colors.hover : isUp ? '#4ade8018' : '#f8717118',
          paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6,
        }}>
          {!isNeutral && (isUp
            ? <TrendingUp size={9} color={gainColor} />
            : <TrendingDown size={9} color={gainColor} />)}
          <Text style={{ color: gainColor, fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
            {isUp ? '+' : ''}{s.changePercent.toFixed(2)}%
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

// ─── MarketListHeader ────────────────────────────────────────────
interface HeaderProps {
  overview: MarketOverview | null;
  loadingOverview: boolean;
  loadingStocks: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
  isCompact: boolean;
  tab: Tab;
  setTab: (t: Tab) => void;
  search: string;
  setSearch: (s: string) => void;
}

const MarketListHeader = React.memo(function MarketListHeader({
  overview, loadingOverview, loadingStocks, colors, isCompact, tab, setTab, search, setSearch,
}: HeaderProps) {
  const TABS = [
    { id: 'gainers' as Tab, label: 'الصاعدة', icon: TrendingUp, color: '#4ade80' },
    { id: 'losers'  as Tab, label: 'الهابطة', icon: TrendingDown, color: '#f87171' },
    { id: 'all'     as Tab, label: 'الكل',    icon: null,         color: '#8b5cf6' },
  ];

  return (
    <View>
      {/* Indices */}
      <View style={{ paddingTop: 16 }}>
        <IndicesSection overview={overview} loading={loadingOverview} colors={colors} />
      </View>

      {/* Commodities */}
      {loadingOverview ? (
        <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
          <Skeleton height={220} borderRadius={20} />
        </View>
      ) : overview ? (
        <CommoditiesSection overview={overview} colors={colors} />
      ) : null}

      {/* Search */}
      <View style={{
        marginHorizontal: 16, marginBottom: 8, marginTop: 4,
        backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
        borderRadius: 14, flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, gap: 8,
      }}>
        <Search size={15} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="ابحث عن سهم..."
          placeholderTextColor={colors.textMuted}
          style={{ color: colors.text, flex: 1, paddingVertical: 11, fontSize: 14 }}
        />
      </View>

      {/* Tabs */}
      <View style={{
        marginHorizontal: 16, marginBottom: 8,
        backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
        borderRadius: 14, padding: 4, flexDirection: 'row', gap: 4,
      }}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 5, paddingVertical: isCompact ? 8 : 9, borderRadius: 10,
                backgroundColor: active ? (t.color + '22') : 'transparent',
                borderWidth: active ? 1 : 0,
                borderColor: active ? (t.color + '44') : 'transparent',
              }}
            >
              {t.icon && <t.icon size={12} color={active ? t.color : colors.textMuted} />}
              <Text style={{
                fontSize: isCompact ? 11 : 12, fontWeight: '700',
                color: active ? t.color : colors.textMuted,
              }}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Stock list loading skeletons */}
      {loadingStocks && (
        <View style={{
          marginHorizontal: 16,
          backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
          borderRadius: 20, overflow: 'hidden', padding: 12, gap: 2,
        }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={60} borderRadius={12} />
          ))}
        </View>
      )}
    </View>
  );
});

// ─── MarketPage ─────────────────────────────────────────────────
export default function MarketPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const [tab, setTab] = useState<Tab>('gainers');
  const [search, setSearch] = useState('');
  const { overview, stocks, loadingStocks, loadingOverview, refreshing, refresh } = useMarketData();

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

  const keyExtractor = useCallback((item: Stock) => item.ticker, []);

  const renderItem: ListRenderItem<Stock> = useCallback(({ item: s }) => (
    <StockRow
      s={s}
      onPress={() => router.push(`/stocks/${s.ticker}`)}
      colors={colors}
    />
  ), [colors, router]);

  const getItemLayout = useCallback((_: ArrayLike<Stock> | null | undefined, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  const listHeader = useMemo(() => (
    <MarketListHeader
      overview={overview}
      loadingOverview={loadingOverview}
      loadingStocks={loadingStocks}
      colors={colors}
      isCompact={isCompact}
      tab={tab}
      setTab={setTab}
      search={search}
      setSearch={setSearch}
    />
  ), [overview, loadingOverview, loadingStocks, colors, isCompact, tab, search]);

  const listEmpty = useMemo(() => (
    loadingStocks ? null : (
      <View style={{
        marginHorizontal: 16,
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: 20, alignItems: 'center', paddingVertical: 48,
      }}>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>لا توجد نتائج</Text>
      </View>
    )
  ), [loadingStocks, colors]);

  return (
    <ScreenWrapper padded={false} edges={['top']}>
      <View style={{ flex: 1 }}>
        {/* Fixed page header */}
        <View style={{
          borderBottomWidth: 1, borderBottomColor: colors.border,
          paddingHorizontal: 16, paddingTop: isCompact ? 12 : 18, paddingBottom: isCompact ? 10 : 14,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Text style={{ color: colors.text, fontSize: isCompact ? 19 : 22, fontWeight: '800' }}>Market</Text>
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
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#8b5cf6" colors={['#8b5cf6']} />
          }
        />
      </View>
    </ScreenWrapper>
  );
}
