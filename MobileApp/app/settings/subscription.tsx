import { View, Text, ScrollView, Pressable, Linking, Alert, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Crown, Zap, Check } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuthStore } from '../../store/authStore';

const PLANS = [
  {
    id: 'free',
    label: 'Free',
    price: 0,
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
    label: 'Pro',
    price: 189,
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
    label: 'Ultra',
    price: 397,
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
  const currentPlan = user?.plan ?? 'free';

  const isActive = (planId: string) =>
    planId === 'free'
      ? currentPlan === 'free'
      : planId === 'pro'
      ? currentPlan === 'pro' || currentPlan === 'yearly'
      : currentPlan === 'ultra' || currentPlan === 'ultra_yearly';

  const handleUpgrade = (planLabel: string) => {
    Alert.alert(
      `ترقية لـ ${planLabel}`,
      'للترقية تواصل معنا عبر البريد الإلكتروني أو واتساب وسنرسل لك رابط الدفع.',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تواصل معنا', onPress: () => Linking.openURL('mailto:support@borsa.app') },
      ],
    );
  };

  return (
    <ScreenWrapper padded={false}>
      <View className="flex-row items-center gap-3 px-4 pt-5 pb-4 border-b border-[#30363d]">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white/[0.04] border border-[#30363d] items-center justify-center"
        >
          {I18nManager.isRTL ? <ArrowRight size={16} color="#8b949e" /> : <ArrowLeft size={16} color="#8b949e" />}
        </Pressable>
        <View className="w-8 h-8 rounded-xl bg-brand/15 items-center justify-center">
          <Crown size={15} color="#8b5cf6" />
        </View>
        <Text className="text-base font-bold text-[#e6edf3]">الاشتراك والخطة</Text>
      </View>

      <ScrollView contentContainerClassName="px-4 py-5 gap-4" showsVerticalScrollIndicator={false}>
        {/* Current plan badge */}
        <View className="bg-brand/10 border border-brand/25 rounded-2xl px-4 py-3 flex-row items-center gap-2">
          <Crown size={16} color="#8b5cf6" />
          <Text className="text-sm font-semibold text-brand">
            خطتك الحالية: {currentPlan.toUpperCase()}
          </Text>
          {user?.planExpiresAt && (
            <Text className="text-xs text-[#8b949e] mr-auto">
              تنتهي: {new Date(user.planExpiresAt).toLocaleDateString('ar-EG')}
            </Text>
          )}
        </View>

        {PLANS.map((plan) => {
          const active = isActive(plan.id);
          return (
            <View
              key={plan.id}
              className="rounded-2xl border p-4 gap-3"
              style={{
                borderColor: active ? '#8b5cf640' : plan.id === 'pro' ? '#3b82f625' : '#30363d',
                backgroundColor: active ? '#8b5cf608' : '#161b22',
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
                <View className="items-end">
                  <Text className="text-lg font-bold text-[#e6edf3] tabular-nums">
                    {plan.price === 0 ? 'مجاناً' : `${plan.price} EGP`}
                  </Text>
                  {plan.price > 0 && <Text className="text-xs text-[#656d76]">/شهر</Text>}
                </View>
              </View>

              <View className="gap-2">
                {plan.features.map((f, i) => (
                  <View key={i} className="flex-row items-center gap-2">
                    <Check size={13} color="#4ade80" />
                    <Text className="text-xs text-[#8b949e]">{f}</Text>
                  </View>
                ))}
              </View>

              {!active && plan.id !== 'free' && (
                <Pressable
                  onPress={() => handleUpgrade(plan.label)}
                  className="py-2.5 rounded-xl items-center mt-1"
                  style={{ backgroundColor: plan.color }}
                >
                  <Text className="text-sm font-bold text-white">ترقية لـ {plan.label}</Text>
                </Pressable>
              )}
            </View>
          );
        })}

        <Text className="text-xs text-[#656d76] text-center leading-5">
          للترقية تواصل معنا — الدفع عبر Paymob
        </Text>
      </ScrollView>
    </ScreenWrapper>
  );
}
