import { useState, useEffect } from 'react';
import {
  View, Text, Pressable, ScrollView, Modal,
  RefreshControl, I18nManager,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowRight, Newspaper, X, TrendingUp, TrendingDown, Clock } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import { getStockInfo } from '../../lib/egxStocks';
import apiClient from '../../lib/api/client';

interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary?: string;
  sentiment?: string | null;
  tickers?: string[];
}

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
      <View style={{ backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 20 }} className="flex-row items-center gap-1 px-2 py-0.5">
        <TrendingUp size={11} color="#16a34a" />
        <Text style={{ color: '#16a34a' }} className="text-[11px] font-semibold">إيجابي</Text>
      </View>
    );
  }
  if (s === 'negative' || s === 'bearish') {
    return (
      <View style={{ backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 20 }} className="flex-row items-center gap-1 px-2 py-0.5">
        <TrendingDown size={11} color="#dc2626" />
        <Text style={{ color: '#dc2626' }} className="text-[11px] font-semibold">سلبي</Text>
      </View>
    );
  }
  return (
    <View style={{ backgroundColor: colors.hover, borderRadius: 20 }} className="px-2 py-0.5">
      <Text style={{ color: colors.textMuted }} className="text-[11px] font-semibold">عام</Text>
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
    : colors.brand ?? '#3b82f6';

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
          <View className="items-center pt-3 pb-1">
            <View style={{ width: 40, height: 4, borderRadius: 4, backgroundColor: colors.border }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}
          >
            {/* Top: sentiment + time + close */}
            <View className="flex-row items-center justify-between gap-3 mb-4">
              <View className="flex-row flex-wrap items-center gap-2 flex-1">
                <SentimentBadge sentiment={item.sentiment} colors={colors} />
                {item.publishedAt && (
                  <View className="flex-row items-center gap-1">
                    <Clock size={11} color={colors.textMuted} />
                    <Text style={{ color: colors.textMuted }} className="text-[11px]">
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

            {/* Title */}
            <Text
              style={{ color: colors.textMuted ?? colors.text }}
              className="text-sm font-semibold leading-5 mb-3"
              numberOfLines={2}
            >
              {item.title}
            </Text>

            {/* Summary block */}
            <View style={{ backgroundColor: colors.hover, borderRadius: 16, padding: 16, marginBottom: 16 }}>
              {item.summary ? (
                <Text style={{ color: colors.text }} className="text-base leading-7">
                  {item.summary}
                </Text>
              ) : (
                <Text style={{ color: colors.textMuted }} className="text-sm text-center py-2">
                  لا يوجد ملخص متاح لهذا الخبر حالياً
                </Text>
              )}
            </View>

            {/* Affected tickers */}
            {item.tickers && item.tickers.length > 0 && (
              <View>
                <Text style={{ color: colors.textMuted }} className="text-[11px] font-semibold uppercase tracking-wide mb-2">
                  الأسهم المتأثرة
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {item.tickers.map(ticker => (
                    <View
                      key={ticker}
                      style={{ backgroundColor: colors.hover, borderColor: colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}
                    >
                      <Text style={{ color: colors.text, fontFamily: 'monospace' }} className="text-xs font-bold">
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
  const { colors } = useTheme();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<NewsItem | null>(null);

  const stockInfo = ticker ? getStockInfo(ticker) : null;
  const isStockNews = !!ticker;
  const title = isStockNews
    ? `أخبار ${stockInfo?.nameAr ?? ticker}`
    : 'أخبار البورصة';

  const fetchNews = async (signal?: AbortSignal) => {
    setError(null);
    try {
      const endpoint = isStockNews
        ? `/api/stocks/${ticker}/news`
        : '/api/news/market';
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
  }, [ticker]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNews();
  };

  const ArrowIcon = I18nManager.isRTL ? ArrowRight : ArrowLeft;

  function accentColor(sentiment?: string | null) {
    const s = sentiment?.toLowerCase();
    if (s === 'positive' || s === 'bullish') return '#16a34a';
    if (s === 'negative' || s === 'bearish') return '#dc2626';
    return colors.border;
  }

  return (
    <ScreenWrapper padded={false}>
      {/* Header */}
      <View
        style={{ borderBottomColor: colors.border }}
        className="flex-row items-center gap-3 px-4 pt-5 pb-4 border-b"
      >
        <Pressable
          onPress={() => router.back()}
          style={{ backgroundColor: colors.hover, borderColor: colors.border }}
          className="w-9 h-9 rounded-xl border items-center justify-center"
        >
          <ArrowIcon size={16} color={colors.textMuted} />
        </Pressable>
        <View className="w-8 h-8 rounded-xl bg-blue-500/15 items-center justify-center">
          <Newspaper size={16} color="#3b82f6" />
        </View>
        <View className="flex-1">
          <Text style={{ color: colors.text }} className="text-base font-bold" numberOfLines={1}>
            {title}
          </Text>
          {isStockNews && ticker && (
            <Text style={{ color: colors.textMuted }} className="text-xs">{ticker}</Text>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 12 }}
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
          <View className="items-center py-16 gap-3">
            <View
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
              className="w-14 h-14 rounded-full border items-center justify-center"
            >
              <Newspaper size={24} color={colors.textMuted} />
            </View>
            <Text style={{ color: colors.textMuted }} className="text-sm text-center px-4">{error}</Text>
          </View>
        ) : news.length === 0 ? (
          <View className="items-center py-16 gap-3">
            <View
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
              className="w-14 h-14 rounded-full border items-center justify-center"
            >
              <Newspaper size={24} color={colors.textMuted} />
            </View>
            <Text style={{ color: colors.textMuted }} className="text-sm">
              {isStockNews ? 'لا توجد أخبار لهذا السهم حالياً' : 'لا توجد أخبار حالياً'}
            </Text>
          </View>
        ) : (
          news.map((item, i) => (
            <Pressable
              key={i}
              onPress={() => setSelected(item)}
              style={({ pressed }) => [
                { backgroundColor: pressed ? colors.hover : colors.card, borderColor: colors.border },
              ]}
              className="border rounded-2xl overflow-hidden"
            >
              {/* Sentiment accent strip */}
              <View style={{ height: 3, backgroundColor: accentColor(item.sentiment) }} />

              <View className="p-4 gap-2">
                {/* Sentiment + time */}
                <View className="flex-row items-center justify-between gap-2">
                  <SentimentBadge sentiment={item.sentiment} colors={colors} />
                  <View className="flex-row items-center gap-1">
                    <Clock size={10} color={colors.textMuted} />
                    <Text style={{ color: colors.textMuted }} className="text-xs">
                      {relativeTime(item.publishedAt)}
                    </Text>
                  </View>
                </View>

                {/* Title */}
                <Text style={{ color: colors.text }} className="text-sm font-semibold leading-5" numberOfLines={1}>
                  {item.title}
                </Text>

                {/* Summary preview */}
                {item.summary && (
                  <Text style={{ color: colors.textMuted }} className="text-xs leading-5" numberOfLines={3}>
                    {item.summary}
                  </Text>
                )}
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
