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

function StockCard({ side, label, isWinner }: { side: StockSide; label: string; isWinner: boolean }) {
  const score = side.score ?? 0;
  const verdict = side.verdictBadge ?? side.verdict ?? '';
  const isBuy = verdict.includes('شراء');
  const isSell = verdict.includes('بيع');
  const verdictColor = isBuy ? '#4ade80' : isSell ? '#f87171' : '#fbbf24';

  return (
    <View className={`flex-1 bg-[#161b22] rounded-2xl p-4 gap-3 border ${isWinner ? 'border-brand/40' : 'border-[#30363d]'}`}>
      {isWinner && (
        <View className="bg-brand/15 rounded-lg px-2 py-1 self-start flex-row items-center gap-1">
          <Trophy size={11} color="#8b5cf6" />
          <Text className="text-xs font-bold text-brand">الأفضل</Text>
        </View>
      )}
      <View className="items-center gap-2">
        <Text className="text-base font-bold text-[#e6edf3]">{label}</Text>
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
        <Text className="text-xs text-[#8b949e] leading-5" numberOfLines={3}>{str(side.fundamental)}</Text>
      ) : null}
      <View className="gap-1">
        {side.strengths?.slice(0, 2).map((s, i) => (
          <View key={i} className="flex-row gap-1.5 items-start">
            <CheckCircle size={11} color="#4ade80" style={{ marginTop: 2 }} />
            <Text className="flex-1 text-xs text-[#e6edf3] leading-4">{s}</Text>
          </View>
        ))}
        {side.weaknesses?.slice(0, 2).map((w, i) => (
          <View key={i} className="flex-row gap-1.5 items-start">
            <XCircle size={11} color="#f87171" style={{ marginTop: 2 }} />
            <Text className="flex-1 text-xs text-[#e6edf3] leading-4">{w}</Text>
          </View>
        ))}
        {side.risks?.slice(0, 1).map((r, i) => (
          <View key={i} className="flex-row gap-1.5 items-start">
            <AlertTriangle size={11} color="#fbbf24" style={{ marginTop: 2 }} />
            <Text className="flex-1 text-xs text-[#e6edf3] leading-4">{r}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ComparePage() {
  const router = useRouter();
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
      if (code === 'ANALYSIS_LIMIT_REACHED') setError('وصلت للحد الشهري من التحليلات');
      else if (code === 'SAME_STOCK_COMPARE') setError('اختر سهمين مختلفين');
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
      <View className="flex-row items-center gap-3 px-4 pt-5 pb-4 border-b border-[#30363d]">
        <Pressable onPress={() => router.back()} className="w-9 h-9 rounded-xl bg-white/[0.04] border border-[#30363d] items-center justify-center">
          {I18nManager.isRTL ? <ArrowRight size={16} color="#8b949e" /> : <ArrowLeft size={16} color="#8b949e" />}
        </Pressable>
        <View className="w-8 h-8 rounded-xl bg-blue-500/15 items-center justify-center">
          <GitCompare size={16} color="#3b82f6" />
        </View>
        <Text className="text-base font-bold text-[#e6edf3]">مقارنة سهمين</Text>
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
                    <Text className="text-xs text-[#8b949e] mt-0.5 leading-4">{result.winnerReason ?? result.reason}</Text>
                  ) : null}
                </View>
              </View>
            )}

            {/* Summary */}
            {result.summary ? (
              <View className="bg-[#161b22] border border-[#30363d] rounded-2xl px-4 py-3">
                <Text className="text-sm text-[#e6edf3] leading-6">{result.summary}</Text>
              </View>
            ) : null}

            {/* Recommendation */}
            {result.recommendation ? (
              <View className="bg-[#161b22] border border-[#30363d] rounded-2xl px-4 py-3">
                <Text className="text-xs text-[#656d76] mb-1">💡 التوصية</Text>
                <Text className="text-sm text-[#e6edf3] leading-5">{result.recommendation}</Text>
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
              <Text className="text-xs text-[#656d76] text-center leading-5 px-2">⚖️ {result.disclaimer}</Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
