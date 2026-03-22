import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, Pressable, ScrollView, Modal,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowRight, Newspaper, X, TrendingUp, TrendingDown, Clock, Bookmark } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import { getStockInfo } from '../../lib/egxStocks';
import apiClient from '../../lib/api/client';
import { BRAND, RADIUS, WEIGHT, FONT, SPACE } from '../../lib/theme';

interface NewsItem {
  title: string;
  url: string;
  source: string;
  sourceType?: string;
  publishedAt: string;
  summary?: string;
  sentiment?: string | null;
  tickers?: string[];
  isMarketWide?: boolean;
}

type NewsFilter = 'all' | 'interests';
type NewsScope  = 'twoDays' | 'today' | 'yesterday' | 'all';

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 60) return `منذ ${Math.max(1, m)} د`;
  if (h < 24) return `منذ ${h} س`;
  return `منذ ${d} ي`;
}

function SentimentBadge({ sentiment, colors }: { sentiment?: string | null; colors: ReturnType<typeof useTheme>['colors'] }) {
  const s = sentiment?.toLowerCase();
  if (s === 'positive' || s === 'bullish') {
    return (
      <View style={{ backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2 }}>
        <TrendingUp size={11} color="#16a34a" />
        <Text style={{ color: '#16a34a', fontSize: 11, fontWeight: WEIGHT.semibold }}>إيجابي</Text>
      </View>
    );
  }
  if (s === 'negative' || s === 'bearish') {
    return (
      <View style={{ backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2 }}>
        <TrendingDown size={11} color="#dc2626" />
        <Text style={{ color: '#dc2626', fontSize: 11, fontWeight: WEIGHT.semibold }}>سلبي</Text>
      </View>
    );
  }
  return (
    <View style={{ backgroundColor: colors.hover, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: WEIGHT.semibold }}>عام</Text>
    </View>
  );
}

function NewsDetailModal({
  item,
  colors,
  onClose,
}: {
  item: NewsItem;
  colors: ReturnType<typeof useTheme>['colors'];
  onClose: () => void;
}) {
  const s = item.sentiment?.toLowerCase();
  const accentColor =
    s === 'positive' || s === 'bullish' ? '#16a34a'
    : s === 'negative' || s === 'bearish' ? '#dc2626'
    : BRAND;

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          onPress={e => e.stopPropagation()}
          style={{ backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '88%' }}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 4, backgroundColor: colors.border }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}
          >
            {/* Top: sentiment + time + close */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, flex: 1 }}>
                <SentimentBadge sentiment={item.sentiment} colors={colors} />
                {item.publishedAt && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} color={colors.textMuted} />
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                      {relativeTime(item.publishedAt)}
                    </Text>
                  </View>
                )}
              </View>
              <Pressable
                onPress={onClose}
                style={{ backgroundColor: colors.hover, borderRadius: 20, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Accent bar */}
            <View style={{ height: 3, backgroundColor: accentColor, borderRadius: 2, marginBottom: 12 }} />

            {/* Title */}
            <Text
              style={{ color: colors.text, fontSize: FONT.base, fontWeight: WEIGHT.bold, lineHeight: 24, marginBottom: 12 }}
            >
              {item.title}
            </Text>

            {/* Summary block */}
            <View style={{ backgroundColor: colors.hover, borderRadius: 16, padding: 16, marginBottom: 16 }}>
              {item.summary ? (
                <Text style={{ color: colors.text, fontSize: FONT.sm, lineHeight: 26 }}>
                  {item.summary}
                </Text>
              ) : (
                <Text style={{ color: colors.textMuted, fontSize: FONT.sm, textAlign: 'center', paddingVertical: 8 }}>
                  لا يوجد ملخص متاح لهذا الخبر حالياً
                </Text>
              )}
            </View>

            {/* Source */}
            <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 12 }}>
              المصدر: {item.source}
            </Text>

            {/* Affected tickers */}
            {item.tickers && item.tickers.length > 0 && (
              <View>
                <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: WEIGHT.semibold, letterSpacing: 0.5, marginBottom: 8 }}>
                  الأسهم المتأثرة
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {item.tickers.map(ticker => (
                    <View
                      key={ticker}
                      style={{ backgroundColor: colors.hover, borderColor: colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}
                    >
                      <Text style={{ color: colors.text, fontFamily: 'monospace', fontSize: 12, fontWeight: WEIGHT.bold }}>
                        {ticker}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function NewsPage() {
  const router = useRouter();
  const { ticker } = useLocalSearchParams<{ ticker?: string }>();
  const { colors, isRTL } = useTheme();
  const [news, setNews]           = useState<NewsItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [selected, setSelected]   = useState<NewsItem | null>(null);
  const [filter, setFilter]       = useState<NewsFilter>('all');
  const [scope, setScope]         = useState<NewsScope>('twoDays');

  const stockInfo   = ticker ? getStockInfo(ticker) : null;
  const isStockNews = !!ticker;
  const title       = isStockNews
    ? `أخبار ${stockInfo?.nameAr ?? ticker}`
    : 'أخبار البورصة';

  const fetchNews = async (signal?: AbortSignal) => {
    setError(null);
    try {
      let endpoint: string;
      if (isStockNews) {
        endpoint = `/api/stocks/${ticker}/news`;
      } else if (filter === 'interests') {
        endpoint = '/api/news/interests';
      } else {
        endpoint = '/api/news/market';
      }
      const res = await apiClient.get(endpoint, { signal });
      const d = (res.data as { data?: NewsItem[] })?.data ?? res.data;
      setNews(Array.isArray(d) ? d : []);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'CanceledError') return;
      setError('تعذّر تحميل الأخبار، اسحب للأسفل للمحاولة مجدداً');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setNews([]);
    fetchNews(ctrl.signal);
    return () => ctrl.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNews();
  };

  const ArrowIcon = isRTL ? ArrowRight : ArrowLeft;

  function accentColor(sentiment?: string | null) {
    const s = sentiment?.toLowerCase();
    if (s === 'positive' || s === 'bullish') return '#16a34a';
    if (s === 'negative' || s === 'bearish') return '#dc2626';
    return colors.border;
  }

  const scopeTabs: { id: NewsScope; label: string }[] = [
    { id: 'twoDays',   label: 'اليومين' },
    { id: 'today',     label: 'اليوم' },
    { id: 'yesterday', label: 'أمس' },
    { id: 'all',       label: 'الكل' },
  ];

  const sortedNews = useMemo(() => {
    return [...news].sort((a, b) => {
      const ta = new Date(a.publishedAt).getTime();
      const tb = new Date(b.publishedAt).getTime();
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
  }, [news]);

  const filteredNews = useMemo(() => {
    if (scope === 'all') return sortedNews;

    const now          = new Date();
    const todayStart   = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1);
    const tomorrowStart  = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    const msToday     = todayStart.getTime();
    const msYesterday = yesterdayStart.getTime();
    const msTomorrow  = tomorrowStart.getTime();

    return sortedNews.filter((item) => {
      const t = new Date(item.publishedAt).getTime();
      if (!Number.isFinite(t)) return false;
      if (scope === 'today')     return t >= msToday && t < msTomorrow;
      if (scope === 'yesterday') return t >= msYesterday && t < msToday;
      // twoDays
      return t >= msYesterday && t < msTomorrow;
    });
  }, [scope, sortedNews]);

  const emptyMessage = isStockNews
    ? 'لا توجد أخبار لهذا السهم حالياً'
    : filter === 'interests'
    ? 'لا توجد أخبار لأسهم قائمة المراقبة'
    : 'لا توجد أخبار حالياً';

  const emptyHint = !isStockNews && filter === 'interests'
    ? 'أضف أسهماً إلى قائمة المراقبة لترى أخبارها هنا'
    : null;

  return (
    <ScreenWrapper padded={false}>
      {/* Header */}
      <View
        style={{
          borderBottomColor: colors.border, borderBottomWidth: 1,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center', gap: 12,
          paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ backgroundColor: colors.hover, borderColor: colors.border, borderWidth: 1, width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowIcon size={16} color={colors.textMuted} />
        </Pressable>
        <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: 'rgba(59,130,246,0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <Newspaper size={16} color="#3b82f6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: FONT.base, fontWeight: WEIGHT.bold }} numberOfLines={1}>
            {title}
          </Text>
          {isStockNews && ticker && (
            <Text style={{ color: colors.textMuted, fontSize: FONT.xs }}>{ticker}</Text>
          )}
        </View>
        {/* News count badge */}
        {!loading && news.length > 0 && (
          <View style={{ backgroundColor: `${BRAND}18`, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: BRAND, fontSize: 11, fontWeight: WEIGHT.semibold }}>{news.length}</Text>
          </View>
        )}
      </View>

      {/* All / Interests filter — only for market news */}
      {!isStockNews && (
        <View
          style={{
            marginHorizontal: 16, marginTop: 12,
            backgroundColor: colors.card,
            borderColor: colors.border, borderWidth: 1,
            borderRadius: RADIUS.lg, padding: 4,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            gap: 4,
          }}
        >
          {([
            { id: 'all' as NewsFilter,       label: 'الكل',        Icon: Newspaper },
            { id: 'interests' as NewsFilter, label: 'اهتماماتي',   Icon: Bookmark },
          ]).map(({ id, label, Icon }) => {
            const active = filter === id;
            return (
              <Pressable
                key={id}
                onPress={() => setFilter(id)}
                style={{
                  flex: 1,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  backgroundColor: active ? `${BRAND}18` : 'transparent',
                  borderRadius: RADIUS.md - 4,
                  paddingVertical: 9,
                  borderWidth: active ? 1 : 0,
                  borderColor: active ? `${BRAND}44` : 'transparent',
                }}
              >
                <Icon size={13} color={active ? BRAND : colors.textMuted} />
                <Text style={{ color: active ? BRAND : colors.textMuted, fontSize: 12, fontWeight: WEIGHT.semibold }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Scope tabs (date filter) */}
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 8,
          marginBottom: 4,
          backgroundColor: colors.card,
          borderColor: colors.border, borderWidth: 1,
          borderRadius: RADIUS.lg, padding: 4,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          gap: 4,
        }}
      >
        {scopeTabs.map((t) => {
          const active = scope === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setScope(t.id)}
              style={{
                flex: 1,
                backgroundColor: active ? colors.hover : 'transparent',
                borderRadius: RADIUS.md - 4,
                paddingVertical: 7,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: active ? colors.text : colors.textMuted,
                  fontSize: 11,
                  fontWeight: active ? WEIGHT.bold : WEIGHT.medium,
                }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
      >
        {loading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton.Box key={i} height={96} />
            ))}
          </>
        ) : error ? (
          <View style={{ alignItems: 'center', paddingVertical: 64, gap: 12 }}>
            <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}>
              <Newspaper size={24} color={colors.textMuted} />
            </View>
            <Text style={{ color: colors.textMuted, fontSize: FONT.sm, textAlign: 'center', paddingHorizontal: 16 }}>{error}</Text>
          </View>
        ) : filteredNews.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 64, gap: 12 }}>
            <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}>
              <Newspaper size={24} color={colors.textMuted} />
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ color: colors.textMuted, fontSize: FONT.sm, fontWeight: WEIGHT.semibold }}>
                {emptyMessage}
              </Text>
              {emptyHint && (
                <Text style={{ color: colors.textMuted, fontSize: FONT.xs, textAlign: 'center', paddingHorizontal: 32 }}>
                  {emptyHint}
                </Text>
              )}
            </View>
          </View>
        ) : (
          filteredNews.map((item, i) => (
            <Pressable
              key={item.url || i}
              onPress={() => setSelected(item)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.hover : colors.card,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 16,
                overflow: 'hidden',
              })}
            >
              {/* Sentiment accent strip */}
              <View style={{ height: 3, backgroundColor: accentColor(item.sentiment) }} />

              <View style={{ padding: 16, gap: 8 }}>
                {/* Sentiment + time */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <SentimentBadge sentiment={item.sentiment} colors={colors} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Clock size={10} color={colors.textMuted} />
                    <Text style={{ color: colors.textMuted, fontSize: FONT.xs }}>
                      {relativeTime(item.publishedAt)}
                    </Text>
                  </View>
                </View>

                {/* Title */}
                <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.semibold, lineHeight: 20 }} numberOfLines={2}>
                  {item.title}
                </Text>

                {/* Summary preview */}
                {item.summary && (
                  <Text style={{ color: colors.textMuted, fontSize: FONT.xs, lineHeight: 18 }} numberOfLines={2}>
                    {item.summary}
                  </Text>
                )}

                {/* Source + tickers row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 10 }} numberOfLines={1}>
                    {item.source}
                  </Text>
                  {item.tickers && item.tickers.length > 0 && (
                    <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
                      {item.tickers.slice(0, 3).map(t => (
                        <View key={t} style={{ backgroundColor: `${BRAND}12`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: BRAND, fontSize: 10, fontWeight: WEIGHT.bold }}>{t}</Text>
                        </View>
                      ))}
                      {item.tickers.length > 3 && (
                        <Text style={{ color: colors.textMuted, fontSize: 10, alignSelf: 'center' }}>+{item.tickers.length - 3}</Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* News detail bottom sheet */}
      {selected && (
        <NewsDetailModal
          item={selected}
          colors={colors}
          onClose={() => setSelected(null)}
        />
      )}
    </ScreenWrapper>
  );
}
