import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Alert, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Crown, Zap, Check } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';

type BillingPeriod = 'monthly' | 'yearly';

const PLANS = [
  {
    id: 'free',
    yearlyId: 'free',
    label: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    color: '#8b949e',
    features: [
      '3 تحليلات AI شهرياً',
      '3 توقعات يومياً',
      'محفظة حتى 5 أسهم',
      'بيانات متأخرة 10 دقائق',
    ],
  },
  {
    id: 'pro',
    yearlyId: 'yearly',
    label: 'Pro',
    monthlyPrice: 189,
    yearlyPrice: 1890,
    color: '#3b82f6',
    highlight: true,
    features: [
      '20 تحليل AI شهرياً',
      '10 توقعات يومياً',
      'محفظة حتى 20 سهم',
      'بيانات شبه فورية',
      'إشارات وتنبيهات',
    ],
  },
  {
    id: 'ultra',
    yearlyId: 'ultra_yearly',
    label: 'Ultra',
    monthlyPrice: 397,
    yearlyPrice: 3970,
    color: '#f59e0b',
    features: [
      '60 تحليل AI شهرياً',
      'توقعات غير محدودة',
      'محفظة غير محدودة',
      'بيانات فورية',
      'أولوية في الدعم',
    ],
  },
] as const;

export default function SubscriptionPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const [billing, setBilling] = useState<BillingPeriod>('monthly');

  const currentPlan = user?.plan ?? 'free';

  const isActive = (planId: string, yearlyId: string) => {
    if (planId === 'free') return currentPlan === 'free';
    if (billing === 'monthly') return currentPlan === planId;
    return currentPlan === yearlyId;
  };

  const getPrice = (plan: typeof PLANS[number]) => {
    if (plan.monthlyPrice === 0) return null;
    if (billing === 'monthly') return { amount: plan.monthlyPrice, label: '/شهر' };
    const monthly = Math.round(plan.yearlyPrice / 12);
    return { amount: monthly, label: '/شهر', yearly: plan.yearlyPrice };
  };

  const getSavings = (plan: typeof PLANS[number]) => {
    if (plan.monthlyPrice === 0 || billing === 'monthly') return null;
    const fullYear = plan.monthlyPrice * 12;
    const saved = fullYear - plan.yearlyPrice;
    const pct = Math.round((saved / fullYear) * 100);
    return { saved, pct };
  };

  const handleUpgrade = (planLabel: string, isYearly: boolean) => {
    const billingNote = isYearly ? ' (سنوي)' : ' (شهري)';
    Alert.alert(
      `ترقية لـ ${planLabel}${billingNote}`,
      'للترقية تواصل معنا عبر البريد الإلكتروني أو واتساب وسنرسل لك رابط الدفع.',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تواصل معنا', onPress: () => Linking.openURL('mailto:support@borsa.app') },
      ],
    );
  };

  return (
    <ScreenWrapper padded={false}>
      {/* Header */}
      <View
        style={{ borderBottomColor: colors.border }}
        className="flex-row items-center gap-3 px-4 pt-5 pb-4 border-b"
      >
        <Pressable
          onPress={() => router.back()}
          style={{ backgroundColor: colors.hover, borderColor: colors.border }}
          className="w-9 h-9 rounded-xl border items-center justify-center"
        >
          {I18nManager.isRTL ? <ArrowRight size={16} color={colors.textMuted} /> : <ArrowLeft size={16} color={colors.textMuted} />}
        </Pressable>
        <View className="w-8 h-8 rounded-xl bg-brand/15 items-center justify-center">
          <Crown size={15} color="#8b5cf6" />
        </View>
        <Text style={{ color: colors.text }} className="text-base font-bold">الاشتراك والخطة</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        {/* Current plan badge */}
        <View className="bg-brand/10 border border-brand/25 rounded-2xl px-4 py-3 flex-row items-center gap-2">
          <Crown size={16} color="#8b5cf6" />
          <Text className="text-sm font-semibold text-brand">
            خطتك الحالية: {currentPlan.toUpperCase()}
          </Text>
          {user?.planExpiresAt && (
            <Text style={{ color: colors.textMuted }} className="text-xs mr-auto">
              تنتهي: {new Date(user.planExpiresAt).toLocaleDateString('ar-EG')}
            </Text>
          )}
        </View>

        {/* Billing toggle */}
        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="border rounded-2xl p-1.5 flex-row gap-1"
        >
          {(['monthly', 'yearly'] as const).map((b) => {
            const active = billing === b;
            return (
              <Pressable
                key={b}
                onPress={() => setBilling(b)}
                className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl"
                style={{ backgroundColor: active ? '#8b5cf6' : 'transparent' }}
              >
                <Text className="text-sm font-semibold" style={{ color: active ? '#fff' : colors.textMuted }}>
                  {b === 'monthly' ? 'شهري' : 'سنوي'}
                </Text>
                {b === 'yearly' && !active && (
                  <View className="bg-emerald-500/20 px-1.5 py-0.5 rounded-md">
                    <Text className="text-[10px] font-bold text-emerald-400">شهرين مجاناً</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Plan cards */}
        {PLANS.map((plan) => {
          const active = isActive(plan.id, plan.yearlyId);
          const price = getPrice(plan);
          const savings = getSavings(plan);

          return (
            <View
              key={plan.id}
              className="rounded-2xl border p-4 gap-3"
              style={{
                borderColor: active ? '#8b5cf640' : plan.id === 'pro' ? `${plan.color}25` : colors.border,
                backgroundColor: active ? '#8b5cf608' : colors.card,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  {plan.id !== 'free' && <Zap size={16} color={plan.color} />}
                  <Text className="text-base font-bold" style={{ color: plan.color }}>{plan.label}</Text>
                  {active && (
                    <View className="bg-brand/20 px-2 py-0.5 rounded-md">
                      <Text className="text-xs font-bold text-brand">خطتك الحالية</Text>
                    </View>
                  )}
                </View>

                <View className="items-end gap-0.5">
                  {price === null ? (
                    <Text style={{ color: colors.text }} className="text-lg font-bold">مجاناً</Text>
                  ) : (
                    <>
                      <Text style={{ color: colors.text }} className="text-lg font-bold tabular-nums">
                        {price.amount} EGP
                        <Text style={{ color: colors.textMuted }} className="text-xs font-normal">{price.label}</Text>
                      </Text>
                      {price.yearly && (
                        <Text style={{ color: colors.textMuted }} className="text-xs">
                          {price.yearly} EGP/سنة
                        </Text>
                      )}
                      {savings && (
                        <View className="bg-emerald-500/15 px-1.5 py-0.5 rounded-md mt-0.5">
                          <Text className="text-[10px] font-bold text-emerald-400">
                            وفّر {savings.saved} EGP
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>

              <View className="gap-2">
                {plan.features.map((f, i) => (
                  <View key={i} className="flex-row items-center gap-2">
                    <Check size={13} color="#4ade80" />
                    <Text style={{ color: colors.textSub }} className="text-xs">{f}</Text>
                  </View>
                ))}
              </View>

              {!active && plan.id !== 'free' && (
                <Pressable
                  onPress={() => handleUpgrade(plan.label, billing === 'yearly')}
                  className="py-2.5 rounded-xl items-center mt-1"
                  style={{ backgroundColor: plan.color }}
                >
                  <Text className="text-sm font-bold text-white">
                    ترقية لـ {plan.label} {billing === 'yearly' ? '(سنوي)' : '(شهري)'}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}

        <Text style={{ color: colors.textMuted }} className="text-xs text-center leading-5">
          للترقية تواصل معنا — الدفع عبر Paymob
        </Text>
      </ScrollView>
    </ScreenWrapper>
  );
}
