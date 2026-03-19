import { useState, useEffect } from 'react';
import {
  View, Text, Pressable, ScrollView, Linking,
  RefreshControl, I18nManager,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowRight, Newspaper, ExternalLink } from 'lucide-react-native';
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
}

export default function NewsPage() {
  const router = useRouter();
  const { ticker } = useLocalSearchParams<{ ticker?: string }>();
  const { colors } = useTheme();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
              <Skeleton key={i} height={96} />
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
              onPress={() => Linking.openURL(item.url).catch(() => null)}
              style={({ pressed }) => [
                { backgroundColor: pressed ? colors.hover : colors.card, borderColor: colors.border },
              ]}
              className="border rounded-2xl p-4 gap-2"
            >
              <View className="flex-row items-center justify-between">
                <Text style={{ color: colors.textMuted }} className="text-xs font-medium">
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
                <Text className="text-xs text-blue-400 font-medium">اقرأ المزيد</Text>
                <ExternalLink size={11} color="#60a5fa" />
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
