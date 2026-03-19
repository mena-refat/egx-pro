import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  ActivityIndicator, I18nManager,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowRight, Brain, Search, CheckCircle, XCircle, AlertTriangle } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { AnalysisLoader } from '../../components/shared/AnalysisLoader';
import { EGX_STOCKS, getStockInfo } from '../../lib/egxStocks';
import { useTheme } from '../../hooks/useTheme';
import apiClient from '../../lib/api/client';

// ────────────────── types ──────────────────
interface AnalysisResult {
  score?: number;
  verdict?: string;
  verdictBadge?: string;
  fundamental?: string | { summary?: string };
  technical?: string | { summary?: string };
  strengths?: string[];
  weaknesses?: string[];
  risks?: string[];
  priceTarget?: number | { target?: number };
  recommendation?: string;
  disclaimer?: string;
}

// ────────────────── helpers ──────────────────
function scoreColor(score: number): string {
  if (score >= 65) return '#4ade80';
  if (score >= 45) return '#fbbf24';
  return '#f87171';
}

function str(v: string | { summary?: string } | undefined): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v.summary ?? '';
}

function priceTargetNum(v: AnalysisResult['priceTarget']): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  return v.target ?? null;
}

// ────────────────── TickerInput ──────────────────
function TickerInput({
  value, onChange, placeholder, disabled,
}: { value: string; onChange: (v: string) => void; placeholder: string; disabled?: boolean }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const q = value.trim().toUpperCase();
    if (!q || q.length < 1) return [];
    return EGX_STOCKS.filter(
      (s) => s.ticker.includes(q) || s.nameAr.includes(value.trim()) || s.nameEn.toUpperCase().includes(q),
    ).slice(0, 6);
  }, [value]);

  return (
    <View>
      <View
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
        className="flex-row items-center border rounded-xl px-3 gap-2"
      >
        <Search size={15} color={colors.textMuted} />
        <TextInput
          value={value}
          onChangeText={(t) => { onChange(t); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={{ color: colors.text }}
          className="flex-1 py-3 text-sm"
          autoCapitalize="characters"
          editable={!disabled}
        />
      </View>
      {open && suggestions.length > 0 && (
        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="border rounded-xl mt-1 overflow-hidden"
        >
          {suggestions.map((s) => (
            <Pressable
              key={s.ticker}
              onPress={() => { onChange(s.ticker); setOpen(false); }}
              style={({ pressed }) => ({
                borderBottomColor: colors.border,
                borderBottomWidth: 1,
                backgroundColor: pressed ? colors.hover : 'transparent',
              })}
              className="flex-row items-center justify-between px-4 py-3"
            >
              <Text style={{ color: colors.text }} className="text-sm font-bold">{s.ticker}</Text>
              <Text style={{ color: colors.textSub }} className="text-xs">{s.nameAr}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ────────────────── main screen ──────────────────
export default function AnalyzePage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { ticker: prefill } = useLocalSearchParams<{ ticker?: string }>();
  const [ticker, setTicker] = useState(prefill ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const run = async () => {
    const t = ticker.trim().toUpperCase();
    if (!t) { setError('أدخل رمز السهم أولاً'); return; }
    if (!getStockInfo(t)) { setError('رمز السهم غير موجود — اختر من القائمة'); return; }

    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await apiClient.post(`/api/analysis/${t}`, undefined, { timeout: 120_000 });
      const data = (res.data as { analysis?: AnalysisResult })?.analysis ?? res.data;
      if (data) setResult(data as AnalysisResult);
      else setError('لم يتم استلام نتيجة التحليل');
    } catch (err: unknown) {
      const axiosData = (err as { response?: { data?: { error?: string; ok?: boolean } } })?.response?.data;
      const code = axiosData?.error;
      const status = (err as { response?: { status?: number } })?.response?.status;
      const networkError = (err as { error?: string })?.error;
      if (code === 'ANALYSIS_LIMIT_REACHED') {
        setError('وصلت للحد الشهري من التحليلات. جرب الشهر القادم أو ترقّ للباقة Pro.');
      } else if (code === 'UNAUTHORIZED' || status === 401) {
        setError('انتهت الجلسة — سجّل دخولك مرة أخرى');
      } else if (status === 429) {
        setError('الخدمة مشغولة حالياً، حاول بعد دقيقة');
      } else if (code === 'ANALYSIS_TIMEOUT' || status === 504 || networkError === 'REQUEST_TIMEOUT') {
        setError('استغرق التحليل وقتاً طويلاً — حاول مرة أخرى');
      } else if (code === 'ANALYSIS_FAILED' || status === 502) {
        setError('تعذّر إجراء التحليل — خدمة الذكاء الاصطناعي غير متاحة مؤقتاً، حاول بعد قليل');
      } else if (code === 'SERVICE_UNAVAILABLE' || status === 503) {
        setError('الخدمة غير متاحة حالياً، حاول بعد قليل');
      } else if (networkError === 'NETWORK_ERROR') {
        setError('لا يوجد اتصال بالإنترنت');
      } else {
        setError('حدث خطأ أثناء التحليل، حاول مرة أخرى');
      }
    } finally {
      setLoading(false);
    }
  };

  const verdict = result?.verdictBadge ?? result?.verdict ?? '';
  const isBuy = verdict.includes('شراء');
  const isSell = verdict.includes('بيع');
  const verdictColor = isBuy ? '#4ade80' : isSell ? '#f87171' : '#fbbf24';
  const verdictBg = isBuy ? '#4ade8018' : isSell ? '#f8717118' : '#fbbf2418';
  const score = result?.score ?? 0;
  const target = priceTargetNum(result?.priceTarget);

  return (
    <ScreenWrapper padded={false}>
      {/* Header */}
      <View
        style={{ borderBottomColor: colors.border, borderBottomWidth: 1 }}
        className="flex-row items-center gap-3 px-4 pt-5 pb-4"
      >
        <Pressable
          onPress={() => router.back()}
          style={{ backgroundColor: colors.hover, borderColor: colors.border }}
          className="w-9 h-9 rounded-xl border items-center justify-center"
        >
          {I18nManager.isRTL ? <ArrowRight size={16} color={colors.textSub} /> : <ArrowLeft size={16} color={colors.textSub} />}
        </Pressable>
        <View className="w-8 h-8 rounded-xl bg-violet-500/15 items-center justify-center">
          <Brain size={16} color="#8b5cf6" />
        </View>
        <Text style={{ color: colors.text }} className="text-base font-bold">تحليل سهم</Text>
      </View>

      <ScrollView contentContainerClassName="px-4 pt-4 pb-10 gap-4" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Input */}
        <TickerInput
          value={ticker}
          onChange={setTicker}
          placeholder="ابحث عن رمز السهم (مثال: COMI)"
          disabled={loading}
        />

        {/* Button */}
        <Pressable
          onPress={run}
          disabled={loading || !ticker.trim()}
          className="bg-brand rounded-xl py-3.5 items-center"
          style={{ opacity: loading || !ticker.trim() ? 0.5 : 1 }}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-sm font-bold text-white">تحليل بالذكاء الاصطناعي</Text>}
        </Pressable>

        {/* Loading */}
        {loading && <AnalysisLoader variant="analyze" />}

        {/* Error */}
        {error && (
          <View className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <Text className="text-sm text-red-400 text-center">{error}</Text>
          </View>
        )}

        {/* Result */}
        {result && !loading && typeof result === 'object' && (
          <View className="gap-4">
            {/* Score + Verdict */}
            <View
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
              className="border rounded-2xl p-5 flex-row items-center gap-4"
            >
              {typeof result.score === 'number' && (
                <View
                  className="w-16 h-16 rounded-full items-center justify-center border-2"
                  style={{ borderColor: scoreColor(score) }}
                >
                  <Text className="text-xl font-bold tabular-nums" style={{ color: scoreColor(score) }}>
                    {score}
                  </Text>
                </View>
              )}
              <View className="flex-1 gap-2">
                <Text style={{ color: colors.text }} className="text-lg font-bold">{ticker.toUpperCase()}</Text>
                {verdict ? (
                  <View className="self-start px-3 py-1 rounded-lg" style={{ backgroundColor: verdictBg }}>
                    <Text className="text-sm font-bold" style={{ color: verdictColor }}>{verdict}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Price Target */}
            {target != null && (
              <View
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                className="border rounded-xl px-4 py-3 flex-row items-center justify-between"
              >
                <Text style={{ color: colors.textSub }} className="text-sm">السعر المستهدف</Text>
                <Text className="text-sm font-bold text-emerald-400 tabular-nums">{target} EGP</Text>
              </View>
            )}

            {/* Fundamental */}
            {str(result.fundamental) ? (
              <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl p-4 gap-2">
                <Text style={{ color: colors.textMuted }} className="text-xs uppercase tracking-wider">التحليل الأساسي</Text>
                <Text style={{ color: colors.text }} className="text-sm leading-6">{str(result.fundamental)}</Text>
              </View>
            ) : null}

            {/* Technical */}
            {str(result.technical) ? (
              <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl p-4 gap-2">
                <Text style={{ color: colors.textMuted }} className="text-xs uppercase tracking-wider">التحليل الفني</Text>
                <Text style={{ color: colors.text }} className="text-sm leading-6">{str(result.technical)}</Text>
              </View>
            ) : null}

            {/* Strengths / Weaknesses / Risks */}
            {(result.strengths?.length || result.weaknesses?.length || result.risks?.length) ? (
              <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl p-4 gap-3">
                {result.strengths?.map((s, i) => {
                  const text = typeof s === 'string' ? s : String(s ?? '');
                  if (!text) return null;
                  return (
                    <View key={i} className="flex-row gap-2 items-start">
                      <CheckCircle size={14} color="#4ade80" style={{ marginTop: 2 }} />
                      <Text style={{ color: colors.text }} className="flex-1 text-sm leading-5">{text}</Text>
                    </View>
                  );
                })}
                {result.weaknesses?.map((w, i) => {
                  const text = typeof w === 'string' ? w : String(w ?? '');
                  if (!text) return null;
                  return (
                    <View key={i} className="flex-row gap-2 items-start">
                      <XCircle size={14} color="#f87171" style={{ marginTop: 2 }} />
                      <Text style={{ color: colors.text }} className="flex-1 text-sm leading-5">{text}</Text>
                    </View>
                  );
                })}
                {result.risks?.map((r, i) => {
                  const text = typeof r === 'string' ? r : String(r ?? '');
                  if (!text) return null;
                  return (
                    <View key={i} className="flex-row gap-2 items-start">
                      <AlertTriangle size={14} color="#fbbf24" style={{ marginTop: 2 }} />
                      <Text style={{ color: colors.text }} className="flex-1 text-sm leading-5">{text}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {/* Recommendation */}
            {result.recommendation ? (
              <View className="bg-brand/10 border border-brand/25 rounded-2xl px-4 py-3">
                <Text className="text-xs text-[#8b5cf6] font-medium mb-1">التوصية</Text>
                <Text style={{ color: colors.text }} className="text-sm leading-5">{result.recommendation}</Text>
              </View>
            ) : null}

            {/* Disclaimer */}
            {result.disclaimer ? (
              <Text style={{ color: colors.textMuted }} className="text-xs text-center leading-5 px-2">
                ⚖️ {result.disclaimer}
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
