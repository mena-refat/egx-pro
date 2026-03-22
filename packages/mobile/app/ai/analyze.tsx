import { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  ActivityIndicator,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, ArrowRight, Brain, Search,
  TrendingUp, TrendingDown, Minus,
  Target, Clock, Calendar, CalendarDays,
  AlertTriangle, ChevronDown, ChevronUp, Shield,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { AnalysisLoader } from '../../components/shared/AnalysisLoader';
import { EGX_STOCKS, getStockInfo } from '../../lib/egxStocks';
import { useTheme } from '../../hooks/useTheme';
import apiClient from '../../lib/api/client';
import { useAuthStore } from '../../store/authStore';
import { tw } from '../../lib/tw';

// ─────────────────────── types ───────────────────────
interface OutlookData {
  outlook: string;
  title: string;
  summary: string;
  reasons: string[];
  action: string;
}

interface AnalysisResult {
  summary?: string;
  verdictBadge?: string;
  verdict?: string;
  confidenceScore?: number;
  confidenceReason?: string;
  score?: number; // legacy

  priceTarget?: {
    current?: number;
    targetLow?: number;
    targetBase?: number;
    targetHigh?: number;
    stopLoss?: number;
    potentialUpside?: string;
    potentialDownside?: string;
    // legacy single target
    target?: number;
  };

  fundamental?: {
    score: number;
    highlights?: string[];
    keyRatios?: Record<string, { value: string; explain: string }>;
    // legacy
    summary?: string;
    outlook?: string;
    ratios?: string;
  } | string;

  technical?: {
    score: number;
    trend?: string;
    highlights?: string[];
    keyIndicators?: Record<string, { value: string; explain: string }>;
    support?: number;
    resistance?: number;
    // legacy
    summary?: string;
    signal?: string;
    indicators?: string;
    levels?: string;
  } | string;

  shortTerm?: OutlookData;
  mediumTerm?: OutlookData;
  longTerm?: OutlookData;
  shortTermOutlook?: string; // legacy
  mediumTermOutlook?: string;
  longTermOutlook?: string;

  sentiment?: { overall: string; explain: string; smartMoney?: string; news?: string } | string;

  risks?: Array<{ risk: string; severity: string; explain?: string }>;
  strengths?: string[]; // legacy
  weaknesses?: string[];

  recommendation?: string;
  suitability?: string;
  disclaimer?: string;
  mode?: string;
  proAnalysis?: {
    wavePosition?: string;
    fibonacciKey?: string;
    volumeProfile?: string;
    stopLossMethod?: string;
    fairValueMethod?: string;
    sectorRelativeStrength?: string;
  };
}

// ─────────────────────── helpers ───────────────────────
function scoreColor(s: number) {
  return s >= 70 ? '#4ade80' : s >= 40 ? '#fbbf24' : '#f87171';
}

function normFundamental(f: AnalysisResult['fundamental']): { score: number; highlights: string[]; keyRatios?: Record<string, { value: string; explain: string }> } | null {
  if (!f) return null;
  if (typeof f === 'string') return { score: 50, highlights: f ? [f] : [] };
  const obj = f as Record<string, unknown>;
  if (typeof obj.score !== 'number') {
    const old = obj as { outlook?: string; ratios?: string; verdict?: string };
    return {
      score: old.verdict === 'قوي' ? 75 : old.verdict === 'ضعيف' ? 30 : 50,
      highlights: [old.outlook, old.ratios].filter(Boolean) as string[],
    };
  }
  const typed = f as { score: number; highlights?: string[]; keyRatios?: Record<string, { value: string; explain: string }> };
  if (!typed.score && !typed.highlights?.length) return null;
  return typed as { score: number; highlights: string[]; keyRatios?: Record<string, { value: string; explain: string }> };
}

function normTechnical(t: AnalysisResult['technical']): { score: number; trend?: string; highlights: string[]; support?: number; resistance?: number; keyIndicators?: Record<string, { value: string; explain: string }> } | null {
  if (!t) return null;
  if (typeof t === 'string') return { score: 50, highlights: t ? [t] : [] };
  const obj = t as Record<string, unknown>;
  if (typeof obj.score !== 'number') {
    const old = obj as { signal?: string; indicators?: string; levels?: string };
    return {
      score: old.signal?.includes('صاعد') ? 70 : old.signal?.includes('هابط') ? 30 : 50,
      trend: old.signal,
      highlights: [old.indicators, old.levels].filter(Boolean) as string[],
    };
  }
  const typed = t as { score: number; trend?: string; highlights?: string[]; support?: number; resistance?: number };
  if (!typed.score && !typed.highlights?.length) return null;
  return typed as { score: number; trend?: string; highlights: string[]; support?: number; resistance?: number };
}

function inferOutlook(text: string): string {
  if (!text) return 'محايد';
  const pos = ['صاعد', 'إيجابي', 'ارتفاع', 'شراء', 'فرصة', 'نمو'];
  const neg = ['هابط', 'سلبي', 'انخفاض', 'بيع', 'خطر', 'تراجع'];
  const p = pos.filter((w) => text.includes(w)).length;
  const n = neg.filter((w) => text.includes(w)).length;
  if (p > n + 1) return 'إيجابي';
  if (n > p + 1) return 'سلبي';
  return 'محايد';
}

function makeOutlook(term: OutlookData | undefined, oldText: string | undefined): OutlookData | null {
  if (term) return term;
  if (!oldText) return null;
  return { outlook: inferOutlook(oldText), title: oldText.slice(0, 60) + (oldText.length > 60 ? '...' : ''), summary: oldText, reasons: [], action: '' };
}

// ─────────────────────── ScoreGauge ───────────────────────
function ScoreGauge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' }) {
  const color = scoreColor(score);
  const r = size === 'sm' ? 22 : 34;
  const stroke = size === 'sm' ? 4 : 5;
  const dim = (r + stroke) * 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  return (
    <View style={{ width: dim, height: dim, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={dim} height={dim} style={{ position: 'absolute' }}>
        <Circle cx={r + stroke} cy={r + stroke} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={r + stroke} cy={r + stroke} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90, ${r + stroke}, ${r + stroke})`}
        />
      </Svg>
      <Text style={{ color, fontWeight: '700', fontSize: size === 'sm' ? 11 : 16 }}>{score}</Text>
    </View>
  );
}

// ─────────────────────── VerdictBadge ───────────────────────
function VerdictBadge({ verdict }: { verdict: string }) {
  const isBuy = verdict.includes('شراء');
  const isSell = verdict.includes('بيع');
  const color = isBuy ? '#4ade80' : isSell ? '#f87171' : '#fbbf24';
  const bg = isBuy ? '#4ade8018' : isSell ? '#f8717118' : '#fbbf2418';
  const Icon = isBuy ? TrendingUp : isSell ? TrendingDown : Minus;
  return (
    <View style={{ backgroundColor: bg, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
      <Icon size={13} color={color} />
      <Text style={{ color, fontWeight: '700', fontSize: 13 }}>{verdict}</Text>
    </View>
  );
}

// ─────────────────────── OutlookCard ───────────────────────
function OutlookCard({ data, icon: Icon, label, iconColor, iconBg }: {
  data: OutlookData;
  icon: typeof Clock;
  label: string;
  iconColor: string;
  iconBg: string;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const outlookColor = data.outlook === 'إيجابي' ? '#4ade80' : data.outlook === 'سلبي' ? '#f87171' : '#fbbf24';
  const outlookBg = data.outlook === 'إيجابي' ? '#4ade8015' : data.outlook === 'سلبي' ? '#f8717115' : '#fbbf2415';
  return (
    <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, overflow: 'hidden' }}>
      <Pressable
        onPress={() => setOpen(!open)}
        style={({ pressed }) => ({ backgroundColor: pressed ? colors.hover : 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={15} color={iconColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textMuted, fontSize: 10, marginBottom: 2 }}>{label}</Text>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
              {data.title || data.summary?.slice(0, 55)}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ backgroundColor: outlookBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
            <Text style={{ color: outlookColor, fontSize: 11, fontWeight: '600' }}>{data.outlook}</Text>
          </View>
          {open ? <ChevronUp size={14} color={colors.textMuted} /> : <ChevronDown size={14} color={colors.textMuted} />}
        </View>
      </Pressable>
      {open && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
          {data.summary && data.summary.length > 60 && (
            <Text style={{ color: colors.textSub, fontSize: 13, lineHeight: 20 }}>{data.summary}</Text>
          )}
          {data.reasons?.length > 0 && (
            <View style={{ gap: 5 }}>
              {data.reasons.map((r, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                  <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 1 }}>•</Text>
                  <Text style={{ color: colors.text, fontSize: 13, lineHeight: 19, flex: 1 }}>{r}</Text>
                </View>
              ))}
            </View>
          )}
          {!!data.action && (
            <View style={{ backgroundColor: '#8b5cf615', borderRadius: 10, padding: 10, gap: 2 }}>
              <Text style={{ color: '#8b5cf6', fontSize: 11, fontWeight: '600' }}>💡 النصيحة</Text>
              <Text style={{ color: colors.text, fontSize: 13, lineHeight: 19 }}>{data.action}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─────────────────────── AnalysisCard (fundamental / technical) ───────────────────────
function AnalysisCard({ title, data, colors }: {
  title: string;
  data: { score: number; trend?: string; highlights?: string[]; support?: number; resistance?: number; keyRatios?: Record<string, { value: string; explain: string }> };
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, flex: 1, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{title}</Text>
        {data.score > 0 && <ScoreGauge score={data.score} size="sm" />}
      </View>
      {data.trend && (
        <View style={{ backgroundColor: '#8b5cf615', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' }}>
          <Text style={{ color: '#8b5cf6', fontSize: 11, fontWeight: '600' }}>{data.trend}</Text>
        </View>
      )}
      {data.highlights?.map((h, i) => (
        <Text key={i} style={{ color: colors.textSub, fontSize: 12, lineHeight: 18 }}>• {h}</Text>
      ))}
      {data.keyRatios && Object.entries(data.keyRatios).filter(([, v]) => v.value && v.value !== 'غير متاح').slice(0, 4).map(([key, val]) => (
        <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: 11 }}>{key.toUpperCase()}</Text>
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{val.value}</Text>
        </View>
      ))}
      {(data.support != null && data.resistance != null) && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: '#4ade80', fontSize: 11 }}>دعم: {data.support}</Text>
          <Text style={{ color: '#f87171', fontSize: 11 }}>مقاومة: {data.resistance}</Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────── PriceSection ───────────────────────
function PriceSection({ pt, colors }: {
  pt: NonNullable<AnalysisResult['priceTarget']>;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const base = pt.targetBase ?? pt.target ?? 0;
  const high = pt.targetHigh ?? 0;
  const stop = pt.stopLoss ?? 0;
  const current = pt.current ?? 0;

  const items = [
    stop > 0 && { label: 'وقف الخسارة', value: stop, color: '#f87171' },
    current > 0 && { label: 'السعر الحالي', value: current, color: colors.text },
    base > 0 && { label: 'الهدف الأساسي', value: base, color: '#4ade80' },
    high > 0 && { label: 'الهدف الأقصى', value: high, color: '#86efac' },
  ].filter(Boolean) as { label: string; value: number; color: string }[];

  return (
    <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Target size={14} color="#8b5cf6" />
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>الأسعار المستهدفة</Text>
      </View>
      <View style={{ gap: 8 }}>
        {items.map((item) => (
          <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textSub, fontSize: 12 }}>{item.label}</Text>
            <Text style={{ color: item.color, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{item.value} EGP</Text>
          </View>
        ))}
      </View>
      {(pt.potentialUpside || pt.potentialDownside) && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {pt.potentialUpside && (
            <View style={{ backgroundColor: '#4ade8015', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
              <Text style={{ color: '#4ade80', fontSize: 12, fontWeight: '600' }}>↑ {pt.potentialUpside}</Text>
            </View>
          )}
          {pt.potentialDownside && (
            <View style={{ backgroundColor: '#f8717115', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
              <Text style={{ color: '#f87171', fontSize: 12, fontWeight: '600' }}>↓ {pt.potentialDownside}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─────────────────────── TickerInput ───────────────────────
function TickerInput({ value, onChange, placeholder, disabled }: {
  value: string; onChange: (v: string) => void; placeholder: string; disabled?: boolean;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => {
    const q = value.trim().toUpperCase();
    if (!q) return [];
    return EGX_STOCKS.filter((s) => s.ticker.includes(q) || s.nameAr.includes(value.trim()) || s.nameEn.toUpperCase().includes(q)).slice(0, 6);
  }, [value]);

  return (
    <View>
      <View
        style={[
          { backgroundColor: colors.card, borderColor: colors.border },
          tw('flex-row items-center border rounded-xl px-3 gap-2'),
        ]}
      >
        <Search size={15} color={colors.textMuted} />
        <TextInput
          value={value}
          onChangeText={(t) => { onChange(t); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={[{ color: colors.text }, tw('flex-1 py-3 text-sm')]}
          autoCapitalize="characters"
          editable={!disabled}
        />
      </View>
      {open && suggestions.length > 0 && (
        <View
          style={[
            { backgroundColor: colors.card, borderColor: colors.border },
            tw('border rounded-xl mt-1 overflow-hidden'),
          ]}
        >
          {suggestions.map((s) => (
            <Pressable
              key={s.ticker}
              onPress={() => { onChange(s.ticker); setOpen(false); }}
              style={({ pressed }) => ([
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: 1,
                  backgroundColor: pressed ? colors.hover : 'transparent',
                },
                tw('flex-row items-center justify-between px-4 py-3'),
              ])}
            >
              <Text style={[{ color: colors.text }, tw('text-sm font-bold')]}>{s.ticker}</Text>
              <Text style={[{ color: colors.textSub }, tw('text-xs')]}>{s.nameAr}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ─────────────────────── main screen ───────────────────────
export default function AnalyzePage() {
  const router = useRouter();
  const { colors, isRTL } = useTheme();
  const { ticker: prefill } = useLocalSearchParams<{ ticker?: string }>();
  const user = useAuthStore((s) => s.user);
  const hasPaidPlan = user?.plan === 'pro' || user?.plan === 'yearly' || user?.plan === 'ultra' || user?.plan === 'ultra_yearly';
  const [ticker, setTicker] = useState(prefill ?? '');
  const [mode, setMode] = useState<'beginner' | 'professional'>('beginner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const toggleMode = useCallback(() => {
    if (!hasPaidPlan) return;
    setMode((prev) => prev === 'beginner' ? 'professional' : 'beginner');
  }, [hasPaidPlan]);

  const run = async () => {
    const t = ticker.trim().toUpperCase();
    if (!t) { setError('أدخل رمز السهم أولاً'); return; }
    if (!getStockInfo(t)) { setError('رمز السهم غير موجود — اختر من القائمة'); return; }
    setError(null); setResult(null); setLoading(true);
    try {
      const res = await apiClient.post(`/api/analysis/${t}`, { mode }, { timeout: 120_000 });
      const data = (res.data as { analysis?: AnalysisResult })?.analysis ?? res.data;
      if (data) setResult(data as AnalysisResult);
      else setError('لم يتم استلام نتيجة التحليل');
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      const status = (err as { response?: { status?: number } })?.response?.status;
      const net = (err as { error?: string })?.error;
      if (code === 'ANALYSIS_LIMIT_REACHED') setError('وصلت للحد الشهري من التحليلات. جرب الشهر القادم أو ترقّ للباقة Pro.');
      else if (code === 'UNAUTHORIZED' || status === 401) setError('انتهت الجلسة — سجّل دخولك مرة أخرى');
      else if (status === 429) setError('الخدمة مشغولة، حاول بعد دقيقة');
      else if (code === 'ANALYSIS_TIMEOUT' || status === 504 || net === 'REQUEST_TIMEOUT') setError('استغرق التحليل وقتاً طويلاً — حاول مرة أخرى');
      else if (status === 502 || status === 503) setError('خدمة الذكاء الاصطناعي غير متاحة مؤقتاً، حاول بعد قليل');
      else if (net === 'NETWORK_ERROR') setError('لا يوجد اتصال بالإنترنت');
      else setError('حدث خطأ أثناء التحليل، حاول مرة أخرى');
    } finally { setLoading(false); }
  };

  // ── normalise result ──
  const verdict = result?.verdictBadge ?? result?.verdict ?? '';
  const confidence = result?.confidenceScore ?? result?.score ?? 0;
  const fundamental = normFundamental(result?.fundamental);
  const technical = normTechnical(result?.technical);
  const shortTerm = makeOutlook(result?.shortTerm, result?.shortTermOutlook);
  const mediumTerm = makeOutlook(result?.mediumTerm, result?.mediumTermOutlook);
  const longTerm = makeOutlook(result?.longTerm, result?.longTermOutlook);
  const sentiment = typeof result?.sentiment === 'string'
    ? { overall: inferOutlook(result.sentiment), explain: result.sentiment }
    : result?.sentiment;
  const hasOutlook = shortTerm || mediumTerm || longTerm;
  const pt = result?.priceTarget;
  const hasPriceTarget = pt && (pt.targetBase || pt.targetHigh || pt.target || pt.stopLoss);

  return (
    <ScreenWrapper padded={false}>
      {/* Header */}
      <View
        style={[
          { borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: isRTL ? 'row-reverse' : 'row' },
          tw('items-center gap-3 px-4 pt-5 pb-4'),
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
        <View style={tw('w-8 h-8 rounded-xl bg-violet-500/15 items-center justify-center')}>
          <Brain size={16} color="#8b5cf6" />
        </View>
        <Text style={[{ color: colors.text }, tw('text-base font-bold')]}>تحليل سهم</Text>
      </View>

      <ScrollView
        contentContainerStyle={tw('px-4 pt-4 pb-10 gap-4')}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Input */}
        <TickerInput value={ticker} onChange={setTicker} placeholder="ابحث عن رمز السهم (مثال: COMI)" disabled={loading} />

        {/* Mode Toggle — Pro/Ultra only */}
        {hasPaidPlan && (
          <View style={tw('flex-row gap-2')}>
            <Pressable
              onPress={() => setMode('beginner')}
              style={[
                tw('flex-1 py-2.5 rounded-xl items-center border'),
                { backgroundColor: mode === 'beginner' ? '#8b5cf6' : colors.card, borderColor: mode === 'beginner' ? '#8b5cf6' : colors.border },
              ]}
            >
              <Text style={[tw('text-xs font-semibold'), { color: mode === 'beginner' ? '#fff' : colors.textSub }]}>🎓 مبسّط</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('professional')}
              style={[
                tw('flex-1 py-2.5 rounded-xl items-center border'),
                { backgroundColor: mode === 'professional' ? '#8b5cf6' : colors.card, borderColor: mode === 'professional' ? '#8b5cf6' : colors.border },
              ]}
            >
              <Text style={[tw('text-xs font-semibold'), { color: mode === 'professional' ? '#fff' : colors.textSub }]}>📊 احترافي</Text>
            </Pressable>
          </View>
        )}

        {/* Button */}
        <Pressable
          onPress={run}
          disabled={loading || !ticker.trim()}
          style={[
            tw('bg-brand rounded-xl py-3.5 items-center'),
            { opacity: loading || !ticker.trim() ? 0.5 : 1 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={tw('text-sm font-bold text-white')}>تحليل بالذكاء الاصطناعي</Text>
          )}
        </Pressable>

        {/* Loader */}
        {loading && <AnalysisLoader variant="analyze" />}

        {/* Error */}
        {error && (
          <View style={tw('bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3')}>
            <Text style={tw('text-sm text-red-400 text-center')}>{error}</Text>
          </View>
        )}

        {/* ════ Result ════ */}
        {result && !loading && (
          <View style={{ gap: 12 }}>

            {/* ① Summary + Confidence + Verdict */}
            <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
              {confidence > 0 && <ScoreGauge score={confidence} />}
              <View style={{ flex: 1, gap: 8 }}>
                {result.summary ? (
                  <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>{result.summary}</Text>
                ) : null}
                {result.confidenceReason ? (
                  <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>درجة الثقة: {result.confidenceReason}</Text>
                ) : null}
                {verdict ? <VerdictBadge verdict={verdict} /> : null}
              </View>
            </View>

            {/* ② Price Targets */}
            {hasPriceTarget && <PriceSection pt={pt!} colors={colors} />}

            {/* ③ Fundamental + Technical (side by side) */}
            {(fundamental || technical) && (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {fundamental && <AnalysisCard title="📊 الأساسي" data={fundamental} colors={colors} />}
                {technical && <AnalysisCard title="📈 الفني" data={technical} colors={colors} />}
              </View>
            )}

            {/* ④ Outlook cards */}
            {hasOutlook && (
              <View style={{ gap: 8 }}>
                <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 }}>التوقعات</Text>
                {shortTerm && <OutlookCard data={shortTerm} icon={Clock} label="قصير المدى (أيام–أسابيع)" iconColor="#38bdf8" iconBg="#38bdf815" />}
                {mediumTerm && <OutlookCard data={mediumTerm} icon={Calendar} label="متوسط المدى (أشهر)" iconColor="#a78bfa" iconBg="#a78bfa15" />}
                {longTerm && <OutlookCard data={longTerm} icon={CalendarDays} label="طويل المدى (سنين)" iconColor="#4ade80" iconBg="#4ade8015" />}
              </View>
            )}

            {/* ⑤ Risks */}
            {result.risks && result.risks.length > 0 && (
              <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} color="#fbbf24" />
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>المخاطر</Text>
                </View>
                {result.risks.map((r, i) => {
                  const sevColor = r.severity === 'عالي' ? '#f87171' : r.severity === 'متوسط' ? '#fbbf24' : '#4ade80';
                  const sevBg = r.severity === 'عالي' ? '#f8717115' : r.severity === 'متوسط' ? '#fbbf2415' : '#4ade8015';
                  return (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <View style={{ backgroundColor: sevBg, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, marginTop: 1 }}>
                        <Text style={{ color: sevColor, fontSize: 10, fontWeight: '700' }}>{r.severity}</Text>
                      </View>
                      <Text style={{ color: colors.textSub, fontSize: 13, lineHeight: 19, flex: 1 }}>
                        {r.risk}{r.explain ? ` — ${r.explain}` : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Legacy strengths / weaknesses */}
            {(!result.risks?.length && (result.strengths?.length || result.weaknesses?.length)) && (
              <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 }}>
                {result.strengths?.map((s, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <TrendingUp size={13} color="#4ade80" style={{ marginTop: 2 }} />
                    <Text style={{ color: colors.text, fontSize: 13, lineHeight: 19, flex: 1 }}>{typeof s === 'string' ? s : ''}</Text>
                  </View>
                ))}
                {result.weaknesses?.map((w, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <TrendingDown size={13} color="#f87171" style={{ marginTop: 2 }} />
                    <Text style={{ color: colors.text, fontSize: 13, lineHeight: 19, flex: 1 }}>{typeof w === 'string' ? w : ''}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ⑥ Sentiment */}
            {sentiment?.explain && (
              <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14 }}>
                <Text style={{ color: colors.text, fontSize: 13, lineHeight: 20 }}>
                  <Text style={{ fontWeight: '700' }}>مزاج السوق: </Text>
                  {sentiment.explain}
                </Text>
              </View>
            )}

            {/* ⑦ Recommendation / Suitability */}
            {(result.recommendation || result.suitability) && (
              <View style={{ backgroundColor: '#8b5cf610', borderColor: '#8b5cf630', borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 }}>
                <Text style={{ color: '#8b5cf6', fontSize: 11, fontWeight: '700' }}>💡 التوصية</Text>
                {result.recommendation && <Text style={{ color: colors.text, fontSize: 13, lineHeight: 20 }}>{result.recommendation}</Text>}
                {result.suitability && <Text style={{ color: colors.textSub, fontSize: 12, lineHeight: 18 }}>{result.suitability}</Text>}
              </View>
            )}

            {/* ⑧ Pro Analysis */}
            {result.proAnalysis && Object.values(result.proAnalysis).some(Boolean) && (
              <View style={{ backgroundColor: '#0ea5e910', borderColor: '#0ea5e930', borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 }}>
                <Text style={{ color: '#0ea5e9', fontSize: 11, fontWeight: '700' }}>📐 تحليل احترافي متقدم</Text>
                {result.proAnalysis.wavePosition && (
                  <Text style={{ color: colors.text, fontSize: 12, lineHeight: 18 }}>
                    <Text style={{ fontWeight: '700' }}>🌊 Elliott: </Text>{result.proAnalysis.wavePosition}
                  </Text>
                )}
                {result.proAnalysis.fibonacciKey && (
                  <Text style={{ color: colors.text, fontSize: 12, lineHeight: 18 }}>
                    <Text style={{ fontWeight: '700' }}>📏 Fibonacci: </Text>{result.proAnalysis.fibonacciKey}
                  </Text>
                )}
                {result.proAnalysis.volumeProfile && (
                  <Text style={{ color: colors.text, fontSize: 12, lineHeight: 18 }}>
                    <Text style={{ fontWeight: '700' }}>📦 حجم: </Text>{result.proAnalysis.volumeProfile}
                  </Text>
                )}
                {result.proAnalysis.stopLossMethod && (
                  <Text style={{ color: colors.text, fontSize: 12, lineHeight: 18 }}>
                    <Text style={{ fontWeight: '700' }}>🛡 وقف الخسارة: </Text>{result.proAnalysis.stopLossMethod}
                  </Text>
                )}
                {result.proAnalysis.sectorRelativeStrength && (
                  <Text style={{ color: colors.text, fontSize: 12, lineHeight: 18 }}>
                    <Text style={{ fontWeight: '700' }}>🏭 قطاع: </Text>{result.proAnalysis.sectorRelativeStrength}
                  </Text>
                )}
              </View>
            )}

            {/* ⑨ Disclaimer */}
            {result.disclaimer && (
              <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Shield size={12} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>إخلاء مسؤولية</Text>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>{result.disclaimer}</Text>
              </View>
            )}

          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
