import { useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Wallet, AlertTriangle, Target, ChevronLeft } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Button } from '../../components/ui/Button';
import apiClient from '../../lib/api/client';
import { useAuthStore } from '../../store/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type FormData = {
  goal: string;
  timeline: string;
  riskTolerance: string;
  shariaMode: boolean;
  interestedSectors: string[];
  level: string;
  hearAboutUs: string;
};

const SECTORS = [
  { id: 'banks_financial', label: 'البنوك والخدمات المالية' },
  { id: 'real_estate', label: 'العقارات والإنشاءات' },
  { id: 'food_beverages', label: 'الأغذية والمشروبات' },
  { id: 'healthcare_pharma', label: 'الرعاية الصحية والأدوية' },
  { id: 'it_telecom', label: 'الاتصالات والتكنولوجيا' },
  { id: 'industrial', label: 'الصناعات والسلع' },
  { id: 'utilities', label: 'المرافق' },
  { id: 'diversified', label: 'متنوع' },
];

const GOALS = [
  { id: 'wealth_growth', label: 'تنمية الثروة على المدى البعيد' },
  { id: 'passive_income', label: 'دخل شهري من التوزيعات' },
  { id: 'short_gains', label: 'مكاسب قصيرة المدى' },
  { id: 'learn', label: 'تعلّم الاستثمار' },
];

const RISK_OPTIONS = [
  { id: 'conservative', label: 'محافظ — أفضل الأمان' },
  { id: 'moderate', label: 'معتدل — توازن بين الأمان والعائد' },
  { id: 'aggressive', label: 'مغامر — أقبل مخاطر أعلى للعائد' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const updateUser = useAuthStore((s) => s.updateUser);
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormData>({
    goal: '',
    timeline: '',
    riskTolerance: 'moderate',
    shariaMode: false,
    interestedSectors: [],
    level: '',
    hearAboutUs: '',
  });

  const STEPS = [
    {
      id: 'goal',
      icon: Wallet,
      title: 'ما هدفك من الاستثمار؟',
      subtitle: 'نحدد لك توصيات تناسب أهدافك',
      options: GOALS,
      field: 'goal' as const,
    },
    {
      id: 'risk',
      icon: AlertTriangle,
      title: 'ما مستوى المخاطرة المقبول لديك؟',
      subtitle: 'هذا يؤثر على التحليلات والتوصيات',
      options: RISK_OPTIONS,
      field: 'riskTolerance' as const,
    },
    {
      id: 'sectors',
      icon: Target,
      title: 'ما القطاعات التي تهمك؟',
      subtitle: 'اختر أكثر من قطاع',
      options: SECTORS,
      field: 'interestedSectors' as const,
      multi: true,
    },
    {
      id: 'sharia',
      icon: Target,
      title: 'هل تفضل الاستثمار الإسلامي؟',
      subtitle: 'سنعرض لك الأسهم المتوافقة مع الشريعة فقط',
      options: [
        { id: 'true', label: 'نعم، أريد الأسهم المتوافقة مع الشريعة' },
        { id: 'false', label: 'لا، أريد كل الأسهم' },
      ],
      field: 'shariaMode' as const,
    },
  ];

  const total = STEPS.length;
  const current = STEPS[step];

  const scrollToStep = (idx: number) => {
    scrollRef.current?.scrollTo({ x: SCREEN_WIDTH * idx, animated: true });
    setStep(idx);
  };

  const selectOption = (field: keyof FormData, value: string, multi?: boolean) => {
    if (multi) {
      const currentValues = (form[field] as string[]) ?? [];
      const next = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      setForm((p) => ({ ...p, [field]: next }));
    } else if (field === 'shariaMode') {
      setForm((p) => ({ ...p, shariaMode: value === 'true' }));
    } else {
      setForm((p) => ({ ...p, [field]: value }));
    }
  };

  const isSelected = (field: keyof FormData, value: string): boolean => {
    if (field === 'interestedSectors') return form.interestedSectors.includes(value);
    if (field === 'shariaMode') return String(form.shariaMode) === value;
    return (form[field] as string) === value;
  };

  const canNext = (): boolean => {
    const f = current.field;
    if (f === 'interestedSectors') return form.interestedSectors.length > 0;
    if (f === 'shariaMode') return true;
    return !!(form[f] as string);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await apiClient.put('/api/user/profile', {
        ...form,
        interestedSectors: JSON.stringify(form.interestedSectors),
        onboardingCompleted: true,
        isFirstLogin: false,
      });
      updateUser({ onboardingCompleted: true, isFirstLogin: false });
      router.replace('/');
    } catch {
      setSaving(false);
      Alert.alert('خطأ', 'حدث خطأ أثناء الحفظ، حاول مرة أخرى');
    }
  };

  const handleNext = () => {
    if (step < total - 1) scrollToStep(step + 1);
    else void handleFinish();
  };

  const handleBack = () => {
    if (step > 0) scrollToStep(step - 1);
  };

  return (
    <ScreenWrapper>
      <View className="flex-1">
        <View className="px-6 pt-4 pb-2 flex-row gap-1.5">
          {STEPS.map((_, i) => (
            <View
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-brand' : 'bg-white/10'}`}
            />
          ))}
        </View>

        <View className="items-center gap-3 py-8 px-6">
          <View className="w-16 h-16 rounded-2xl bg-brand/10 items-center justify-center">
            <current.icon size={30} color="#10b981" />
          </View>
          <Text className="text-xl font-bold text-white text-center">{current.title}</Text>
          <Text className="text-sm text-slate-400 text-center">{current.subtitle}</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
        >
          {STEPS.map((stepDef) => (
            <ScrollView
              key={stepDef.id}
              contentContainerClassName="px-6 gap-3 pb-6"
              showsVerticalScrollIndicator={false}
              style={{ width: SCREEN_WIDTH }}
            >
              {stepDef.options.map((opt) => {
                const selected = isSelected(stepDef.field, opt.id);
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => selectOption(stepDef.field, opt.id, stepDef.multi)}
                    className={`
                      p-4 rounded-xl border flex-row items-center gap-3
                      ${selected ? 'border-brand bg-brand/10' : 'border-white/[0.07] bg-[#111118]'}
                    `}
                  >
                    <View
                      className={`
                        w-5 h-5 rounded-full border-2 items-center justify-center
                        ${selected ? 'border-brand bg-brand' : 'border-white/20'}
                      `}
                    >
                      {selected && <View className="w-2 h-2 rounded-full bg-white" />}
                    </View>
                    <Text
                      className={`text-sm font-medium flex-1 ${
                        selected ? 'text-white' : 'text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ))}
        </ScrollView>

        <View className="px-6 pb-6 flex-row gap-3">
          {step > 0 && (
            <Pressable
              onPress={handleBack}
              className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.07] items-center justify-center"
            >
              <ChevronLeft size={20} color="#94a3b8" />
            </Pressable>
          )}
          <View className="flex-1">
            <Button
              label={saving ? 'جارٍ الحفظ...' : step === total - 1 ? 'ابدأ الاستثمار ✨' : 'التالي'}
              loading={saving}
              onPress={handleNext}
              disabled={!canNext() || saving}
              fullWidth
              size="lg"
            />
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
}

