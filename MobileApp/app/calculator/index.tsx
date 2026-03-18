import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, I18nManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Calculator, Wallet, TrendingUp, Crown, Trophy } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';

const RETURN_OPTIONS = [
  { id: 'conservative' as const, label: 'محافظ', rate: 15 },
  { id: 'moderate'    as const, label: 'متوازن', rate: 25 },
  { id: 'optimistic'  as const, label: 'متفائل', rate: 40 },
];
const YEAR_PRESETS = [5, 10, 20, 30];

function calculate(monthly: number, initial: number, years: number, annualRate: number) {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  const initialGrowth = initial * Math.pow(1 + r, n);
  const monthlyGrowth = r === 0 ? monthly * n : monthly * ((Math.pow(1 + r, n) - 1) / r);
  const total = initialGrowth + monthlyGrowth;
  const invested = initial + monthly * n;
  return { total, invested, profit: total - invested };
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} م`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)} ألف`;
  return Math.round(n).toLocaleString('ar-EG');
}

function fmtFull(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString('ar-EG');
}

function NumInput({
  label, value, onChange, hint,
}: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm text-[#8b949e]">{label}</Text>
      <View className="flex-row items-center bg-[#161b22] border border-[#30363d] rounded-xl px-3 gap-2">
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor="#656d76"
          className="flex-1 py-3 text-sm text-[#e6edf3]"
          textAlign="right"
        />
        <Text className="text-xs text-[#656d76]">ج.م</Text>
      </View>
      {hint ? <Text className="text-xs text-[#656d76]">{hint}</Text> : null}
    </View>
  );
}

export default function CalculatorPage() {
  const router = useRouter();

  const [monthly,  setMonthly ] = useState('5000');
  const [initial,  setInitial ] = useState('0');
  const [years,    setYears   ] = useState(10);
  const [returnId, setReturnId] = useState<'conservative' | 'moderate' | 'optimistic'>('moderate');

  const m = Math.max(0, Number(monthly)  || 0);
  const i = Math.max(0, Number(initial)  || 0);
  const annualRate = RETURN_OPTIONS.find((o) => o.id === returnId)!.rate;

  const result      = useMemo(() => calculate(m, i, years, annualRate), [m, i, years, annualRate]);
  const compareBank = useMemo(() => calculate(m, i, years, 8),          [m, i, years]);
  const compareGold = useMemo(() => calculate(m, i, years, 12),         [m, i, years]);

  const motivational =
    result.total < 500_000  ? 'كل رحلة تبدأ بخطوة 🌱'
    : result.total < 2_000_000 ? 'أنت في الطريق الصحيح! 🚀'
    : result.total < 10_000_000 ? 'مليونير قادم 💰'
    : 'ثروة حقيقية تنتظرك 👑';

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
        <View className="w-8 h-8 rounded-xl bg-emerald-500/15 items-center justify-center">
          <Calculator size={16} color="#10b981" />
        </View>
        <Text className="text-base font-bold text-[#e6edf3]">حاسبة الاستثمار</Text>
      </View>

      <ScrollView
        contentContainerClassName="px-4 pt-4 pb-10 gap-4"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Intro */}
        <View className="bg-[#161b22] border border-[#30363d] rounded-2xl px-4 py-3 flex-row items-center gap-3">
          <TrendingUp size={18} color="#10b981" />
          <Text className="flex-1 text-xs text-[#8b949e] leading-5">
            احسب كيف ينمو استثمارك في البورصة المصرية مع الوقت — أدخل بياناتك واستكشف السيناريوهات المختلفة.
          </Text>
        </View>

        {/* Inputs */}
        <View className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 gap-4">
          <NumInput
            label="الاستثمار الشهري"
            value={monthly}
            onChange={setMonthly}
            hint="المبلغ الذي تستثمره كل شهر"
          />
          <NumInput
            label="رأس المال الابتدائي"
            value={initial}
            onChange={setInitial}
            hint="المبلغ الذي تبدأ به (اختياري)"
          />

          {/* Years */}
          <View className="gap-1.5">
            <Text className="text-sm text-[#8b949e]">مدة الاستثمار</Text>
            <View className="flex-row gap-2 flex-wrap">
              {YEAR_PRESETS.map((y) => (
                <Pressable
                  key={y}
                  onPress={() => setYears(y)}
                  className="flex-1 py-2.5 rounded-xl items-center border"
                  style={{
                    backgroundColor: years === y ? '#10b981' : '#21262d',
                    borderColor:     years === y ? '#10b981' : '#30363d',
                    minWidth: 60,
                  }}
                >
                  <Text
                    className="text-sm font-bold"
                    style={{ color: years === y ? '#fff' : '#8b949e' }}
                  >
                    {y} س
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Rate scenario */}
          <View className="gap-1.5">
            <Text className="text-sm text-[#8b949e]">سيناريو العائد السنوي</Text>
            <View className="flex-row gap-2">
              {RETURN_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => setReturnId(opt.id)}
                  className="flex-1 py-3 rounded-xl items-center border"
                  style={{
                    backgroundColor: returnId === opt.id ? '#8b5cf6' : '#21262d',
                    borderColor:     returnId === opt.id ? '#8b5cf6' : '#30363d',
                  }}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{ color: returnId === opt.id ? '#fff' : '#8b949e' }}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    className="text-base font-bold"
                    style={{ color: returnId === opt.id ? '#fff' : '#e6edf3' }}
                  >
                    {opt.rate}%
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text className="text-xs text-[#656d76]">
              متوسطات تاريخية تقريبية — ليست ضماناً للعوائد المستقبلية
            </Text>
          </View>
        </View>

        {/* Results */}
        <View className="gap-3">
          {/* Motivational */}
          <Text className="text-sm text-[#8b949e] text-center">{motivational}</Text>

          {/* 3 result cards */}
          <View className="flex-row gap-3">
            {/* Invested */}
            <View className="flex-1 bg-[#161b22] border border-[#30363d] rounded-2xl p-4 gap-2">
              <View className="w-9 h-9 rounded-xl bg-white/[0.04] items-center justify-center">
                <Wallet size={16} color="#8b949e" />
              </View>
              <Text className="text-xs text-[#656d76]">إجمالي ما استثمرته</Text>
              <Text className="text-sm font-bold text-[#e6edf3]" numberOfLines={1}>
                {fmt(result.invested)} ج.م
              </Text>
            </View>

            {/* Profit */}
            <View className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 gap-2">
              <View className="w-9 h-9 rounded-xl bg-emerald-500/20 items-center justify-center">
                <TrendingUp size={16} color="#10b981" />
              </View>
              <Text className="text-xs text-[#656d76]">الأرباح المتوقعة</Text>
              <Text className="text-sm font-bold text-emerald-400" numberOfLines={1}>
                + {fmt(result.profit)} ج.م
              </Text>
            </View>
          </View>

          {/* Final wealth — full width highlighted */}
          <View className="bg-brand/10 border border-brand/30 rounded-2xl p-5 flex-row items-center gap-4">
            <View className="w-12 h-12 rounded-xl bg-brand/20 items-center justify-center">
              <Crown size={22} color="#8b5cf6" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-[#8b949e]">ثروتك بعد {years} سنة</Text>
              <Text className="text-xl font-bold text-brand" numberOfLines={1}>
                {fmt(result.total)} ج.م
              </Text>
              <Text className="text-xs text-[#656d76] mt-0.5">
                ({fmtFull(result.total)} جنيه)
              </Text>
            </View>
          </View>
        </View>

        {/* Comparison */}
        <View className="gap-2">
          <Text className="text-sm text-[#8b949e] font-medium">مقارنة مع بدائل الاستثمار</Text>
          <View className="flex-row gap-2">
            {/* Bank */}
            <View className="flex-1 bg-[#161b22] border border-[#30363d] rounded-2xl p-3 items-center gap-1">
              <Text className="text-xs text-[#656d76]">البنك</Text>
              <Text className="text-xs text-[#8b949e]">~8%</Text>
              <Text className="text-sm font-bold text-[#e6edf3]" numberOfLines={1}>
                {fmt(compareBank.total)}
              </Text>
              <Text className="text-xs text-[#656d76]">ج.م</Text>
            </View>

            {/* Gold */}
            <View className="flex-1 bg-[#161b22] border border-[#30363d] rounded-2xl p-3 items-center gap-1">
              <Text className="text-xs text-[#656d76]">الذهب</Text>
              <Text className="text-xs text-[#8b949e]">~12%</Text>
              <Text className="text-sm font-bold text-[#e6edf3]" numberOfLines={1}>
                {fmt(compareGold.total)}
              </Text>
              <Text className="text-xs text-[#656d76]">ج.م</Text>
            </View>

            {/* EGX (highlighted best) */}
            <View className="flex-1 bg-brand/15 border border-brand/40 rounded-2xl p-3 items-center gap-1">
              <View className="flex-row items-center gap-1">
                <Trophy size={10} color="#8b5cf6" />
                <Text className="text-xs text-brand font-bold">الأفضل</Text>
              </View>
              <Text className="text-xs text-brand">~{annualRate}%</Text>
              <Text className="text-sm font-bold text-brand" numberOfLines={1}>
                {fmt(result.total)}
              </Text>
              <Text className="text-xs text-[#8b5cf6]/70">ج.م</Text>
            </View>
          </View>
        </View>

        {/* Breakdown */}
        {(m > 0 || i > 0) && (
          <View className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 gap-2">
            <Text className="text-xs text-[#656d76] font-medium mb-1">تفاصيل الحساب</Text>
            {[
              { label: 'رأس المال الابتدائي', value: fmtFull(i) + ' ج.م' },
              { label: 'إجمالي الإيداعات الشهرية', value: fmtFull(m * years * 12) + ' ج.م' },
              { label: 'إجمالي ما استثمرته', value: fmtFull(result.invested) + ' ج.م' },
              { label: 'العائد السنوي المختار', value: annualRate + '%' },
              { label: 'مدة الاستثمار', value: years + ' سنة' },
            ].map(({ label, value }) => (
              <View key={label} className="flex-row justify-between items-center">
                <Text className="text-xs text-[#8b949e]">{label}</Text>
                <Text className="text-xs font-medium text-[#e6edf3]">{value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Disclaimer */}
        <Text className="text-xs text-[#656d76] text-center leading-5 px-2">
          ⚖️ هذه الحاسبة للأغراض التعليمية فقط. العوائد الفعلية تختلف حسب ظروف السوق. تحقق دائماً من مصادر متعددة قبل الاستثمار.
        </Text>
      </ScrollView>
    </ScreenWrapper>
  );
}
