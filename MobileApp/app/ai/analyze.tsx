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
      <View className="flex-row items-center bg-[#161b22] border border-[#30363d] rounded-xl px-3 gap-2">
        <Search size={15} color="#656d76" />
        <TextInput
          value={value}
          onChangeText={(t) => { onChange(t); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          placeholderTextColor="#656d76"
          className="flex-1 py-3 text-sm text-[#e6edf3]"
          autoCapitalize="characters"
          editable={!disabled}
        />
      </View>
      {open && suggestions.length > 0 && (
        <View className="bg-[#161b22] border border-[#30363d] rounded-xl mt-1 overflow-hidden">
          {suggestions.map((s) => (
            <Pressable
              key={s.ticker}
              onPress={() => { onChange(s.ticker); setOpen(false); }}
              className="flex-row items-center justify-between px-4 py-3 border-b border-[#21262d] active:bg-[#1c2128]"
            >
              <Text className="text-sm font-bold text-[#e6edf3]">{s.ticker}</Text>
              <Text className="text-xs text-[#8b949e]">{s.nameAr}</Text>
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
      const data =
        (res.data as { data?: { analysis?: AnalysisResult }; analysis?: AnalysisResult })
          ?.data?.analysis ??
        (res.data as { analysis?: AnalysisResult })?.analysis ??
        res.data;
      if (data) setResult(data as AnalysisResult);
      else setError('لم يتم استلام نتيجة التحليل');
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (code === 'ANALYSIS_LIMIT_REACHED') setError('وصلت للحد الشهري من التحليلات. جرب الشهر القادم أو ترقّ للباقة Pro.');
      else if (status === 429) setError('الخدمة مشغولة حالياً، حاول بعد دقيقة');
      else if ((err as { error?: string })?.error === 'NETWORK_ERROR') setError('لا يوجد اتصال بالإنترنت');
      else setError('حدث خطأ أثناء التحليل، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const verdict = result?.verdictBadge ?? result?.verdict ?? '';
  const isBuy = verdict.includes('شراء');
  const isSell = verdict.includes('بيع');
  const verdictColor = isBuy ? '#4ade80' : isSell ? '#f87171' : '#fbbf24';
  const verdictBg = isBuy ? 'bg-emerald-500/10' : isSell ? 'bg-red-500/10' : 'bg-amber-500/10';
  const score = result?.score ?? 0;
  const target = priceTargetNum(result?.priceTarget);

  return (
    <ScreenWrapper padded={false}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 pt-5 pb-4 border-b border-[#30363d]">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white/[0.04] border border-[#30363d] items-center justify-center"
        >
          {I18nManager.isRTL ? <ArrowRight size={16} color="#8b949e" /> : <ArrowLeft size={16} color="#8b949e" />}
        </Pressable>
        <View className="w-8 h-8 rounded-xl bg-violet-500/15 items-center justify-center">
          <Brain size={16} color="#8b5cf6" />
        </View>
        <Text className="text-base font-bold text-[#e6edf3]">تحليل سهم</Text>
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
        {result && !loading && (
          <View className="gap-4">
            {/* Score + Verdict */}
            <View className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 flex-row items-center gap-4">
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
                <Text className="text-lg font-bold text-[#e6edf3]">{ticker.toUpperCase()}</Text>
                {verdict ? (
                  <View className={`self-start px-3 py-1 rounded-lg ${verdictBg}`}>
                    <Text className="text-sm font-bold" style={{ color: verdictColor }}>{verdict}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Price Target */}
            {target != null && (
              <View className="bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-3 flex-row items-center justify-between">
                <Text className="text-sm text-[#8b949e]">السعر المستهدف</Text>
                <Text className="text-sm font-bold text-emerald-400 tabular-nums">{target} EGP</Text>
              </View>
            )}

            {/* Fundamental */}
            {str(result.fundamental) ? (
              <View className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 gap-2">
                <Text className="text-xs text-[#656d76] uppercase tracking-wider">التحليل الأساسي</Text>
                <Text className="text-sm text-[#e6edf3] leading-6">{str(result.fundamental)}</Text>
              </View>
            ) : null}

            {/* Technical */}
            {str(result.technical) ? (
              <View className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 gap-2">
                <Text className="text-xs text-[#656d76] uppercase tracking-wider">التحليل الفني</Text>
                <Text className="text-sm text-[#e6edf3] leading-6">{str(result.technical)}</Text>
              </View>
            ) : null}

            {/* Strengths / Weaknesses / Risks */}
            {(result.strengths?.length || result.weaknesses?.length || result.risks?.length) ? (
              <View className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 gap-3">
                {result.strengths?.map((s, i) => (
                  <View key={i} className="flex-row gap-2 items-start">
                    <CheckCircle size={14} color="#4ade80" style={{ marginTop: 2 }} />
                    <Text className="flex-1 text-sm text-[#e6edf3] leading-5">{s}</Text>
                  </View>
                ))}
                {result.weaknesses?.map((w, i) => (
                  <View key={i} className="flex-row gap-2 items-start">
                    <XCircle size={14} color="#f87171" style={{ marginTop: 2 }} />
                    <Text className="flex-1 text-sm text-[#e6edf3] leading-5">{w}</Text>
                  </View>
                ))}
                {result.risks?.map((r, i) => (
                  <View key={i} className="flex-row gap-2 items-start">
                    <AlertTriangle size={14} color="#fbbf24" style={{ marginTop: 2 }} />
                    <Text className="flex-1 text-sm text-[#e6edf3] leading-5">{r}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Recommendation */}
            {result.recommendation ? (
              <View className="bg-brand/10 border border-brand/25 rounded-2xl px-4 py-3">
                <Text className="text-xs text-[#8b5cf6] font-medium mb-1">التوصية</Text>
                <Text className="text-sm text-[#e6edf3] leading-5">{result.recommendation}</Text>
              </View>
            ) : null}

            {/* Disclaimer */}
            {result.disclaimer ? (
              <Text className="text-xs text-[#656d76] text-center leading-5 px-2">
                ⚖️ {result.disclaimer}
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
