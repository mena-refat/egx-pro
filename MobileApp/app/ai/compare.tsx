import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  ActivityIndicator, I18nManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, GitCompare, Search, Trophy, CheckCircle, XCircle, AlertTriangle } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { AnalysisLoader } from '../../components/shared/AnalysisLoader';
import { EGX_STOCKS, getStockInfo } from '../../lib/egxStocks';
import { useTheme } from '../../hooks/useTheme';
import apiClient from '../../lib/api/client';

interface StockSide {
  ticker?: string;
  name?: string;
  score?: number;
  verdict?: string;
  verdictBadge?: string;
  fundamental?: string | { summary?: string };
  technical?: string | { summary?: string };
  strengths?: string[];
  weaknesses?: string[];
  risks?: string[];
  priceTarget?: number | { target?: number };
}

interface CompareResult {
  winner?: string;
  winnerReason?: string;
  reason?: string;
  summary?: string;
  recommendation?: string;
  stock1?: StockSide;
  stock2?: StockSide;
  ticker1?: StockSide;
  ticker2?: StockSide;
  disclaimer?: string;
}

function scoreColor(s: number) {
  return s >= 65 ? '#4ade80' : s >= 45 ? '#fbbf24' : '#f87171';
}
function str(v: string | { summary?: string } | undefined) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v.summary ?? '';
}

function TickerInput({
  value, onChange, placeholder, disabled,
}: { value: string; onChange: (v: string) => void; placeholder: string; disabled?: boolean }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => {
    const q = value.trim().toUpperCase();
    if (!q) return [];
    return EGX_STOCKS.filter(
      (s) => s.ticker.includes(q) || s.nameAr.includes(value.trim()) || s.nameEn.toUpperCase().includes(q),
    ).slice(0, 5);
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

function StockCard({ side, label, isWinner }: { side: StockSide; label: string; isWinner: boolean }) {
  const { colors } = useTheme();
  const score = side.score ?? 0;
  const verdict = side.verdictBadge ?? side.verdict ?? '';
  const isBuy = verdict.includes('شراء');
  const isSell = verdict.includes('بيع');
  const verdictColor = isBuy ? '#4ade80' : isSell ? '#f87171' : '#fbbf24';

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: isWinner ? '#8b5cf640' : colors.border,
        flex: 1,
      }}
      className="rounded-2xl p-4 gap-3 border"
    >
      {isWinner && (
        <View className="bg-brand/15 rounded-lg px-2 py-1 self-start flex-row items-center gap-1">
          <Trophy size={11} color="#8b5cf6" />
          <Text className="text-xs font-bold text-brand">الأفضل</Text>
        </View>
      )}
      <View className="items-center gap-2">
        <Text style={{ color: colors.text }} className="text-base font-bold">{label}</Text>
        {typeof side.score === 'number' && (
          <View className="w-12 h-12 rounded-full items-center justify-center border-2" style={{ borderColor: scoreColor(score) }}>
            <Text className="text-base font-bold" style={{ color: scoreColor(score) }}>{score}</Text>
          </View>
        )}
        {verdict ? (
          <View className="px-2 py-1 rounded-lg" style={{ backgroundColor: `${verdictColor}18` }}>
            <Text className="text-xs font-bold" style={{ color: verdictColor }}>{verdict}</Text>
          </View>
        ) : null}
      </View>
      {str(side.fundamental) ? (
        <Text style={{ color: colors.textSub }} className="text-xs leading-5" numberOfLines={3}>{str(side.fundamental)}</Text>
      ) : null}
      <View className="gap-1">
        {side.strengths?.slice(0, 2).map((s, i) => {
          const t = typeof s === 'string' ? s : String(s ?? ''); if (!t) return null;
          return (<View key={i} className="flex-row gap-1.5 items-start"><CheckCircle size={11} color="#4ade80" style={{ marginTop: 2 }} /><Text style={{ color: colors.text }} className="flex-1 text-xs leading-4">{t}</Text></View>);
        })}
        {side.weaknesses?.slice(0, 2).map((w, i) => {
          const t = typeof w === 'string' ? w : String(w ?? ''); if (!t) return null;
          return (<View key={i} className="flex-row gap-1.5 items-start"><XCircle size={11} color="#f87171" style={{ marginTop: 2 }} /><Text style={{ color: colors.text }} className="flex-1 text-xs leading-4">{t}</Text></View>);
        })}
        {side.risks?.slice(0, 1).map((r, i) => {
          const t = typeof r === 'string' ? r : String(r ?? ''); if (!t) return null;
          return (<View key={i} className="flex-row gap-1.5 items-start"><AlertTriangle size={11} color="#fbbf24" style={{ marginTop: 2 }} /><Text style={{ color: colors.text }} className="flex-1 text-xs leading-4">{t}</Text></View>);
        })}
      </View>
    </View>
  );
}

export default function ComparePage() {
  const router = useRouter();
  const { colors } = useTheme();
  const [t1, setT1] = useState('');
  const [t2, setT2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);

  const run = async () => {
    const a = t1.trim().toUpperCase();
    const b = t2.trim().toUpperCase();
    if (!a || !b) { setError('أدخل رمزَي السهمين أولاً'); return; }
    if (!getStockInfo(a)) { setError(`رمز ${a} غير موجود`); return; }
    if (!getStockInfo(b)) { setError(`رمز ${b} غير موجود`); return; }
    if (a === b) { setError('اختر سهمين مختلفين'); return; }

    setError(null); setResult(null); setLoading(true);
    try {
      const res = await apiClient.post('/api/analysis/compare', { ticker1: a, ticker2: b }, { timeout: 120_000 });
      const data =
        (res.data as { data?: { comparison?: CompareResult } })?.data?.comparison ??
        (res.data as { comparison?: CompareResult })?.comparison ??
        res.data;
      if (data) setResult(data as CompareResult);
      else setError('لم يتم استلام نتيجة المقارنة');
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (code === 'ANALYSIS_LIMIT_REACHED') setError('وصلت للحد الشهري من التحليلات');
      else if (code === 'SAME_STOCK_COMPARE') setError('اختر سهمين مختلفين');
      else if (code === 'UNAUTHORIZED' || status === 401) setError('انتهت الجلسة — سجّل دخولك مرة أخرى');
      else if ((err as { error?: string })?.error === 'NETWORK_ERROR') setError('لا يوجد اتصال');
      else setError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const s1 = result?.stock1 ?? result?.ticker1;
  const s2 = result?.stock2 ?? result?.ticker2;
  const winnerUpper = result?.winner?.toUpperCase() ?? '';
  const is1Winner = !!winnerUpper && (winnerUpper.includes(t1.toUpperCase()) || winnerUpper.includes(s1?.ticker ?? ''));
  const is2Winner = !!winnerUpper && (winnerUpper.includes(t2.toUpperCase()) || winnerUpper.includes(s2?.ticker ?? ''));

  return (
    <ScreenWrapper padded={false}>
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
        <View className="w-8 h-8 rounded-xl bg-blue-500/15 items-center justify-center">
          <GitCompare size={16} color="#3b82f6" />
        </View>
        <Text style={{ color: colors.text }} className="text-base font-bold">مقارنة سهمين</Text>
      </View>

      <ScrollView contentContainerClassName="px-4 pt-4 pb-10 gap-4" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TickerInput value={t1} onChange={setT1} placeholder="السهم الأول (مثال: COMI)" disabled={loading} />
        <TickerInput value={t2} onChange={setT2} placeholder="السهم الثاني (مثال: ETEL)" disabled={loading} />

        <Pressable
          onPress={run}
          disabled={loading || !t1.trim() || !t2.trim()}
          className="bg-blue-500 rounded-xl py-3.5 items-center"
          style={{ opacity: loading || !t1.trim() || !t2.trim() ? 0.5 : 1 }}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-sm font-bold text-white">مقارنة بالذكاء الاصطناعي</Text>}
        </Pressable>

        {loading && <AnalysisLoader variant="compare" />}

        {error && (
          <View className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <Text className="text-sm text-red-400 text-center">{error}</Text>
          </View>
        )}

        {result && !loading && (
          <View className="gap-4">
            {/* Winner Banner */}
            {result.winner && (
              <View className="bg-brand/10 border border-brand/25 rounded-2xl px-4 py-3 flex-row items-center gap-3">
                <Trophy size={20} color="#8b5cf6" />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-brand">الفائز: {result.winner}</Text>
                  {(result.winnerReason ?? result.reason) ? (
                    <Text style={{ color: colors.textSub }} className="text-xs mt-0.5 leading-4">{result.winnerReason ?? result.reason}</Text>
                  ) : null}
                </View>
              </View>
            )}

            {/* Summary */}
            {result.summary ? (
              <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl px-4 py-3">
                <Text style={{ color: colors.text }} className="text-sm leading-6">{result.summary}</Text>
              </View>
            ) : null}

            {/* Recommendation */}
            {result.recommendation ? (
              <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl px-4 py-3">
                <Text style={{ color: colors.textMuted }} className="text-xs mb-1">💡 التوصية</Text>
                <Text style={{ color: colors.text }} className="text-sm leading-5">{result.recommendation}</Text>
              </View>
            ) : null}

            {/* Side-by-side cards */}
            {s1 && s2 && (
              <View className="flex-row gap-3">
                <StockCard side={s1} label={s1.ticker ?? t1.toUpperCase()} isWinner={is1Winner} />
                <StockCard side={s2} label={s2.ticker ?? t2.toUpperCase()} isWinner={is2Winner} />
              </View>
            )}

            {result.disclaimer ? (
              <Text style={{ color: colors.textMuted }} className="text-xs text-center leading-5 px-2">⚖️ {result.disclaimer}</Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
