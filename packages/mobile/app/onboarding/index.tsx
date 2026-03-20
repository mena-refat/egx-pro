import { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  Alert,
  StatusBar,
  I18nManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Wallet, AlertTriangle, Target, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import apiClient from '../../lib/api/client';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import {
  BRAND, BRAND_BG_STRONG, BRAND_LIGHT,
  FONT, WEIGHT, RADIUS, SPACE,
} from '../../lib/theme';

const { width: SCREEN_W } = Dimensions.get('window');

type FormData = {
  goal:               string;
  timeline:           string;
  riskTolerance:      string;
  shariaMode:         boolean;
  interestedSectors:  string[];
  level:              string;
  hearAboutUs:        string;
};

const SECTORS = [
  { id: 'banks_financial',   label: 'البنوك والخدمات المالية' },
  { id: 'real_estate',       label: 'العقارات والإنشاءات' },
  { id: 'food_beverages',    label: 'الأغذية والمشروبات' },
  { id: 'healthcare_pharma', label: 'الرعاية الصحية والأدوية' },
  { id: 'it_telecom',        label: 'الاتصالات والتكنولوجيا' },
  { id: 'industrial',        label: 'الصناعات والسلع' },
  { id: 'utilities',         label: 'المرافق' },
  { id: 'diversified',       label: 'متنوع' },
];

const GOALS = [
  { id: 'wealth_growth',  label: 'تنمية الثروة على المدى البعيد' },
  { id: 'passive_income', label: 'دخل شهري من التوزيعات' },
  { id: 'short_gains',    label: 'مكاسب قصيرة المدى' },
  { id: 'learn',          label: 'تعلّم الاستثمار' },
];

const RISK_OPTIONS = [
  { id: 'conservative', label: 'محافظ — أفضل الأمان' },
  { id: 'moderate',     label: 'معتدل — توازن بين الأمان والعائد' },
  { id: 'aggressive',   label: 'مغامر — أقبل مخاطر أعلى للعائد' },
];

export default function OnboardingPage() {
  const router      = useRouter();
  const updateUser  = useAuthStore((s) => s.updateUser);
  const scrollRef   = useRef<ScrollView>(null);
  const insets      = useSafeAreaInsets();
  const { colors }  = useTheme();
  const BackIcon    = I18nManager.isRTL ? ChevronRight : ChevronLeft;

  const [step,   setStep]   = useState(0);
  const [saving, setSaving] = useState(false);
  const [form,   setForm]   = useState<FormData>({
    goal: '', timeline: '', riskTolerance: 'moderate',
    shariaMode: false, interestedSectors: [], level: '', hearAboutUs: '',
  });

  const STEPS = [
    {
      id: 'goal', icon: Wallet,
      title: 'ما هدفك من الاستثمار؟',
      subtitle: 'نحدد لك توصيات تناسب أهدافك',
      options: GOALS, field: 'goal' as const,
    },
    {
      id: 'risk', icon: AlertTriangle,
      title: 'ما مستوى المخاطرة المقبول لديك؟',
      subtitle: 'هذا يؤثر على التحليلات والتوصيات',
      options: RISK_OPTIONS, field: 'riskTolerance' as const,
    },
    {
      id: 'sectors', icon: Target,
      title: 'ما القطاعات التي تهمك؟',
      subtitle: 'اختر أكثر من قطاع',
      options: SECTORS, field: 'interestedSectors' as const, multi: true,
    },
    {
      id: 'sharia', icon: Target,
      title: 'هل تفضل الاستثمار الإسلامي؟',
      subtitle: 'سنعرض لك الأسهم المتوافقة مع الشريعة فقط',
      options: [
        { id: 'true',  label: 'نعم، أريد الأسهم المتوافقة مع الشريعة' },
        { id: 'false', label: 'لا، أريد كل الأسهم' },
      ],
      field: 'shariaMode' as const,
    },
  ];

  const total   = STEPS.length;
  const current = STEPS[step];

  const scrollToStep = (idx: number) => {
    scrollRef.current?.scrollTo({ x: SCREEN_W * idx, animated: true });
    setStep(idx);
  };

  const selectOption = (field: keyof FormData, value: string, multi?: boolean) => {
    if (multi) {
      const cur = (form[field] as string[]) ?? [];
      setForm((p) => ({ ...p, [field]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] }));
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      {/* Skip button */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: SPACE.lg, paddingTop: SPACE.sm }}>
        <Pressable
          onPress={() => void handleFinish()}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingVertical: SPACE.sm, paddingHorizontal: SPACE.md })}
        >
          <Text style={{ color: colors.textSub, fontSize: FONT.sm }}>تخطي</Text>
        </Pressable>
      </View>

      {/* Step icon + title */}
      <View style={{ alignItems: 'center', gap: SPACE.md, paddingHorizontal: SPACE.xl, paddingVertical: SPACE.xl }}>
        <View style={{
          width: 96, height: 96, borderRadius: RADIUS['2xl'],
          backgroundColor: BRAND_BG_STRONG,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <current.icon size={44} color={BRAND} />
        </View>
        <Text style={{ color: colors.text, fontSize: FONT['2xl'], fontWeight: WEIGHT.bold, textAlign: 'center' }}>
          {current.title}
        </Text>
        <Text style={{ color: colors.textSub, fontSize: FONT.sm, textAlign: 'center', lineHeight: 20 }}>
          {current.subtitle}
        </Text>
      </View>

      {/* Options */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {STEPS.map((stepDef) => (
          <ScrollView
            key={stepDef.id}
            contentContainerStyle={{ paddingHorizontal: SPACE.lg, gap: SPACE.sm, paddingBottom: SPACE.lg }}
            showsVerticalScrollIndicator={false}
            style={{ width: SCREEN_W }}
          >
            {stepDef.options.map((opt) => {
              const selected = isSelected(stepDef.field, opt.id);
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => selectOption(stepDef.field, opt.id, stepDef.multi)}
                  style={({ pressed }) => ({
                    padding: SPACE.lg,
                    borderRadius: RADIUS.lg,
                    borderWidth: 1.5,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: SPACE.md,
                    borderColor:     selected ? BRAND : colors.border,
                    backgroundColor: selected ? BRAND_BG_STRONG : colors.card,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View style={{
                    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                    alignItems: 'center', justifyContent: 'center',
                    borderColor:     selected ? BRAND : colors.border2,
                    backgroundColor: selected ? BRAND : 'transparent',
                  }}>
                    {selected && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />}
                  </View>
                  <Text style={{
                    flex: 1, fontSize: FONT.sm, fontWeight: WEIGHT.medium,
                    color: selected ? colors.text : colors.textSub,
                  }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ))}
      </ScrollView>

      {/* Bottom: nav + progress dots */}
      <View style={{ paddingHorizontal: SPACE.lg, paddingBottom: Math.max(insets.bottom, SPACE.lg), gap: SPACE.lg }}>
        {/* Progress dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: SPACE.sm }}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={{
                width:           i === step ? 20 : 6,
                height:          6,
                borderRadius:    3,
                backgroundColor: i === step ? BRAND : colors.border2,
              }}
            />
          ))}
        </View>

        {/* Nav buttons */}
        <View style={{ flexDirection: 'row', gap: SPACE.md }}>
          {step > 0 && (
            <Pressable
              onPress={() => scrollToStep(step - 1)}
              style={({ pressed }) => ({
                width: 48, height: 48, borderRadius: RADIUS.md,
                backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
                alignItems: 'center', justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <BackIcon size={20} color={colors.textSub} />
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <Button
              label={saving ? 'جارٍ الحفظ...' : step === total - 1 ? 'ابدأ الآن' : 'التالي'}
              loading={saving}
              onPress={handleNext}
              disabled={!canNext() || saving}
              fullWidth
              size="lg"
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
