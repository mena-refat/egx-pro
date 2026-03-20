import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl,
  I18nManager, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft, ChevronRight, Star, StarOff, TrendingUp, TrendingDown,
  Brain, BarChart2, Briefcase, ExternalLink, Info,
} from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useLivePrices } from '../../hooks/useLivePrices';
import { usePortfolioData } from '../../hooks/useMarketData';
import { getStockName, getStockInfo } from '../../lib/egxStocks';
import apiClient from '../../lib/api/client';
import {
  BRAND, BRAND_BG_STRONG, BRAND_LIGHT,
  FONT, WEIGHT, RADIUS, SPACE,
  GREEN, RED,
} from '../../lib/theme';
import type { Stock } from '../../types/stock';

// ─── helpers ────────────────────────────────────────────────────────────────

function n(v: number, d = 2) {
  return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

// ─── StatRow ────────────────────────────────────────────────────────────────

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: SPACE.sm + 2,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    }}>
      <Text style={{ color: colors.textSub, fontSize: FONT.sm }}>{label}</Text>
      <Text style={{ color: valueColor ?? colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.semibold, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

// ─── ChartPlaceholder ───────────────────────────────────────────────────────

function ChartPlaceholder({ changePercent }: { changePercent: number }) {
  const { colors } = useTheme();
  const isUp = changePercent >= 0;
  const lineColor = isUp ? GREEN : RED;
  // Draw a simple SVG-like path using Views
  const pts = [0.5, 0.4, 0.55, 0.35, 0.45, 0.3, 0.38, 0.25, 0.42, 0.2];
  return (
    <View style={{
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      borderRadius: RADIUS.xl, padding: SPACE.lg, marginBottom: SPACE.md,
    }}>
      <Text style={{ color: colors.textMuted, fontSize: FONT.xs, textAlign: 'center', marginBottom: SPACE.md }}>
        الرسم البياني — قريباً
      </Text>
      <View style={{ height: 80, flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
        {pts.map((h, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: `${(1 - h) * 100}%`,
              backgroundColor: lineColor + '40',
              borderTopLeftRadius: 3,
              borderTopRightRadius: 3,
              borderTopWidth: 2,
              borderTopColor: lineColor,
            }}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function StockDetailPage() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const router     = useRouter();
  const insets     = useSafeAreaInsets();
  const { colors } = useTheme();
  const user       = useAuthStore((s) => s.user);

  const BackIcon = I18nManager.isRTL ? ChevronRight : ChevronLeft;

  // ─── stock data ─────────────────────────────────────────────
  const [stock,       setStock]       = useState<Stock | null>(null);
  const [loadingStock, setLoadingStock] = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  // ─── watchlist ───────────────────────────────────────────────
  const [inWatchlist,    setInWatchlist]    = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // ─── news ────────────────────────────────────────────────────
  const [news, setNews] = useState<{ id: string; title: string; publishedAt: string; source: string; url: string }[]>([]);

  // ─── live price ─────────────────────────────────────────────
  const { prices } = useLivePrices(ticker ? [ticker] : []);
  const livePrice  = ticker ? prices[ticker] : undefined;

  // ─── portfolio ───────────────────────────────────────────────
  const { holdings } = usePortfolioData();
  const myHolding    = useMemo(
    () => holdings.filter((h) => h.ticker === ticker),
    [holdings, ticker],
  );
  const totalShares    = myHolding.reduce((s, h) => s + h.shares, 0);
  const avgPrice       = myHolding.length > 0
    ? myHolding.reduce((s, h) => s + h.avgPrice * h.shares, 0) / totalShares
    : 0;

  // ─── enriched values ─────────────────────────────────────────
  const price         = livePrice?.price         ?? stock?.price         ?? 0;
  const changePercent = livePrice?.changePercent  ?? stock?.changePercent ?? 0;
  const change        = livePrice?.change         ?? stock?.change        ?? 0;
  const isUp          = changePercent >= 0;
  const gainColor     = changePercent === 0 ? colors.textSub : isUp ? GREEN : RED;

  const positionValue   = price * totalShares;
  const positionGain    = (price - avgPrice) * totalShares;
  const positionGainPct = avgPrice > 0 ? ((price - avgPrice) / avgPrice) * 100 : 0;

  // ─── stock info (static EGX data) ───────────────────────────
  const info = ticker ? getStockInfo(ticker) : null;

  // ─── fetch ───────────────────────────────────────────────────
  const loadStock = useCallback(async () => {
    if (!ticker) return;
    try {
      const res = await apiClient.get<Stock[]>('/api/stocks/prices');
      const list = Array.isArray(res.data) ? res.data : [];
      const found = list.find((s) => s.ticker === ticker) ?? null;
      setStock(found);
    } catch {
      setStock(null);
    } finally {
      setLoadingStock(false);
    }
  }, [ticker]);

  const loadWatchlistStatus = useCallback(async () => {
    if (!ticker) return;
    try {
      const res = await apiClient.get<{ items?: { ticker: string }[] }>('/api/watchlist');
      const items = (res.data as { items?: { ticker: string }[] })?.items ?? (Array.isArray(res.data) ? res.data : []);
      setInWatchlist(items.some((i: { ticker: string }) => i.ticker === ticker));
    } catch {
      setInWatchlist(false);
    }
  }, [ticker]);

  const loadNews = useCallback(async () => {
    if (!ticker) return;
    try {
      const res = await apiClient.get<unknown[]>(`/api/news/stock/${ticker}`);
      const arr = Array.isArray(res.data) ? res.data : [];
      setNews(arr.slice(0, 3) as typeof news);
    } catch {
      setNews([]);
    }
  }, [ticker]);

  const load = useCallback(async () => {
    await Promise.all([loadStock(), loadWatchlistStatus(), loadNews()]);
  }, [loadStock, loadWatchlistStatus, loadNews]);

  useEffect(() => { void load(); }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // ─── watchlist toggle ────────────────────────────────────────
  const toggleWatchlist = useCallback(async () => {
    if (!ticker || watchlistLoading) return;
    setWatchlistLoading(true);
    try {
      if (inWatchlist) {
        await apiClient.delete(`/api/watchlist/${ticker}`);
        setInWatchlist(false);
      } else {
        await apiClient.post('/api/watchlist', { ticker });
        setInWatchlist(true);
      }
    } catch {
      Alert.alert('خطأ', 'حدث خطأ، حاول مرة أخرى');
    } finally {
      setWatchlistLoading(false);
    }
  }, [ticker, inWatchlist, watchlistLoading]);

  // ─── loading state ───────────────────────────────────────────
  if (loadingStock) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={BRAND} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!stock && !livePrice) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACE.md }}>
          <Text style={{ color: colors.textMuted, fontSize: FONT.base }}>السهم غير موجود</Text>
          <Pressable onPress={() => router.back()} style={{ paddingVertical: SPACE.sm, paddingHorizontal: SPACE.lg }}>
            <Text style={{ color: BRAND, fontSize: FONT.sm, fontWeight: WEIGHT.semibold }}>رجوع</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const nameAr = getStockName(ticker ?? '', 'ar');
  const nameEn = getStockName(ticker ?? '', 'en');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>

      {/* ─── Sticky header ─────────────────────────────────── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
        >
          <BackIcon size={18} color={colors.text} />
        </Pressable>

        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: FONT.base, fontWeight: WEIGHT.bold }}>{ticker}</Text>
          <Text style={{ color: colors.textMuted, fontSize: FONT.xs }} numberOfLines={1}>{nameAr}</Text>
        </View>

        <Pressable
          onPress={toggleWatchlist}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md, backgroundColor: inWatchlist ? BRAND_BG_STRONG : colors.card, borderWidth: 1, borderColor: inWatchlist ? BRAND : colors.border }}
        >
          {inWatchlist
            ? <Star    size={18} color={BRAND} fill={BRAND} />
            : <StarOff size={18} color={colors.textSub} />
          }
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, SPACE['3xl']) + 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BRAND} colors={[BRAND]} />
        }
      >
        {/* ─── Price hero ──────────────────────────────────── */}
        <View style={{ paddingHorizontal: SPACE.lg, paddingTop: SPACE.xl, paddingBottom: SPACE.lg }}>
          <Text style={{ color: colors.textMuted, fontSize: FONT.xs, marginBottom: SPACE.xs }}>{nameEn}</Text>
          <Text style={{ color: colors.text, fontSize: FONT['4xl'], fontWeight: WEIGHT.extrabold, fontVariant: ['tabular-nums'] }}>
            {n(price)}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: FONT.xs, marginBottom: SPACE.sm }}>EGP</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: SPACE.xs,
              paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs,
              borderRadius: RADIUS.full, backgroundColor: isUp ? '#4ade8018' : '#f8717118',
            }}>
              {isUp
                ? <TrendingUp   size={14} color={gainColor} />
                : <TrendingDown size={14} color={gainColor} />
              }
              <Text style={{ color: gainColor, fontSize: FONT.sm, fontWeight: WEIGHT.bold, fontVariant: ['tabular-nums'] }}>
                {isUp ? '+' : ''}{n(change)} ({isUp ? '+' : ''}{changePercent.toFixed(2)}%)
              </Text>
            </View>
            {stock?.isDelayed && (
              <Text style={{ color: colors.textMuted, fontSize: FONT.xs }}>متأخر 15د</Text>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: SPACE.lg, gap: SPACE.md }}>

          {/* ─── Chart placeholder ──────────────────────── */}
          <ChartPlaceholder changePercent={changePercent} />

          {/* ─── My Position ────────────────────────────── */}
          {totalShares > 0 && (
            <View style={{
              backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
              borderRadius: RADIUS.xl, overflow: 'hidden',
            }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
                paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
                borderBottomWidth: 1, borderBottomColor: colors.border,
              }}>
                <View style={{ width: 28, height: 28, borderRadius: RADIUS.sm, backgroundColor: BRAND_BG_STRONG, alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={13} color={BRAND} />
                </View>
                <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>مركزي</Text>
              </View>

              <View style={{ flexDirection: 'row' }}>
                {[
                  { label: 'الأسهم',    value: String(totalShares) },
                  { label: 'متوسط الشراء', value: `${n(avgPrice)} EGP` },
                  { label: 'القيمة الحالية', value: `${n(positionValue)} EGP` },
                ].map((s, i, arr) => (
                  <View
                    key={s.label}
                    style={{
                      flex: 1, alignItems: 'center', paddingVertical: SPACE.md,
                      borderRightWidth: i < arr.length - 1 ? 1 : 0,
                      borderRightColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold, fontVariant: ['tabular-nums'] }}>
                      {s.value}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>{s.label}</Text>
                  </View>
                ))}
              </View>

              <View style={{
                borderTopWidth: 1, borderTopColor: colors.border,
                paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <Text style={{ color: colors.textSub, fontSize: FONT.sm }}>الربح / الخسارة</Text>
                <Text style={{
                  fontSize: FONT.sm, fontWeight: WEIGHT.bold, fontVariant: ['tabular-nums'],
                  color: positionGain >= 0 ? GREEN : RED,
                }}>
                  {positionGain >= 0 ? '+' : ''}{n(positionGain)} EGP ({positionGainPct.toFixed(2)}%)
                </Text>
              </View>
            </View>
          )}

          {/* ─── AI Analysis card ───────────────────────── */}
          {user && (
            <Pressable
              onPress={() => router.push({ pathname: '/ai/analyze', params: { ticker } } as never)}
              style={({ pressed }) => ({
                backgroundColor: BRAND_BG_STRONG, borderWidth: 1, borderColor: BRAND + '40',
                borderRadius: RADIUS.xl, padding: SPACE.lg, opacity: pressed ? 0.85 : 1,
                flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
              })}
            >
              <View style={{ width: 44, height: 44, borderRadius: RADIUS.lg, backgroundColor: BRAND + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Brain size={20} color={BRAND} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>
                  تحليل ذكاء اصطناعي
                </Text>
                <Text style={{ color: BRAND_LIGHT, fontSize: FONT.xs, marginTop: 2 }}>
                  احصل على تحليل شامل لـ {ticker}
                </Text>
              </View>
              <ChevronLeft size={16} color={BRAND} style={{ transform: [{ scaleX: I18nManager.isRTL ? 1 : -1 }] }} />
            </Pressable>
          )}

          {/* ─── Stats card ─────────────────────────────── */}
          <View style={{
            backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
            borderRadius: RADIUS.xl, overflow: 'hidden',
          }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
              paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
              borderBottomWidth: 1, borderBottomColor: colors.border,
            }}>
              <View style={{ width: 28, height: 28, borderRadius: RADIUS.sm, backgroundColor: '#3b82f618', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart2 size={13} color="#3b82f6" />
              </View>
              <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>بيانات السهم</Text>
            </View>
            <View style={{ paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm }}>
              {stock?.open        !== undefined && <StatRow label="الافتتاح"        value={`${n(stock.open)} EGP`} />}
              {stock?.previousClose !== undefined && <StatRow label="إغلاق أمس"      value={`${n(stock.previousClose)} EGP`} />}
              {stock?.high        !== undefined && <StatRow label="أعلى سعر"        value={`${n(stock.high)} EGP`} />}
              {stock?.low         !== undefined && <StatRow label="أدنى سعر"        value={`${n(stock.low)} EGP`} />}
              {stock?.volume      !== undefined && stock.volume > 0 && (
                <StatRow label="الحجم"          value={n(stock.volume, 0)} />
              )}
              {stock?.marketCap   !== undefined && stock.marketCap > 0 && (
                <StatRow
                  label="القيمة السوقية"
                  value={`${(stock.marketCap / 1_000_000_000).toFixed(2)} مليار EGP`}
                />
              )}
              {/* Remove last border */}
              <View style={{ height: SPACE.sm }} />
            </View>
          </View>

          {/* ─── Company info ───────────────────────────── */}
          {(info ?? stock?.description) && (
            <View style={{
              backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
              borderRadius: RADIUS.xl, overflow: 'hidden',
            }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
                paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
                borderBottomWidth: 1, borderBottomColor: colors.border,
              }}>
                <View style={{ width: 28, height: 28, borderRadius: RADIUS.sm, backgroundColor: '#f59e0b18', alignItems: 'center', justifyContent: 'center' }}>
                  <Info size={13} color="#f59e0b" />
                </View>
                <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>عن الشركة</Text>
              </View>
              <View style={{ paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, gap: SPACE.sm }}>
                {stock?.sector && (
                  <View style={{ flexDirection: 'row', gap: SPACE.sm, alignItems: 'center' }}>
                    <Text style={{ color: colors.textSub, fontSize: FONT.sm }}>القطاع:</Text>
                    <View style={{ backgroundColor: BRAND_BG_STRONG, paddingHorizontal: SPACE.sm, paddingVertical: 2, borderRadius: RADIUS.sm }}>
                      <Text style={{ color: BRAND, fontSize: FONT.xs, fontWeight: WEIGHT.semibold }}>{stock.sector}</Text>
                    </View>
                  </View>
                )}
                {(stock?.description) && (
                  <Text style={{ color: colors.textSub, fontSize: FONT.sm, lineHeight: 20 }}>
                    {stock.description}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* ─── Related news ───────────────────────────── */}
          {news.length > 0 && (
            <View style={{
              backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
              borderRadius: RADIUS.xl, overflow: 'hidden',
            }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
                borderBottomWidth: 1, borderBottomColor: colors.border,
              }}>
                <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>أخبار ذات صلة</Text>
              </View>
              {news.map((item, i) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? colors.hover : 'transparent',
                    paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
                    borderBottomWidth: i < news.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                    flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md,
                  })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: FONT.sm, lineHeight: 20 }} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: FONT.xs, marginTop: 4 }}>
                      {item.source} · {new Date(item.publishedAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <ExternalLink size={14} color={colors.textMuted} style={{ marginTop: 3 }} />
                </Pressable>
              ))}
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
