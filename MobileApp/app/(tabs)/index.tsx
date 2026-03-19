import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View, Text, ScrollView, RefreshControl, Pressable, ActivityIndicator, I18nManager,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell, TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  Briefcase, Star, BarChart2,
} from 'lucide-react-native';
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

/* ─── unread count ─── */
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

  useEffect(() => fetchCount(), [fetchCount]);
  useFocusEffect(useCallback(() => fetchCount(), [fetchCount]));
  return count;
}

/* ─── watchlist ─── */
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

  useEffect(() => { const c = new AbortController(); void load(c.signal); return () => c.abort(); }, [load]);
  const refetch = useCallback(() => { const c = new AbortController(); return load(c.signal); }, [load]);
  return { items, loading, refetch };
}

/* ─── formatters ─── */
function fmtNum(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function fmtMoney(n: number) {
  return Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ─── Portfolio Summary Card ─── */
function PortfolioSummaryCard({
  totalValue, totalCost, totalGainLoss, totalGainLossPercent, loading, onPress,
}: {
  totalValue: number; totalCost: number;
  totalGainLoss: number; totalGainLossPercent: number;
  loading: boolean; onPress: () => void;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const isUp = totalGainLoss > 0;
  const isDown = totalGainLoss < 0;
  const gainColor = isUp ? '#4ade80' : isDown ? '#f87171' : colors.textSub;
  const gainBg = isUp ? '#4ade8018' : isDown ? '#f8717118' : colors.hover;

  if (loading) {
    return (
      <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, marginHorizontal: 16, overflow: 'hidden' }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20, alignItems: 'center', gap: 12 }}>
          <Skeleton height={10} className="w-32" />
          <Skeleton height={52} className="w-56" />
          <Skeleton height={22} className="w-44" />
        </View>
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border }}>
          {[1, 2].map((i) => (
            <View key={i} style={{ flex: 1, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center', gap: 6 }}>
              <Skeleton height={10} className="w-20" />
              <Skeleton height={14} className="w-28" />
            </View>
          ))}
        </View>
      </View>
    );
  }

  const [whole, dec] = fmtMoney(totalValue).split('.');
  const sign = isUp ? '+' : isDown ? '-' : '';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.hover : colors.card,
        borderColor: colors.border, borderWidth: 1,
        borderRadius: 20, marginHorizontal: 16, overflow: 'hidden',
      })}
    >
      {/* Main value */}
      <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20, alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted, fontSize: 11, letterSpacing: 1.5, marginBottom: 14 }}>
          قيمة محفظتي
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4, marginBottom: 12 }}>
          <Text style={{ color: colors.textMuted, fontSize: isCompact ? 15 : 18, fontWeight: '500', marginBottom: 4 }}>EGP</Text>
          <Text style={{ color: colors.text, fontSize: isCompact ? 38 : 48, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] }}>
            {whole}
          </Text>
          <Text style={{ color: colors.text, fontSize: isCompact ? 19 : 24, fontWeight: '600', marginBottom: 6, fontVariant: ['tabular-nums'] }}>
            .{dec}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ color: gainColor, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
            {sign}EGP {fmtMoney(totalGainLoss)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: gainBg }}>
            <Text style={{ color: gainColor, fontSize: 12, fontWeight: '800' }}>
              {isUp ? '▲' : isDown ? '▼' : '●'}
            </Text>
            <Text style={{ color: gainColor, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {Math.abs(totalGainLossPercent).toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom stats */}
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border }}>
        <View style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.border }}>
          <Text style={{ color: colors.textMuted, fontSize: 10, letterSpacing: 0.5, marginBottom: 4 }}>قيمة الشراء</Text>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
            {totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })} EGP
          </Text>
        </View>
        <View style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: 10, letterSpacing: 0.5, marginBottom: 4 }}>الربح / الخسارة</Text>
          <Text style={{ color: gainColor, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
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
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        {Icon && (
          <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: colors.hover, alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={13} color={colors.textSub} />
          </View>
        )}
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{title}</Text>
      </View>
      {linkLabel && onLink && (
        <Pressable onPress={onLink} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Text style={{ color: '#8b5cf6', fontSize: 12, fontWeight: '600' }}>{linkLabel}</Text>
          <ChevronIcon size={12} color="#8b5cf6" />
        </Pressable>
      )}
    </View>
  );
}

/* ─── Portfolio Chart ─── */
const CHART_RANGES = [
  { id: '1w' as const, label: '1W' },
  { id: '1mo' as const, label: '1M' },
  { id: '3mo' as const, label: '3M' },
];
type ChartRange = '1w' | '1mo' | '3mo';
const CHART_H = 140;

function buildPortfolioPath(data: { value: number }[], width: number, height: number) {
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

function PortfolioChart({ holdings }: { holdings: Array<{ ticker: string; shares: number; avgPrice: number }> }) {
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
    }).catch(() => { if (mountedRef.current) setData([]); })
      .finally(() => { if (!ctrl.signal.aborted && mountedRef.current) setLoading(false); });
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
    <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, overflow: 'hidden' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: colors.hover, alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={13} color={colors.textSub} />
          </View>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>أداء المحفظة</Text>
        </View>
        {data.length > 1 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: isUp ? '#4ade8018' : '#f8717118' }}>
            <Text style={{ color: lineColor, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {isUp ? '+' : ''}{gain.toFixed(2)}%
            </Text>
          </View>
        )}
      </View>

      {/* Range pills */}
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 12 }}>
        {CHART_RANGES.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => setRange(r.id)}
            style={{
              paddingHorizontal: 14, paddingVertical: 5, borderRadius: 10,
              backgroundColor: range === r.id ? '#8b5cf6' : colors.hover,
              borderWidth: 1,
              borderColor: range === r.id ? '#8b5cf6' : colors.border,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: range === r.id ? '#fff' : colors.textSub }}>
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Chart */}
      {loading ? (
        <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#8b5cf6" size="small" />
        </View>
      ) : data.length < 2 ? (
        <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>لا توجد بيانات كافية</Text>
        </View>
      ) : (
        <View style={{ height: CHART_H }} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
          {chartWidth > 0 && (
            <Svg width={chartWidth} height={CHART_H}>
              <Defs>
                <LinearGradient id="portGradHome" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={lineColor} stopOpacity="0.22" />
                  <Stop offset="1" stopColor={lineColor} stopOpacity="0" />
                </LinearGradient>
              </Defs>
              {areaPath ? <Path d={areaPath} fill="url(#portGradHome)" /> : null}
              {linePath ? <Path d={linePath} stroke={lineColor} strokeWidth={2} fill="none" /> : null}
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
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
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

  const topGainers = useMemo(
    () => [...stocks].filter((s) => s.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent).slice(0, 5),
    [stocks],
  );
  const topLosers = useMemo(
    () => [...stocks].filter((s) => s.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 5),
    [stocks],
  );

  const enrichedHoldings = useMemo(() =>
    holdings.map((h) => {
      const live = prices[h.ticker];
      const price = live?.price ?? h.currentPrice ?? h.avgPrice;
      const sessionChange = live?.changePercent ?? 0;
      const currentValue = price * h.shares;
      const totalGain = (price - h.avgPrice) * h.shares;
      const totalGainPct = h.avgPrice > 0 ? ((price - h.avgPrice) / h.avgPrice) * 100 : 0;
      return { ...h, price, sessionChange, currentValue, totalGain, totalGainPct };
    }),
    [holdings, prices],
  );

  const bestToday = useMemo(
    () => [...enrichedHoldings].sort((a, b) => b.sessionChange - a.sessionChange)[0] ?? null,
    [enrichedHoldings],
  );
  const worstToday = useMemo(
    () => [...enrichedHoldings].sort((a, b) => a.sessionChange - b.sessionChange)[0] ?? null,
    [enrichedHoldings],
  );

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
    <ScreenWrapper padded={false} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#8b5cf6" colors={['#8b5cf6']} />
        }
      >
        {/* ─── Header ─── */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: isCompact ? 12 : 18, paddingBottom: isCompact ? 10 : 14 }}>
          <View>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>أهلاً بك،</Text>
            <Text style={{ color: colors.text, fontSize: isCompact ? 18 : 20, fontWeight: '800', marginTop: 2 }}>
              {user?.fullName?.split(' ')[0] || 'مستثمر'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <MarketStatusBadge />
            <Pressable
              onPress={() => router.navigate('/notifications')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ backgroundColor: colors.hover, borderColor: colors.border, borderWidth: 1, width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
            >
              <Bell size={16} color={colors.textSub} />
              {unreadCount > 0 && (
                <View
                  style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View style={{ paddingTop: 16, gap: 20 }}>

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
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader
              title="الأسهم المملوكة"
              icon={Briefcase}
              linkLabel={holdings.length > 3 ? `الكل (${holdings.length})` : undefined}
              onLink={() => router.push('/portfolio')}
            />
            <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, overflow: 'hidden' }}>
              {portfolioLoading ? (
                <View style={{ gap: 2, padding: 12 }}>
                  {[1, 2, 3].map((i) => <Skeleton key={i} height={62} className="rounded-xl" />)}
                </View>
              ) : enrichedHoldings.length === 0 ? (
                <Pressable onPress={() => router.push('/market')} style={{ paddingVertical: 36, alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>محفظتك فارغة</Text>
                  <Text style={{ color: '#8b5cf6', fontSize: 12, fontWeight: '600' }}>ابدأ بإضافة أسهم من السوق</Text>
                </Pressable>
              ) : (
                enrichedHoldings.slice(0, 4).map((h, i) => (
                  <Pressable
                    key={h.id}
                    onPress={() => router.push(`/stocks/${h.ticker}`)}
                    style={({ pressed }) => [
                      { borderBottomColor: colors.border, backgroundColor: pressed ? colors.hover : 'transparent', paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center' },
                      i < Math.min(enrichedHoldings.length, 4) - 1 && { borderBottomWidth: 1 },
                    ]}
                  >
                    {/* Ticker badge */}
                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#8b5cf618', borderWidth: 1, borderColor: '#8b5cf628', alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 }}>
                      <Text style={{ color: '#8b5cf6', fontSize: 8, fontWeight: '800' }} numberOfLines={1}>{h.ticker.slice(0, 4)}</Text>
                    </View>
                    {/* Info */}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{h.ticker}</Text>
                      <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                        {getStockName(h.ticker, 'ar')} · {h.shares} سهم
                      </Text>
                    </View>
                    {/* Value */}
                    <View style={{ alignItems: I18nManager.isRTL ? 'flex-start' : 'flex-end', marginLeft: 10, flexShrink: 0 }}>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                        {fmtNum(h.currentValue)} EGP
                      </Text>
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', marginTop: 3,
                        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 7,
                        backgroundColor: h.sessionChange > 0 ? '#4ade8018' : h.sessionChange < 0 ? '#f8717118' : colors.hover,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'], color: h.sessionChange > 0 ? '#4ade80' : h.sessionChange < 0 ? '#f87171' : colors.textMuted }}>
                          {h.sessionChange > 0 ? '+' : ''}{h.sessionChange.toFixed(2)}%
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </View>

          {/* ─── 3. Portfolio Chart ─── */}
          {!portfolioLoading && enrichedHoldings.length > 0 && (
            <View style={{ paddingHorizontal: 16 }}>
              <PortfolioChart holdings={enrichedHoldings} />
            </View>
          )}

          {/* ─── 4. Top Movers ─── */}
          {!loadingStocks && (topGainers.length > 0 || topLosers.length > 0) && (
            <View style={{ paddingHorizontal: 16 }}>
              <SectionHeader title="الأكثر تحركاً" icon={BarChart2} linkLabel="السوق" onLink={() => router.push('/market')} />
              <View style={{ flexDirection: isCompact ? 'column' : 'row', gap: 12 }}>
                {/* Gainers */}
                {topGainers.length > 0 && (
                  <View style={{ flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: '#4ade8025', borderRadius: 20, overflow: 'hidden' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#4ade8008', borderBottomWidth: 1, borderBottomColor: '#4ade8018' }}>
                      <TrendingUp size={12} color="#4ade80" />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#4ade80' }}>صاعدة</Text>
                    </View>
                    {topGainers.map((s, i) => (
                      <Pressable
                        key={s.ticker}
                        onPress={() => router.push(`/stocks/${s.ticker}`)}
                        style={({ pressed }) => [
                          { backgroundColor: pressed ? colors.hover : 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
                          i < topGainers.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                        ]}
                      >
                        <View>
                          <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{s.ticker}</Text>
                          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 1 }}>{s.price.toFixed(2)}</Text>
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#4ade80', fontVariant: ['tabular-nums'] }}>
                          +{s.changePercent.toFixed(2)}%
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {/* Losers */}
                {topLosers.length > 0 && (
                  <View style={{ flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: '#f8717125', borderRadius: 20, overflow: 'hidden' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f8717108', borderBottomWidth: 1, borderBottomColor: '#f8717118' }}>
                      <TrendingDown size={12} color="#f87171" />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#f87171' }}>هابطة</Text>
                    </View>
                    {topLosers.map((s, i) => (
                      <Pressable
                        key={s.ticker}
                        onPress={() => router.push(`/stocks/${s.ticker}`)}
                        style={({ pressed }) => [
                          { backgroundColor: pressed ? colors.hover : 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
                          i < topLosers.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                        ]}
                      >
                        <View>
                          <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{s.ticker}</Text>
                          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 1 }}>{s.price.toFixed(2)}</Text>
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#f87171', fontVariant: ['tabular-nums'] }}>
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
            <View style={{ paddingHorizontal: 16 }}>
              <SectionHeader title="أداء المحفظة" icon={TrendingUp} />
              <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, overflow: 'hidden' }}>
                {/* Stats row */}
                <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <View style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.border }}>
                    <Text style={{ color: colors.textMuted, fontSize: 10, marginBottom: 4 }}>الأسهم</Text>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{enrichedHoldings.length}</Text>
                  </View>
                  <View style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.border }}>
                    <Text style={{ color: colors.textMuted, fontSize: 10, marginBottom: 4 }}>أفضل اليوم</Text>
                    {bestToday ? (
                      <>
                        <Text style={{ color: '#4ade80', fontSize: 13, fontWeight: '700' }}>{bestToday.ticker}</Text>
                        <Text style={{ color: '#4ade80', fontSize: 11, fontWeight: '600', marginTop: 1 }}>
                          {bestToday.sessionChange > 0 ? '+' : ''}{bestToday.sessionChange.toFixed(2)}%
                        </Text>
                      </>
                    ) : <Text style={{ color: colors.textMuted, fontSize: 16 }}>—</Text>}
                  </View>
                  <View style={{ flex: 1, paddingVertical: 14, alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted, fontSize: 10, marginBottom: 4 }}>الأسوأ اليوم</Text>
                    {worstToday && worstToday.sessionChange < 0 ? (
                      <>
                        <Text style={{ color: '#f87171', fontSize: 13, fontWeight: '700' }}>{worstToday.ticker}</Text>
                        <Text style={{ color: '#f87171', fontSize: 11, fontWeight: '600', marginTop: 1 }}>
                          {worstToday.sessionChange.toFixed(2)}%
                        </Text>
                      </>
                    ) : <Text style={{ color: colors.textMuted, fontSize: 16 }}>—</Text>}
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
                        { backgroundColor: pressed ? colors.hover : 'transparent', paddingHorizontal: 16, paddingVertical: 12 },
                        i < enrichedHoldings.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{h.ticker}</Text>
                          <Text style={{ color: colors.textMuted, fontSize: 11 }}>{weight.toFixed(1)}%</Text>
                        </View>
                        <View style={{ alignItems: I18nManager.isRTL ? 'flex-start' : 'flex-end' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'], color: barColor }}>
                            {h.totalGainPct >= 0 ? '+' : ''}{h.totalGainPct.toFixed(2)}%
                          </Text>
                          <Text style={{ color: colors.textMuted, fontSize: 11, fontVariant: ['tabular-nums'], marginTop: 1 }}>
                            {h.totalGain >= 0 ? '+' : ''}{fmtNum(h.totalGain)} EGP
                          </Text>
                        </View>
                      </View>
                      {/* Weight bar */}
                      <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${weight}%`, backgroundColor: barColor, borderRadius: 99 }} />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* ─── 6. Watchlist ─── */}
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="قائمة المتابعة" icon={Star} linkLabel="إضافة" onLink={() => router.push('/market')} />
            <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, overflow: 'hidden' }}>
              {watchlistLoading ? (
                <View style={{ gap: 2, padding: 12 }}>
                  {[1, 2, 3].map((i) => <Skeleton key={i} height={54} className="rounded-xl" />)}
                </View>
              ) : watchlist.length === 0 ? (
                <Pressable onPress={() => router.push('/market')} style={{ paddingVertical: 36, alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>قائمة المتابعة فارغة</Text>
                  <Text style={{ color: '#8b5cf6', fontSize: 12, fontWeight: '600' }}>أضف أسهم من السوق</Text>
                </Pressable>
              ) : (
                watchlist.map((stock, i) => (
                  <View
                    key={stock.ticker}
                    style={[
                      i < watchlist.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
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
