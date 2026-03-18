import { useState } from 'react';
import {
  View, Text, Pressable, ScrollView,
  ActivityIndicator, I18nManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle, XCircle, AlertTriangle, TrendingUp } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import apiClient from '../../lib/api/client';
import { AnalysisLoader } from '../../components/shared/AnalysisLoader';

interface RecommendedStock {
  ticker?: string;
  name?: string;
  score?: number;
  verdict?: string;
  verdictBadge?: string;
  reason?: string;
  strengths?: string[];
  risks?: string[];
}

interface RecommendationsResult {
  recommendations?: RecommendedStock[];
  summary?: string;
  disclaimer?: string;
}

function scoreColor(s: number) {
  return s >= 65 ? '#4ade80' : s >= 45 ? '#fbbf24' : '#f87171';
}

function RecommendationCard({ stock, rank }: { stock: RecommendedStock; rank: number }) {
  const score = stock.score ?? 0;
  const verdict = stock.verdictBadge ?? stock.verdict ?? '';
  const isBuy = verdict.includes('شراء');
  const isSell = verdict.includes('بيع');
  const verdictColor = isBuy ? '#4ade80' : isSell ? '#f87171' : '#fbbf24';

  return (
    <View className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 gap-3">
      <View className="flex-row items-center gap-3">
        <View className="w-8 h-8 rounded-xl bg-brand/15 items-center justify-center">
          <Text className="text-sm font-bold text-brand">#{rank}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-[#e6edf3]">{stock.ticker ?? ''}</Text>
          {stock.name ? <Text className="text-xs text-[#8b949e]">{stock.name}</Text> : null}
        </View>
        {typeof stock.score === 'number' && (
          <View
            className="w-10 h-10 rounded-full items-center justify-center border-2"
            style={{ borderColor: scoreColor(score) }}
          >
            <Text className="text-sm font-bold tabular-nums" style={{ color: scoreColor(score) }}>{score}</Text>
          </View>
        )}
        {verdict ? (
          <View className="px-2 py-1 rounded-lg" style={{ backgroundColor: `${verdictColor}18` }}>
            <Text className="text-xs font-bold" style={{ color: verdictColor }}>{verdict}</Text>
          </View>
        ) : null}
      </View>

      {stock.reason ? (
        <Text className="text-sm text-[#8b949e] leading-5">{stock.reason}</Text>
      ) : null}

      <View className="gap-1.5">
        {stock.strengths?.slice(0, 2).map((s, i) => (
          <View key={i} className="flex-row gap-2 items-start">
            <CheckCircle size={12} color="#4ade80" style={{ marginTop: 2 }} />
            <Text className="flex-1 text-xs text-[#e6edf3] leading-4">{s}</Text>
          </View>
        ))}
        {stock.risks?.slice(0, 1).map((r, i) => (
          <View key={i} className="flex-row gap-2 items-start">
            <AlertTriangle size={12} color="#fbbf24" style={{ marginTop: 2 }} />
            <Text className="flex-1 text-xs text-[#e6edf3] leading-4">{r}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function RecommendationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendationsResult | null>(null);

  const run = async () => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await apiClient.post('/api/analysis/recommendations', undefined, { timeout: 120_000 });
      const data =
        (res.data as { data?: RecommendationsResult })?.data ??
        (res.data as RecommendationsResult);
      if (data) setResult(data as RecommendationsResult);
      else setError('لم يتم استلام التوصيات');
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (code === 'ANALYSIS_LIMIT_REACHED') setError('وصلت للحد الشهري من التحليلات');
      else if ((err as { error?: string })?.error === 'NETWORK_ERROR') setError('لا يوجد اتصال');
      else setError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const recs = result?.recommendations ?? [];

  return (
    <ScreenWrapper padded={false}>
      <View className="flex-row items-center gap-3 px-4 pt-5 pb-4 border-b border-[#30363d]">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white/[0.04] border border-[#30363d] items-center justify-center"
        >
          {I18nManager.isRTL ? <ArrowRight size={16} color="#8b949e" /> : <ArrowLeft size={16} color="#8b949e" />}
        </Pressable>
        <View className="w-8 h-8 rounded-xl bg-amber-500/15 items-center justify-center">
          <Sparkles size={16} color="#f59e0b" />
        </View>
        <Text className="text-base font-bold text-[#e6edf3]">توصيات شخصية</Text>
      </View>

      <ScrollView contentContainerClassName="px-4 pt-4 pb-10 gap-4" showsVerticalScrollIndicator={false}>
        <View className="bg-[#161b22] border border-[#30363d] rounded-2xl px-4 py-4 gap-2">
          <View className="flex-row items-center gap-2">
            <TrendingUp size={16} color="#f59e0b" />
            <Text className="text-sm font-bold text-[#e6edf3]">توصيات مخصصة لك</Text>
          </View>
          <Text className="text-xs text-[#8b949e] leading-5">
            بناءً على محفظتك وقائمة المتابعة وأهدافك الاستثمارية، سيقترح الذكاء الاصطناعي أفضل الأسهم المناسبة لك الآن.
          </Text>
        </View>

        <Pressable
          onPress={run}
          disabled={loading}
          className="bg-amber-500 rounded-xl py-3.5 items-center"
          style={{ opacity: loading ? 0.5 : 1 }}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-sm font-bold text-white">احصل على التوصيات</Text>}
        </Pressable>

        {loading && <AnalysisLoader variant="recommendations" />}

        {error && (
          <View className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <Text className="text-sm text-red-400 text-center">{error}</Text>
          </View>
        )}

        {result && !loading && (
          <View className="gap-4">
            {result.summary ? (
              <View className="bg-[#161b22] border border-[#30363d] rounded-2xl px-4 py-3">
                <Text className="text-sm text-[#e6edf3] leading-6">{result.summary}</Text>
              </View>
            ) : null}

            {recs.length > 0 ? (
              <View className="gap-3">
                {recs.map((stock, i) => (
                  <RecommendationCard key={stock.ticker ?? i} stock={stock} rank={i + 1} />
                ))}
              </View>
            ) : (
              <View className="bg-[#161b22] border border-[#30363d] rounded-2xl px-4 py-6 items-center">
                <Text className="text-sm text-[#8b949e] text-center">لا توجد توصيات متاحة حالياً</Text>
              </View>
            )}

            {result.disclaimer ? (
              <Text className="text-xs text-[#656d76] text-center leading-5 px-2">⚖️ {result.disclaimer}</Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
