import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  I18nManager, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft, ArrowRight, Eye, EyeOff, Brain,
  ExternalLink, ChevronLeft, ChevronRight, Newspaper, Building2,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { PriceTag } from '../../components/shared/PriceTag';
import { StockChart } from '../../components/features/stocks/StockChart';
import { Skeleton } from '../../components/ui/Skeleton';
import { useLivePrices } from '../../hooks/useLivePrices';
import { getStockName, getStockInfo } from '../../lib/egxStocks';
import { useTheme } from '../../hooks/useTheme';
import apiClient from '../../lib/api/client';
import type { Stock } from '../../types/stock';

type Tab = 'details' | 'news' | 'ai';

interface Financials {
  pe?: number | null;
  forwardPe?: number | null;
  eps?: number | null;
  roe?: number | null;
  dividendYield?: number | null;
  marketCap?: number | null;
  beta?: number | null;
  grossMargin?: number | null;
  profitMargin?: number | null;
  bookValue?: number | null;
  priceToBook?: number | null;
}

interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null || !Number.isFinite(n) || n === 0) return '—';
  return n.toFixed(decimals);
}

function formatBig(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} مليار EGP`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)} مليون EGP`;
  return n.toLocaleString('ar-EG') + ' EGP';
}

function formatVolume(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} م`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)} م`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} ألف`;
  return n.toLocaleString('ar-EG');
}

const SECTOR_LABELS: Record<string, string> = {
  INFORMATION_TECHNOLOGY: 'تكنولوجيا المعلومات',
  HEALTH_CARE: 'الرعاية الصحية',
  FINANCIALS: 'المالية',
  CONSUMER_DISCRETIONARY: 'الاستهلاك التقديري',
  CONSUMER_STAPLES: 'السلع الأساسية',
  ENERGY: 'الطاقة',
  INDUSTRIALS: 'الصناعة',
  MATERIALS: 'المواد الأولية',
  UTILITIES: 'المرافق',
  REAL_ESTATE: 'العقارات',
  COMMUNICATION_SERVICES: 'خدمات الاتصالات',
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'details', label: 'تفاصيل' },
  { id: 'news',    label: 'أخبار'  },
  { id: 'ai',      label: 'تحليل AI' },
];

export default function StockDetailPage() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { prices } = useLivePrices(ticker ? [ticker] : []);

  const [stock, setStock] = useState<Stock | null>(null);
  const [sectorStocks, setSectorStocks] = useState<Stock[]>([]);
  const [financials, setFinancials] = useState<Financials | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [tab, setTab] = useState<Tab>('details');
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [loadingFinancials, setLoadingFinancials] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [wlLoading, setWlLoading] = useState(false);

  const stockInfo = ticker ? getStockInfo(ticker) : null;
  const live = ticker ? prices[ticker] : null;

  useEffect(() => {
    if (!ticker) return;
    const ctrl = new AbortController();

    // Price + sector stocks
    apiClient
      .get('/api/stocks/prices', { signal: ctrl.signal })
      .then((res) => {
        const raw = (res.data as { data?: Stock[] })?.data ?? res.data;
        const list: Stock[] = Array.isArray(raw) ? raw : [];
        const found = list.find((s) => s.ticker.toUpperCase() === ticker.toUpperCase()) ?? null;
        setStock(found);
        if (found?.sector) {
          const same = list
            .filter((s) => s.sector === found.sector && s.ticker !== ticker && s.price > 0)
            .sort((a, b) => b.changePercent - a.changePercent)
            .slice(0, 6);
          setSectorStocks(same);
        }
      })
      .catch(() => null)
      .finally(() => setLoadingPrice(false));

    // Financials
    apiClient
      .get(`/api/stocks/${ticker}/financials`, { signal: ctrl.signal })
      .then((res) => {
        const d = (res.data as { data?: Financials })?.data ?? res.data;
        setFinancials(d as Financials);
      })
      .catch(() => null)
      .finally(() => setLoadingFinancials(false));

    // News
    apiClient
      .get(`/api/stocks/${ticker}/news`, { signal: ctrl.signal })
      .then((res) => {
        const d = (res.data as { data?: NewsItem[] })?.data ?? res.data;
        setNews(Array.isArray(d) ? d : []);
      })
      .catch(() => null)
      .finally(() => setLoadingNews(false));

    // Watchlist
    apiClient
      .get('/api/watchlist', { signal: ctrl.signal })
      .then((res) => {
        const items = (res.data as { items?: Stock[] })?.items ?? res.data;
        const arr: Stock[] = Array.isArray(items) ? items : [];
        setInWatchlist(arr.some((s) => s.ticker === ticker));
      })
      .catch(() => null);

    return () => ctrl.abort();
  }, [ticker]);

  const toggleWatchlist = async () => {
    if (!ticker || wlLoading) return;
    setWlLoading(true);
    const prev = inWatchlist;
    setInWatchlist(!prev);
    try {
      if (prev) await apiClient.delete(`/api/watchlist/${ticker}`);
      else await apiClient.post('/api/watchlist', { ticker });
    } catch {
      setInWatchlist(prev);
    } finally {
      setWlLoading(false);
    }
  };

  if (!ticker) return null;

  const currentPrice = live?.price ?? stock?.price ?? 0;
  const currentChange = live?.change ?? stock?.change ?? 0;
  const currentChangePct = live?.changePercent ?? stock?.changePercent ?? 0;
  const isDelayed = stock?.isDelayed;
  const ChevronIcon = I18nManager.isRTL ? ChevronRight : ChevronLeft;
  const ArrowIcon = I18nManager.isRTL ? ArrowRight : ArrowLeft;

  const todayStats = [
    { label: 'الافتتاح',        value: fmt(stock?.open) + ' EGP' },
    { label: 'الإغلاق السابق',  value: fmt(stock?.previousClose) + ' EGP' },
    { label: 'أعلى سعر',        value: fmt(stock?.high) + ' EGP' },
    { label: 'أقل سعر',         value: fmt(stock?.low) + ' EGP' },
    { label: 'حجم التداول',      value: formatVolume(stock?.volume) },
    {
      label: 'قيمة التداول',
      value: stock?.volume && currentPrice
        ? formatBig(stock.volume * currentPrice)
        : '—',
    },
  ];

  const finStats = financials ? [
    { label: 'مضاعف الأرباح P/E', value: financials.pe != null ? `${financials.pe.toFixed(1)}x` : '—' },
    { label: 'ربحية السهم EPS',   value: fmt(financials.eps) },
    { label: 'عائد التوزيعات',    value: financials.dividendYield != null ? `${(financials.dividendYield * 100).toFixed(2)}%` : '—' },
    { label: 'القيمة السوقية',    value: formatBig(financials.marketCap ?? stock?.marketCap) },
    { label: 'بيتا Beta',         value: fmt(financials.beta, 3) },
    { label: 'العائد على حق الملكية ROE', value: financials.roe != null ? `${(financials.roe * 100).toFixed(1)}%` : '—' },
    { label: 'هامش الربح الصافي', value: financials.profitMargin != null ? `${(financials.profitMargin * 100).toFixed(1)}%` : '—' },
    { label: 'السعر / القيمة الدفترية P/B', value: financials.priceToBook != null ? `${financials.priceToBook.toFixed(2)}x` : '—' },
  ].filter(s => s.value !== '—') : [];

  return (
    <ScreenWrapper padded={false}>
      {/* ─── Header ─── */}
      <View
        style={{ borderBottomColor: colors.border }}
        className="flex-row items-center justify-between px-4 pt-5 pb-3 border-b"
      >
        <Pressable
          onPress={() => router.back()}
          style={{ backgroundColor: colors.hover, borderColor: colors.border }}
          className="w-9 h-9 rounded-xl border items-center justify-center"
        >
          <ArrowIcon size={16} color={colors.textMuted} />
        </Pressable>

        <View className="flex-1 items-center mx-3">
          <Text style={{ color: colors.text }} className="text-base font-bold">{ticker}</Text>
          <Text style={{ color: colors.textSub }} className="text-xs" numberOfLines={1}>
            {stockInfo?.nameAr ?? getStockName(ticker, 'ar')}
          </Text>
        </View>

        <Pressable
          onPress={toggleWatchlist}
          disabled={wlLoading}
          style={{ backgroundColor: inWatchlist ? '#8b5cf615' : colors.hover, borderColor: inWatchlist ? '#8b5cf640' : colors.border }}
          className="w-9 h-9 rounded-xl border items-center justify-center"
        >
          {wlLoading ? (
            <ActivityIndicator size="small" color="#8b5cf6" />
          ) : inWatchlist ? (
            <Eye size={16} color="#8b5cf6" />
          ) : (
            <EyeOff size={16} color={colors.textMuted} />
          )}
        </Pressable>
      </View>

      {/* ─── Price block ─── */}
      <View
        style={{ borderBottomColor: colors.border }}
        className="px-4 pt-4 pb-3 border-b"
      >
        {loadingPrice ? (
          <View className="gap-2">
            <Skeleton height={44} className="w-44" />
            <Skeleton height={24} className="w-32" />
          </View>
        ) : (
          <View className="gap-1.5">
            <Text style={{ color: colors.text }} className="text-4xl font-bold tabular-nums">
              {currentPrice.toFixed(2)}{' '}
              <Text style={{ color: colors.textMuted }} className="text-xl">EGP</Text>
            </Text>
            <View className="flex-row items-center gap-2">
              <PriceTag change={currentChange} changePercent={currentChangePct} size="md" />
              {isDelayed && (
                <View className="bg-amber-500/15 px-2 py-0.5 rounded-md">
                  <Text className="text-[10px] font-semibold text-amber-400">متأخر 10 دقائق</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* ─── Tabs ─── */}
      <View
        style={{ borderBottomColor: colors.border, backgroundColor: colors.card }}
        className="flex-row border-b"
      >
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            className="flex-1 py-3 items-center"
            style={{
              borderBottomWidth: tab === t.id ? 2 : 0,
              borderBottomColor: '#8b5cf6',
            }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: tab === t.id ? '#8b5cf6' : colors.textMuted }}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ─── Tab content ─── */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════ DETAILS TAB ══════════ */}
        {tab === 'details' && (
          <>
            {/* Chart */}
            <StockChart ticker={ticker} />

            {/* Today stats grid */}
            <View>
              <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider mb-3">
                إحصائيات اليوم
              </Text>
              {loadingPrice ? (
                <View className="flex-row flex-wrap gap-2">
                  {[1,2,3,4,5,6].map(i => <Skeleton key={i} height={56} style={{ flex: 1, minWidth: '45%' }} />)}
                </View>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {todayStats.map((s) => (
                    <View
                      key={s.label}
                      style={{ backgroundColor: colors.card, borderColor: colors.border, minWidth: '45%', flex: 1 }}
                      className="border rounded-xl p-3"
                    >
                      <Text style={{ color: colors.textMuted }} className="text-xs mb-1">{s.label}</Text>
                      <Text style={{ color: colors.text }} className="text-sm font-semibold tabular-nums">{s.value}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Extended financials */}
            {(loadingFinancials || finStats.length > 0) && (
              <View>
                <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider mb-3">
                  المؤشرات المالية
                </Text>
                <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl px-4 py-2">
                  {loadingFinancials ? (
                    <View className="gap-2 py-2">
                      {[1,2,3,4].map(i => <Skeleton key={i} height={18} />)}
                    </View>
                  ) : (
                    finStats.map((s, i) => (
                      <View
                        key={s.label}
                        style={[
                          { borderBottomColor: colors.border2 },
                          i < finStats.length - 1 && { borderBottomWidth: 1 },
                        ]}
                        className="flex-row justify-between items-center py-2.5"
                      >
                        <Text style={{ color: colors.textSub }} className="text-sm">{s.label}</Text>
                        <Text style={{ color: colors.text }} className="text-sm font-semibold tabular-nums">{s.value}</Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}

            {/* About company */}
            <View>
              <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider mb-3">
                عن الشركة
              </Text>
              <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl p-4 gap-2">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-lg bg-brand/15 items-center justify-center">
                    <Building2 size={14} color="#8b5cf6" />
                  </View>
                  <View>
                    <Text style={{ color: colors.text }} className="text-sm font-bold">
                      {stockInfo?.nameAr ?? getStockName(ticker, 'ar')}
                    </Text>
                    <Text style={{ color: colors.textMuted }} className="text-xs">
                      {stockInfo?.nameEn ?? getStockName(ticker, 'en')}
                    </Text>
                  </View>
                </View>
                {stock?.sector && (
                  <View className="flex-row items-center gap-1.5 mt-1">
                    <View className="bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-md">
                      <Text className="text-xs text-brand font-medium">
                        {SECTOR_LABELS[stock.sector] ?? stock.sector}
                      </Text>
                    </View>
                  </View>
                )}
                {stock?.description ? (
                  <Text style={{ color: colors.textSub }} className="text-xs leading-5 mt-1">
                    {stock.description}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Same sector stocks */}
            {sectorStocks.length > 0 && (
              <View>
                <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider mb-3">
                  أسهم من نفس القطاع
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
                  {sectorStocks.map((s) => (
                    <Pressable
                      key={s.ticker}
                      onPress={() => router.push(`/stocks/${s.ticker}`)}
                      style={{ backgroundColor: colors.card, borderColor: colors.border }}
                      className="border rounded-xl p-3 mx-1 w-32"
                    >
                      <Text style={{ color: colors.text }} className="text-sm font-bold" numberOfLines={1}>
                        {s.ticker}
                      </Text>
                      <Text style={{ color: colors.textMuted }} className="text-xs mt-0.5" numberOfLines={1}>
                        {getStockName(s.ticker, 'ar')}
                      </Text>
                      <Text style={{ color: colors.text }} className="text-sm font-bold tabular-nums mt-2">
                        {(s.price ?? 0).toFixed(2)}
                      </Text>
                      <Text
                        className="text-xs font-semibold mt-0.5 tabular-nums"
                        style={{ color: s.changePercent >= 0 ? '#4ade80' : '#f87171' }}
                      >
                        {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}

        {/* ══════════ NEWS TAB ══════════ */}
        {tab === 'news' && (
          <>
            {loadingNews ? (
              <View className="gap-3">
                {[1,2,3].map(i => <Skeleton key={i} height={90} />)}
              </View>
            ) : news.length === 0 ? (
              <View className="items-center py-16 gap-3">
                <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="w-14 h-14 rounded-full border items-center justify-center">
                  <Newspaper size={24} color={colors.textMuted} />
                </View>
                <Text style={{ color: colors.textMuted }} className="text-sm">لا توجد أخبار حالياً</Text>
              </View>
            ) : (
              <>
                {news.slice(0, 5).map((item, i) => (
                  <Pressable
                    key={i}
                    onPress={() => Linking.openURL(item.url).catch(() => null)}
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}
                    className="border rounded-2xl p-4 gap-2 active:opacity-70"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text style={{ color: colors.textMuted }} className="text-xs">
                        {item.source}
                      </Text>
                      <Text style={{ color: colors.textMuted }} className="text-xs">
                        {new Date(item.publishedAt).toLocaleDateString('ar-EG')}
                      </Text>
                    </View>
                    <Text style={{ color: colors.text }} className="text-sm font-semibold leading-5">
                      {item.title}
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <Text className="text-xs text-brand font-medium">اقرأ المزيد</Text>
                      <ExternalLink size={11} color="#8b5cf6" />
                    </View>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => router.push(`/news?ticker=${ticker}` as never)}
                  style={{ backgroundColor: colors.card, borderColor: colors.border }}
                  className="border rounded-2xl py-3.5 items-center"
                >
                  <Text style={{ color: colors.text }} className="text-sm font-semibold">
                    عرض كل الأخبار
                  </Text>
                </Pressable>
              </>
            )}
          </>
        )}

        {/* ══════════ AI TAB ══════════ */}
        {tab === 'ai' && (
          <View className="gap-4">
            <Pressable
              onPress={() => router.push(`/ai/analyze?ticker=${ticker}`)}
              className="bg-brand/10 border border-brand/30 rounded-2xl p-5 active:opacity-80"
            >
              <View className="w-12 h-12 rounded-xl bg-brand/20 items-center justify-center mb-4">
                <Brain size={22} color="#8b5cf6" />
              </View>
              <Text style={{ color: colors.text }} className="text-base font-bold mb-1">
                تحليل AI لـ {ticker}
              </Text>
              <Text style={{ color: colors.textSub }} className="text-sm leading-5 mb-4">
                تحليل شامل — فني وأساسي مع توصية، حجم التداول، دعم ومقاومة، وتقدير السعر المستهدف.
              </Text>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5 bg-brand/20 px-3 py-1.5 rounded-lg">
                  <Text className="text-xs font-bold text-brand">1 تحليل من رصيدك</Text>
                </View>
                <ChevronIcon size={18} color="#8b5cf6" />
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push(`/ai/compare?ticker=${ticker}`)}
              className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 active:opacity-80 flex-row items-center gap-3"
            >
              <View className="w-10 h-10 rounded-xl bg-blue-500/20 items-center justify-center">
                <Brain size={18} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className="text-sm font-bold">مقارنة مع سهم آخر</Text>
                <Text style={{ color: colors.textSub }} className="text-xs mt-0.5">اعرف أيهما أفضل للاستثمار</Text>
              </View>
              <ChevronIcon size={16} color={colors.textMuted} />
            </Pressable>

            <Text style={{ color: colors.textMuted }} className="text-xs text-center leading-5 px-4 mt-2">
              التحليلات للأغراض التعليمية فقط وليست توصيات استثمارية.
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
