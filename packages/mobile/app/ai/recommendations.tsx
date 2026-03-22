import { useState } from 'react';
import {
  View, Text, Pressable, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../hooks/useTheme';
import apiClient from '../../lib/api/client';
import { AnalysisLoader } from '../../components/shared/AnalysisLoader';
import { tw } from '../../lib/tw';

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

interface GoalProgress {
  goal?: string;
  currentAmount?: number;
  targetAmount?: number;
  gap?: number;
  suggestion?: string;
}

interface WatchlistOpinion {
  ticker?: string;
  opinion?: string;
  reason?: string;
}

interface RecommendationsResult {
  recommendations?: RecommendedStock[];
  summary?: string;
  personalizedInsight?: string;
  goalProgress?: GoalProgress[];
  watchlistOpinion?: WatchlistOpinion[];
  disclaimer?: string;
}

function scoreColor(s: number) {
  return s >= 65 ? '#4ade80' : s >= 45 ? '#fbbf24' : '#f87171';
}

function RecommendationCard({ stock, rank }: { stock: RecommendedStock; rank: number }) {
  const { colors } = useTheme();
  const score = stock.score ?? 0;
  const verdict = stock.verdictBadge ?? stock.verdict ?? '';
  const isBuy = verdict.includes('شراء');
  const isSell = verdict.includes('بيع');
  const verdictColor = isBuy ? '#4ade80' : isSell ? '#f87171' : '#fbbf24';

  return (
    <View
      style={[
        { backgroundColor: colors.card, borderColor: colors.border },
        tw('border rounded-2xl p-4 gap-3'),
      ]}
    >
      <View style={tw('flex-row items-center gap-3')}>
        <View style={tw('w-8 h-8 rounded-xl bg-brand/15 items-center justify-center')}>
          <Text style={tw('text-sm font-bold text-brand')}>#{rank}</Text>
        </View>
        <View style={tw('flex-1')}>
          <Text style={[{ color: colors.text }, tw('text-base font-bold')]}>{stock.ticker ?? ''}</Text>
          {stock.name ? <Text style={[{ color: colors.textSub }, tw('text-xs')]}>{stock.name}</Text> : null}
        </View>
        {typeof stock.score === 'number' && (
          <View
            style={[
              { borderColor: scoreColor(score) },
              tw('w-10 h-10 rounded-full items-center justify-center border-2'),
            ]}
          >
            <Text style={[{ color: scoreColor(score) }, tw('text-sm font-bold tabular-nums')]}>{score}</Text>
          </View>
        )}
        {verdict ? (
          <View style={[tw('px-2 py-1 rounded-lg'), { backgroundColor: `${verdictColor}18` }]}>
            <Text style={[{ color: verdictColor }, tw('text-xs font-bold')]}>{verdict}</Text>
          </View>
        ) : null}
      </View>

      {stock.reason ? (
        <Text style={[{ color: colors.textSub }, tw('text-sm leading-5')]}>{stock.reason}</Text>
      ) : null}

      <View style={tw('gap-1.5')}>
        {stock.strengths?.slice(0, 2).map((s, i) => {
          const t = typeof s === 'string' ? s : String(s ?? ''); if (!t) return null;
          return (
            <View key={i} style={tw('flex-row gap-2 items-start')}>
              <CheckCircle size={12} color="#4ade80" style={{ marginTop: 2 }} />
              <Text style={[{ color: colors.text }, tw('flex-1 text-xs leading-4')]}>{t}</Text>
            </View>
          );
        })}
        {stock.risks?.slice(0, 1).map((r, i) => {
          const t = typeof r === 'string' ? r : String(r ?? ''); if (!t) return null;
          return (
            <View key={i} style={tw('flex-row gap-2 items-start')}>
              <AlertTriangle size={12} color="#fbbf24" style={{ marginTop: 2 }} />
              <Text style={[{ color: colors.text }, tw('flex-1 text-xs leading-4')]}>{t}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function RecommendationsPage() {
  const router = useRouter();
  const { colors, isRTL } = useTheme();
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
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (code === 'ANALYSIS_LIMIT_REACHED') setError('وصلت للحد الشهري من التحليلات');
      else if (code === 'UNAUTHORIZED' || status === 401) setError('انتهت الجلسة — سجّل دخولك مرة أخرى');
      else if ((err as { error?: string })?.error === 'NETWORK_ERROR') setError('لا يوجد اتصال');
      else setError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const recs = result?.recommendations ?? [];

  return (
    <ScreenWrapper padded={false}>
      <View
        style={[
          { borderBottomColor: colors.border, borderBottomWidth: 1 },
          tw('flex-row items-center gap-3 px-4 pt-5 pb-4'),
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[
            { backgroundColor: colors.hover, borderColor: colors.border },
            tw('w-9 h-9 rounded-xl border items-center justify-center'),
          ]}
        >
          {isRTL ? <ArrowRight size={16} color={colors.textSub} /> : <ArrowLeft size={16} color={colors.textSub} />}
        </Pressable>
        <View style={tw('w-8 h-8 rounded-xl bg-amber-500/15 items-center justify-center')}>
          <Sparkles size={16} color="#f59e0b" />
        </View>
        <Text style={[{ color: colors.text }, tw('text-base font-bold')]}>توصيات شخصية</Text>
      </View>

      <ScrollView contentContainerStyle={tw('px-4 pt-4 pb-10 gap-4')} showsVerticalScrollIndicator={false}>
        <View
          style={[
            { backgroundColor: colors.card, borderColor: colors.border },
            tw('border rounded-2xl px-4 py-4 gap-2'),
          ]}
        >
          <View style={tw('flex-row items-center gap-2')}>
            <TrendingUp size={16} color="#f59e0b" />
            <Text style={[{ color: colors.text }, tw('text-sm font-bold')]}>توصيات مخصصة لك</Text>
          </View>
          <Text style={[{ color: colors.textSub }, tw('text-xs leading-5')]}>
            بناءً على محفظتك وقائمة المتابعة وأهدافك الاستثمارية، سيقترح الذكاء الاصطناعي أفضل الأسهم المناسبة لك الآن.
          </Text>
        </View>

        <Pressable
          onPress={run}
          disabled={loading}
          style={[
            tw('bg-amber-500 rounded-xl py-3.5 items-center'),
            { opacity: loading ? 0.5 : 1 },
          ]}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={tw('text-sm font-bold text-white')}>احصل على التوصيات</Text>}
        </Pressable>

        {loading && <AnalysisLoader variant="recommendations" />}

        {error && (
          <View style={tw('bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3')}>
            <Text style={tw('text-sm text-red-400 text-center')}>{error}</Text>
          </View>
        )}

        {result && !loading && (
          <View style={tw('gap-4')}>
            {result.summary ? (
              <View
                style={[
                  { backgroundColor: colors.card, borderColor: colors.border },
                  tw('border rounded-2xl px-4 py-3'),
                ]}
              >
                <Text style={[{ color: colors.text }, tw('text-sm leading-6')]}>{result.summary}</Text>
              </View>
            ) : null}

            {result.personalizedInsight && (
              <View style={tw('bg-brand/10 border border-brand/25 rounded-2xl px-4 py-3 flex-row gap-2')}>
                <Text style={tw('text-base')}>🎯</Text>
                <Text style={[{ color: colors.text }, tw('flex-1 text-sm leading-5')]}>{result.personalizedInsight}</Text>
              </View>
            )}

            {result.goalProgress && result.goalProgress.length > 0 && (
              <View
                style={[
                  { backgroundColor: colors.card, borderColor: colors.border },
                  tw('border rounded-2xl px-4 py-3 gap-3'),
                ]}
              >
                <Text style={[{ color: colors.text }, tw('text-sm font-bold')]}>🎯 أهدافك المالية</Text>
                {result.goalProgress.map((g, i) => {
                  const pct = g.targetAmount && g.targetAmount > 0
                    ? Math.min(100, Math.round(((g.currentAmount ?? 0) / g.targetAmount) * 100))
                    : 0;
                  return (
                    <View key={i} style={tw('gap-1.5')}>
                      <View style={tw('flex-row justify-between')}>
                        <Text style={[{ color: colors.text }, tw('text-xs font-bold flex-1')]}>{g.goal}</Text>
                        {g.gap != null && (
                          <Text style={[{ color: colors.textMuted }, tw('text-xs')]}>متبقي: {g.gap.toLocaleString()} ج</Text>
                        )}
                      </View>
                      <View style={[{ backgroundColor: colors.border }, tw('h-1.5 rounded-full overflow-hidden')]}>
                        <View style={[{ width: `${pct}%`, backgroundColor: '#8b5cf6' }, tw('h-full rounded-full')]} />
                      </View>
                      {g.suggestion && (
                        <Text style={[{ color: colors.textSub }, tw('text-xs leading-4')]}>{g.suggestion}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {result.watchlistOpinion && result.watchlistOpinion.length > 0 && (
              <View
                style={[
                  { backgroundColor: colors.card, borderColor: colors.border },
                  tw('border rounded-2xl px-4 py-3 gap-2'),
                ]}
              >
                <Text style={[{ color: colors.text }, tw('text-sm font-bold')]}>👁 رأي AI في قائمة مراقبتك</Text>
                {result.watchlistOpinion.map((w, i) => {
                  const isBuy = w.opinion?.includes('ادخل');
                  const isSell = w.opinion?.includes('تجنّب');
                  const opColor = isBuy ? '#4ade80' : isSell ? '#f87171' : '#fbbf24';
                  return (
                    <View key={i} style={[{ borderTopColor: colors.border }, tw('pt-2 flex-row items-start gap-3'), i === 0 ? { borderTopWidth: 0, paddingTop: 0 } : { borderTopWidth: 1 }]}>
                      <Text style={[{ color: colors.text }, tw('text-xs font-bold w-12')]}>{w.ticker}</Text>
                      <View style={[tw('px-2 py-0.5 rounded-md'), { backgroundColor: `${opColor}18` }]}>
                        <Text style={[{ color: opColor }, tw('text-xs font-bold')]}>{w.opinion}</Text>
                      </View>
                      <Text style={[{ color: colors.textSub }, tw('flex-1 text-xs leading-4')]}>{w.reason}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {recs.length > 0 ? (
              <View style={tw('gap-3')}>
                {recs.map((stock, i) => (
                  <RecommendationCard key={stock.ticker ?? i} stock={stock} rank={i + 1} />
                ))}
              </View>
            ) : (
              <View
                style={[
                  { backgroundColor: colors.card, borderColor: colors.border },
                  tw('border rounded-2xl px-4 py-6 items-center'),
                ]}
              >
                <Text style={[{ color: colors.textSub }, tw('text-sm text-center')]}>
                  لا توجد توصيات متاحة حالياً
                </Text>
              </View>
            )}

            {result.disclaimer ? (
              <Text
                style={[{ color: colors.textMuted }, tw('text-xs text-center leading-5 px-2')]}
              >
                ⚖️ {result.disclaimer}
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
