import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View, Text, ScrollView, RefreshControl, Pressable, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell, TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  Briefcase, Star, BarChart2,
} from 'lucide-react-native';
import { I18nManager } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { WatchlistRow } from '../../components/features/dashboard/WatchlistRow';
import { MarketStatusBadge } from '../../components/shared/MarketStatusBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useLivePrices } from '../../hooks/useLivePrices';
import { useMarketData } from '../../hooks/useMarketData';
import { usePortfolioData } from '../../hooks/useMarketData';
import { getStockName } from '../../lib/egxStocks';
import apiClient from '../../lib/api/client';
import type { Stock } from '../../types/stock';

/* ─── Unread notifications count ─── */
function useUnreadCount() {
  const [count, setCount] = useState(0);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const fetchCount = useCallback(() => {
    const c = new AbortController();
    apiClient.get('/api/notifications?limit=1', { signal: c.signal })
      .then((res) => {
        const data = res.data as { unreadCount?: number };
        if (mountedRef.current) setCount(data.unreadCount ?? 0);
      }).catch(() => null);
    return () => c.abort();
  }, []);

  // Initial fetch
  useEffect(() => fetchCount(), [fetchCount]);

  // Refresh every time the home tab is focused (e.g. returning from notifications page)
  useFocusEffect(useCallback(() => {
    const cleanup = fetchCount();
    return cleanup;
  }, [fetchCount]));

  return count;
}

/* ─── local hook ─── */
function useWatchlist() {
  const [items, setItems] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
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
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load]);

  const refetch = useCallback(() => { const c = new AbortController(); return load(c.signal); }, [load]);
  return { items, loading, refetch };
}

/* ─── formatters ─── */
function fmtNum(n: number) {
  return n.toLocaleString('ar-EG', { maximumFractionDigits: 0 });
}

function fmtMoney(n: number) {
  return Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ─── Portfolio Summary Card ─── */
function PortfolioSummaryCard({
  totalValue, totalCost, totalGainLoss, totalGainLossPercent, loading, onPress,
}: {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  loading: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const isUp = totalGainLoss > 0;
  const isDown = totalGainLoss < 0;
  const gainColor = isUp ? '#4ade80' : isDown ? '#f87171' : colors.textSub;
  const gainBg   = isUp ? '#4ade8018' : isDown ? '#f8717118' : `${colors.border}`;

  if (loading) {
    return (
      <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="mx-4 border rounded-2xl overflow-hidden">
        <View className="px-5 pt-6 pb-5 items-center gap-3">
          <Skeleton height={10} className="w-32" />
          <Skeleton height={52} className="w-56" />
          <Skeleton height={22} className="w-44" />
        </View>
        <View className="flex-row" style={{ borderTopColor: colors.border2, borderTopWidth: 1 }}>
          {[1, 2].map((i) => (
            <View key={i} className="flex-1 px-5 py-3 items-center gap-1.5">
              <Skeleton height={10} className="w-20" />
              <Skeleton height={16} className="w-28" />
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Split value: "44,470" + ".18"
  const [whole, dec] = fmtMoney(totalValue).split('.');
  const sign = isUp ? '+' : isDown ? '-' : '';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { backgroundColor: pressed ? colors.hover : colors.card, borderColor: colors.border },
      ]}
      className="mx-4 border rounded-2xl overflow-hidden"
    >
      {/* ── Main value ── */}
      <View className="px-5 pt-6 pb-5 items-center">
        {/* Label */}
        <Text style={{ color: colors.textMuted }} className="text-xs tracking-widest uppercase mb-4">
          قيمة محفظتي
        </Text>

        {/* Big number: EGP 44,470 .18 */}
        <View className="flex-row items-baseline justify-center gap-1 mb-3">
          <Text style={{ color: colors.textMuted }} className="text-xl font-medium mb-1">EGP</Text>
          <Text style={{ color: colors.text }} className="text-5xl font-bold tabular-nums tracking-tight">
            {whole}
          </Text>
          <Text style={{ color: colors.text }} className="text-2xl font-semibold tabular-nums">
            .{dec}
          </Text>
        </View>

        {/* Gain row */}
        <View className="flex-row items-center gap-2.5">
          <Text style={{ color: gainColor }} className="text-sm font-semibold tabular-nums">
            {sign}EGP {fmtMoney(totalGainLoss)}
          </Text>
          <View
            className="flex-row items-center gap-1 px-2.5 py-1 rounded-xl"
            style={{ backgroundColor: gainBg }}
          >
            <Text style={{ color: gainColor }} className="text-xs font-black">
              {isUp ? '▲' : isDown ? '▼' : '●'}
            </Text>
            <Text style={{ color: gainColor }} className="text-sm font-bold tabular-nums">
              {Math.abs(totalGainLossPercent).toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>

      {/* ── Bottom stats ── */}
      <View className="flex-row" style={{ borderTopColor: colors.border2, borderTopWidth: 1 }}>
        <View className="flex-1 px-4 py-3 items-center" style={{ borderRightColor: colors.border2, borderRightWidth: 1 }}>
          <Text style={{ color: colors.textMuted }} className="text-[10px] uppercase tracking-wider mb-1">
            قيمة الشراء
          </Text>
          <Text style={{ color: colors.text }} className="text-sm font-semibold tabular-nums">
            {totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })} EGP
          </Text>
        </View>
        <View className="flex-1 px-4 py-3 items-center">
          <Text style={{ color: colors.textMuted }} className="text-[10px] uppercase tracking-wider mb-1">
            الربح / الخسارة
          </Text>
          <Text style={{ color: gainColor }} className="text-sm font-semibold tabular-nums">
            {sign}{fmtMoney(totalGainLoss)} EGP
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/* ─── Section header ─── */
function SectionHeader({
  title, icon: Icon, linkLabel, onLink,
}: {
  title: string;
  icon?: React.ComponentType<{ size: number; color: string }>;
  linkLabel?: string;
  onLink?: () => void;
}) {
  const { colors } = useTheme();
  const ChevronIcon = I18nManager.isRTL ? ChevronRight : ChevronLeft;
  return (
    <View className="flex-row items-center justify-between mb-3">
      <View className="flex-row items-center gap-1.5">
        {Icon && <Icon size={13} color={colors.textMuted} />}
        <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider">
          {title}
        </Text>
      </View>
      {linkLabel && onLink && (
        <Pressable onPress={onLink} className="flex-row items-center gap-0.5">
          <Text className="text-xs text-brand">{linkLabel}</Text>
          <ChevronIcon size={11} color="#8b5cf6" />
        </Pressable>
      )}
    </View>
  );
}

/* ─── Portfolio Chart ─── */
const CHART_RANGES = [
  { id: '1w' as const,  label: '١ أ' },
  { id: '1mo' as const, label: '١ ش' },
  { id: '3mo' as const, label: '٣ ش' },
];
type ChartRange = '1w' | '1mo' | '3mo';
const CHART_H = 140;

function buildPortfolioPath(
  data: { value: number }[],
  width: number,
  height: number,
): { linePath: string; areaPath: string } {
  if (data.length < 2) return { linePath: '', areaPath: '' };
  const pad = { top: 12, bottom: 8 };
  const vals = data.map((d) => d.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const vRange = maxV - minV || 1;
  const toX = (i: number) => (i / (data.length - 1)) * width;
  const toY = (v: number) => pad.top + ((maxV - v) / vRange) * (height - pad.top - pad.bottom);
  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.value) }));
  const linePath = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    const prev = pts[i - 1];
    const cx = ((prev.x + p.x) / 2).toFixed(2);
    return `${acc} C ${cx} ${prev.y.toFixed(2)} ${cx} ${p.y.toFixed(2)} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }, '');
  const last = pts[pts.length - 1];
  const first = pts[0];
  const areaPath = `${linePath} L ${last.x.toFixed(2)} ${height} L ${first.x.toFixed(2)} ${height} Z`;
  return { linePath, areaPath };
}

function PortfolioChart({
  holdings,
}: {
  holdings: Array<{ ticker: string; shares: number; avgPrice: number }>;
}) {
  const { colors } = useTheme();
  const [range, setRange] = useState<ChartRange>('1mo');
  const [data, setData] = useState<{ value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartWidth, setChartWidth] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    if (holdings.length === 0) { setData([]); setLoading(false); return; }
    const ctrl = new AbortController();
    setLoading(true);

    Promise.all(
      holdings.map((h) =>
        apiClient
          .get(`/api/stocks/${h.ticker}/history?range=${range}`, { signal: ctrl.signal })
          .then((res) => {
            const raw = (res.data as { data?: Array<{ date: string; price: number }> })?.data ?? res.data;
            return { ticker: h.ticker, shares: h.shares, history: Array.isArray(raw) ? raw as Array<{ date: string; price: number }> : [] };
          })
          .catch(() => ({ ticker: h.ticker, shares: h.shares, history: [] as Array<{ date: string; price: number }> })),
      ),
    ).then((results) => {
      if (ctrl.signal.aborted || !mountedRef.current) return;
      const dateMap = new Map<string, Record<string, number>>();
      for (const { ticker, history } of results) {
        for (const pt of history) {
          if (!dateMap.has(pt.date)) dateMap.set(pt.date, {});
          dateMap.get(pt.date)![ticker] = pt.price;
        }
      }
      const portfolioData = Array.from(dateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, prices]) => ({
          value: holdings.reduce((sum, h) => {
            const p = prices[h.ticker];
            return p ? sum + h.shares * p : sum;
          }, 0),
        }))
        .filter((d) => d.value > 0);
      setData(portfolioData);
    }).catch(() => {
      if (mountedRef.current) setData([]);
    }).finally(() => {
      if (!ctrl.signal.aborted && mountedRef.current) setLoading(false);
    });

    return () => ctrl.abort();
  }, [holdings, range]);

  const firstVal = data[0]?.value ?? 0;
  const lastVal = data[data.length - 1]?.value ?? 0;
  const gain = firstVal > 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;
  const isUp = gain >= 0;
  const lineColor = isUp ? '#4ade80' : '#f87171';
  const { linePath, areaPath } =
    chartWidth > 0 && data.length >= 2
      ? buildPortfolioPath(data, chartWidth, CHART_H)
      : { linePath: '', areaPath: '' };

  return (
    <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl overflow-hidden">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-3.5 pb-2">
        <View className="flex-row items-center gap-1.5">
          <TrendingUp size={12} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider">
            أداء المحفظة
          </Text>
        </View>
        {data.length > 1 && (
          <View
            className="flex-row items-center px-2 py-0.5 rounded-lg"
            style={{ backgroundColor: isUp ? '#4ade8018' : '#f8717118' }}
          >
            <Text className="text-xs font-bold tabular-nums" style={{ color: lineColor }}>
              {isUp ? '+' : ''}{gain.toFixed(2)}%
            </Text>
          </View>
        )}
      </View>

      {/* Range tabs */}
      <View className="flex-row gap-1.5 px-4 pb-2">
        {CHART_RANGES.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => setRange(r.id)}
            className="px-3 py-1 rounded-lg"
            style={{ backgroundColor: range === r.id ? '#8b5cf6' : colors.border2 }}
          >
            <Text className="text-xs font-semibold" style={{ color: range === r.id ? '#fff' : colors.textMuted }}>
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Chart area */}
      {loading ? (
        <View style={{ height: CHART_H }} className="items-center justify-center">
          <ActivityIndicator color="#8b5cf6" size="small" />
        </View>
      ) : data.length < 2 ? (
        <View style={{ height: CHART_H }} className="items-center justify-center">
          <Text style={{ color: colors.textMuted }} className="text-sm">لا توجد بيانات كافية</Text>
        </View>
      ) : (
        <View
          style={{ height: CHART_H }}
          onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
        >
          {chartWidth > 0 && (
            <Svg width={chartWidth} height={CHART_H}>
              <Defs>
                <LinearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={lineColor} stopOpacity="0.2" />
                  <Stop offset="1" stopColor={lineColor} stopOpacity="0" />
                </LinearGradient>
              </Defs>
              {areaPath ? <Path d={areaPath} fill="url(#portGrad)" /> : null}
              {linePath ? <Path d={linePath} stroke={lineColor} strokeWidth={1.8} fill="none" /> : null}
            </Svg>
          )}
        </View>
      )}
    </View>
  );
}

/* ══════════════════════════════════════════════════════ */
export default function HomePage() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);

  const unreadCount = useUnreadCount();
  const { stocks, loadingStocks, refreshing: mktRefreshing, refresh: refreshMarket } = useMarketData();
  const { holdings, summary, loading: portfolioLoading, refreshing: portRefreshing, refresh: refreshPortfolio } = usePortfolioData();
  const { items: watchlist, loading: watchlistLoading, refetch: refetchWatchlist } = useWatchlist();

  const holdingTickers = useMemo(() => holdings.map((h) => h.ticker), [holdings]);
  const watchlistTickers = useMemo(() => watchlist.map((s) => s.ticker), [watchlist]);
  const allTickers = useMemo(() => [...new Set([...holdingTickers, ...watchlistTickers])], [holdingTickers, watchlistTickers]);
  const { prices } = useLivePrices(allTickers);

  const refreshing = mktRefreshing || portRefreshing;

  const handleRefresh = useCallback(async () => {
    await Promise.all([refreshMarket(), refreshPortfolio(), refetchWatchlist()]);
  }, [refreshMarket, refreshPortfolio, refetchWatchlist]);

  /* Top movers */
  const topGainers = useMemo(
    () => [...stocks].filter((s) => s.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent).slice(0, 5),
    [stocks],
  );
  const topLosers = useMemo(
    () => [...stocks].filter((s) => s.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 5),
    [stocks],
  );

  /* Holdings enriched with live prices */
  const enrichedHoldings = useMemo(() =>
    holdings.map((h) => {
      const live = prices[h.ticker];
      const price = live?.price ?? h.currentPrice ?? h.avgPrice;
      const sessionChange = live?.changePercent ?? 0;
      const sessionChangeAmt = live?.change ?? 0;
      const currentValue = price * h.shares;
      const totalGain = (price - h.avgPrice) * h.shares;
      const totalGainPct = h.avgPrice > 0 ? ((price - h.avgPrice) / h.avgPrice) * 100 : 0;
      return { ...h, price, sessionChange, sessionChangeAmt, currentValue, totalGain, totalGainPct };
    }),
    [holdings, prices],
  );

  /* Portfolio performance best/worst by session */
  const bestToday = useMemo(
    () => [...enrichedHoldings].sort((a, b) => b.sessionChange - a.sessionChange)[0] ?? null,
    [enrichedHoldings],
  );
  const worstToday = useMemo(
    () => [...enrichedHoldings].sort((a, b) => a.sessionChange - b.sessionChange)[0] ?? null,
    [enrichedHoldings],
  );

  /* Live-adjusted portfolio totals */
  const liveSummary = useMemo(() => {
    if (enrichedHoldings.length === 0) return summary;
    const totalValue = enrichedHoldings.reduce((s, h) => s + h.currentValue, 0);
    const totalCost = enrichedHoldings.reduce((s, h) => s + h.avgPrice * h.shares, 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    return { totalValue, totalCost, totalGainLoss, totalGainLossPercent };
  }, [enrichedHoldings, summary]);

  const ChevronIcon = I18nManager.isRTL ? ChevronRight : ChevronLeft;

  return (
    <ScreenWrapper padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 36 }}
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
              {user?.fullName?.split(' ')[0] || 'مستثمر'}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <MarketStatusBadge />
            <Pressable
              onPress={() => router.navigate('/notifications')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ backgroundColor: colors.hover, borderColor: colors.border }}
              className="w-9 h-9 rounded-xl border items-center justify-center"
            >
              <Bell size={16} color={colors.textSub} />
              {unreadCount > 0 && (
                <View
                  className="absolute top-0 right-0 w-4 h-4 rounded-full bg-brand items-center justify-center"
                  style={{ transform: [{ translateX: 4 }, { translateY: -4 }] }}
                >
                  <Text className="text-[9px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View className="pt-4 gap-4">
          {/* ─── 1. Portfolio Summary ─── */}
          <PortfolioSummaryCard
            totalValue={liveSummary.totalValue}
            totalCost={liveSummary.totalCost}
            totalGainLoss={liveSummary.totalGainLoss}
            totalGainLossPercent={liveSummary.totalGainLossPercent}
            loading={portfolioLoading}
            onPress={() => router.push('/portfolio')}
          />

          {/* ─── 2. Owned Stocks ─── */}
          <View className="px-4">
            <SectionHeader
              title="الأسهم المملوكة"
              icon={Briefcase}
              linkLabel={holdings.length > 3 ? `الكل (${holdings.length})` : undefined}
              onLink={() => router.push('/portfolio')}
            />
            <View
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
              className="border rounded-2xl overflow-hidden"
            >
              {portfolioLoading ? (
                <View className="gap-1 p-4">
                  {[1, 2, 3].map((i) => <Skeleton key={i} height={56} />)}
                </View>
              ) : enrichedHoldings.length === 0 ? (
                <Pressable onPress={() => router.push('/market')} className="py-10 items-center gap-2">
                  <Text style={{ color: colors.textMuted }} className="text-sm">محفظتك فارغة</Text>
                  <Text className="text-xs text-brand">ابدأ بإضافة أسهم من السوق</Text>
                </Pressable>
              ) : (
                enrichedHoldings.slice(0, 4).map((h, i) => (
                  <Pressable
                    key={h.id}
                    onPress={() => router.push(`/stocks/${h.ticker}`)}
                    style={({ pressed }) => [
                      { borderBottomColor: colors.border2, backgroundColor: pressed ? colors.hover : 'transparent' },
                      i < Math.min(enrichedHoldings.length, 4) - 1 && { borderBottomWidth: 1 },
                    ]}
                    className="flex-row items-center px-4 py-3.5"
                  >
                    {/* Left: ticker + name */}
                    <View className="flex-1">
                      <Text style={{ color: colors.text }} className="text-sm font-bold">{h.ticker}</Text>
                      <Text style={{ color: colors.textSub }} className="text-xs mt-0.5" numberOfLines={1}>
                        {getStockName(h.ticker, 'ar')} · {h.shares} سهم
                      </Text>
                    </View>
                    {/* Center: current value */}
                    <View className="items-end mx-3">
                      <Text style={{ color: colors.text }} className="text-sm font-semibold tabular-nums">
                        {fmtNum(h.currentValue)} EGP
                      </Text>
                      <Text style={{ color: colors.textMuted }} className="text-xs tabular-nums">
                        {h.price.toFixed(2)} EGP
                      </Text>
                    </View>
                    {/* Right: session change */}
                    <View
                      className="px-2 py-1 rounded-lg items-center"
                      style={{
                        backgroundColor: h.sessionChange > 0 ? '#4ade8018' : h.sessionChange < 0 ? '#f8717118' : `${colors.textMuted}18`,
                        minWidth: 58,
                      }}
                    >
                      <Text
                        className="text-xs font-bold tabular-nums"
                        style={{ color: h.sessionChange > 0 ? '#4ade80' : h.sessionChange < 0 ? '#f87171' : colors.textMuted }}
                      >
                        {h.sessionChange > 0 ? '+' : ''}{h.sessionChange.toFixed(2)}%
                      </Text>
                      <Text style={{ color: colors.textMuted }} className="text-[10px]">اليوم</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </View>

          {/* ─── 3. Portfolio Chart ─── */}
          {!portfolioLoading && enrichedHoldings.length > 0 && (
            <View className="px-4">
              <PortfolioChart holdings={enrichedHoldings} />
            </View>
          )}

          {/* ─── 4. Top Movers ─── */}
          {!loadingStocks && (topGainers.length > 0 || topLosers.length > 0) && (
            <View className="px-4">
              <SectionHeader
                title="الأكثر تحركاً"
                icon={BarChart2}
                linkLabel="السوق"
                onLink={() => router.push('/market')}
              />
              <View className="flex-row gap-2.5">
                {/* Gainers */}
                {topGainers.length > 0 && (
                  <View
                    style={{ backgroundColor: colors.card, borderColor: '#4ade8020' }}
                    className="flex-1 border rounded-2xl overflow-hidden"
                  >
                    <View className="flex-row items-center gap-1.5 px-3 py-2 bg-emerald-500/5 border-b border-emerald-500/15">
                      <TrendingUp size={11} color="#4ade80" />
                      <Text className="text-xs font-semibold text-emerald-400">صاعدة</Text>
                    </View>
                    {topGainers.map((s, i) => (
                      <Pressable
                        key={s.ticker}
                        onPress={() => router.push(`/stocks/${s.ticker}`)}
                        style={({ pressed }) => [
                          { borderBottomColor: colors.border2, backgroundColor: pressed ? colors.hover : 'transparent' },
                          i < topGainers.length - 1 && { borderBottomWidth: 1 },
                        ]}
                        className="flex-row items-center justify-between px-3 py-2.5"
                      >
                        <View>
                          <Text style={{ color: colors.text }} className="text-xs font-bold">{s.ticker}</Text>
                          <Text style={{ color: colors.textMuted }} className="text-[10px]">
                            {s.price.toFixed(2)}
                          </Text>
                        </View>
                        <Text className="text-xs font-semibold text-emerald-400 tabular-nums">
                          +{s.changePercent.toFixed(2)}%
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {/* Losers */}
                {topLosers.length > 0 && (
                  <View
                    style={{ backgroundColor: colors.card, borderColor: '#f8717120' }}
                    className="flex-1 border rounded-2xl overflow-hidden"
                  >
                    <View className="flex-row items-center gap-1.5 px-3 py-2 bg-red-500/5 border-b border-red-500/15">
                      <TrendingDown size={11} color="#f87171" />
                      <Text className="text-xs font-semibold text-red-400">هابطة</Text>
                    </View>
                    {topLosers.map((s, i) => (
                      <Pressable
                        key={s.ticker}
                        onPress={() => router.push(`/stocks/${s.ticker}`)}
                        style={({ pressed }) => [
                          { borderBottomColor: colors.border2, backgroundColor: pressed ? colors.hover : 'transparent' },
                          i < topLosers.length - 1 && { borderBottomWidth: 1 },
                        ]}
                        className="flex-row items-center justify-between px-3 py-2.5"
                      >
                        <View>
                          <Text style={{ color: colors.text }} className="text-xs font-bold">{s.ticker}</Text>
                          <Text style={{ color: colors.textMuted }} className="text-[10px]">
                            {s.price.toFixed(2)}
                          </Text>
                        </View>
                        <Text className="text-xs font-semibold text-red-400 tabular-nums">
                          {s.changePercent.toFixed(2)}%
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ─── 5. Portfolio Performance ─── */}
          {!portfolioLoading && enrichedHoldings.length > 0 && (
            <View className="px-4">
              <SectionHeader title="أداء المحفظة" icon={TrendingUp} />
              <View
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                className="border rounded-2xl overflow-hidden"
              >
                {/* Stats row */}
                <View className="flex-row" style={{ borderBottomColor: colors.border2, borderBottomWidth: 1 }}>
                  <View className="flex-1 px-4 py-3 items-center" style={{ borderRightColor: colors.border2, borderRightWidth: 1 }}>
                    <Text style={{ color: colors.textMuted }} className="text-[10px] uppercase mb-1">الأسهم</Text>
                    <Text style={{ color: colors.text }} className="text-lg font-bold">{enrichedHoldings.length}</Text>
                  </View>
                  <View className="flex-1 px-4 py-3 items-center" style={{ borderRightColor: colors.border2, borderRightWidth: 1 }}>
                    <Text style={{ color: colors.textMuted }} className="text-[10px] uppercase mb-1">أفضل اليوم</Text>
                    {bestToday ? (
                      <>
                        <Text style={{ color: '#4ade80' }} className="text-sm font-bold">{bestToday.ticker}</Text>
                        <Text className="text-[10px] font-semibold text-emerald-400">
                          {bestToday.sessionChange > 0 ? '+' : ''}{bestToday.sessionChange.toFixed(2)}%
                        </Text>
                      </>
                    ) : <Text style={{ color: colors.textMuted }}>—</Text>}
                  </View>
                  <View className="flex-1 px-4 py-3 items-center">
                    <Text style={{ color: colors.textMuted }} className="text-[10px] uppercase mb-1">الأسوأ اليوم</Text>
                    {worstToday && worstToday.sessionChange < 0 ? (
                      <>
                        <Text style={{ color: '#f87171' }} className="text-sm font-bold">{worstToday.ticker}</Text>
                        <Text className="text-[10px] font-semibold text-red-400">
                          {worstToday.sessionChange.toFixed(2)}%
                        </Text>
                      </>
                    ) : <Text style={{ color: colors.textMuted }}>—</Text>}
                  </View>
                </View>

                {/* Holdings performance bars */}
                {enrichedHoldings.map((h, i) => {
                  const weight = liveSummary.totalValue > 0 ? (h.currentValue / liveSummary.totalValue) * 100 : 0;
                  const barColor = h.totalGainPct > 0 ? '#4ade80' : h.totalGainPct < 0 ? '#f87171' : colors.textMuted;
                  return (
                    <Pressable
                      key={h.id}
                      onPress={() => router.push(`/stocks/${h.ticker}`)}
                      style={({ pressed }) => [
                        { backgroundColor: pressed ? colors.hover : 'transparent', borderBottomColor: colors.border2 },
                        i < enrichedHoldings.length - 1 && { borderBottomWidth: 1 },
                      ]}
                      className="px-4 py-3"
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center gap-2">
                          <Text style={{ color: colors.text }} className="text-sm font-bold">{h.ticker}</Text>
                          <Text style={{ color: colors.textMuted }} className="text-xs">{weight.toFixed(1)}%</Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-xs font-bold tabular-nums" style={{ color: barColor }}>
                            {h.totalGainPct >= 0 ? '+' : ''}{h.totalGainPct.toFixed(2)}%
                          </Text>
                          <Text style={{ color: colors.textMuted }} className="text-[10px] tabular-nums">
                            {h.totalGain >= 0 ? '+' : ''}{fmtNum(h.totalGain)} EGP
                          </Text>
                        </View>
                      </View>
                      {/* Weight bar */}
                      <View style={{ backgroundColor: colors.border2 }} className="h-1 rounded-full overflow-hidden">
                        <View
                          className="h-full rounded-full"
                          style={{ width: `${weight}%`, backgroundColor: barColor }}
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* ─── 6. Watchlist ─── */}
          <View className="px-4">
            <SectionHeader
              title="قائمة المتابعة"
              icon={Star}
              linkLabel="إضافة"
              onLink={() => router.push('/market')}
            />
            <View
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
              className="border rounded-2xl overflow-hidden"
            >
              {watchlistLoading ? (
                <View className="gap-3 p-4">
                  {[1, 2, 3].map((i) => <Skeleton key={i} height={44} />)}
                </View>
              ) : watchlist.length === 0 ? (
                <Pressable onPress={() => router.push('/market')} className="py-9 items-center gap-2">
                  <Text style={{ color: colors.textMuted }} className="text-sm">قائمة المتابعة فارغة</Text>
                  <Text className="text-xs text-brand">أضف أسهم من السوق</Text>
                </Pressable>
              ) : (
                watchlist.map((stock, i) => (
                  <View
                    key={stock.ticker}
                    style={[
                      { paddingHorizontal: 16 },
                      i < watchlist.length - 1 && { borderBottomColor: colors.border2, borderBottomWidth: 1 },
                    ]}
                  >
                    <WatchlistRow stock={stock} livePrice={prices[stock.ticker]} />
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
