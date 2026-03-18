import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Crown, Zap, Check } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuthStore } from '../../store/authStore';

const PLANS = [
  {
    id: 'free',
    label: 'Free',
    price: 0,
    color: '#94a3b8',
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

  return (
    <ScreenWrapper padded={false}>
      <View className="flex-row items-center gap-3 px-4 pt-5 pb-4 border-b border-white/[0.06]">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white/[0.05] items-center justify-center"
        >
          <ArrowLeft size={16} color="#94a3b8" />
        </Pressable>
        <Text className="text-base font-bold text-white">الاشتراك والخطة</Text>
      </View>

      <ScrollView
        contentContainerClassName="px-4 py-5 gap-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-brand/10 border border-brand/20 rounded-2xl px-4 py-3 flex-row items-center gap-2">
          <Crown size={16} color="#10b981" />
          <Text className="text-sm font-semibold text-brand">
            خطتك الحالية: {currentPlan.toUpperCase()}
          </Text>
          {user?.planExpiresAt && (
            <Text className="text-xs text-slate-400 ml-auto">
              تنتهي: {new Date(user.planExpiresAt).toLocaleDateString('ar-EG')}
            </Text>
          )}
        </View>

        {PLANS.map((plan) => {
          const active = isActive(plan.id);
          return (
            <View
              key={plan.id}
              className={`rounded-2xl border p-4 gap-3 ${
                active
                  ? 'border-brand bg-brand/5'
                  : plan.id === 'pro'
                  ? 'border-blue-500/40 bg-[#111118]'
                  : 'border-white/[0.07] bg-[#111118]'
              }`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  {plan.id !== 'free' && <Zap size={16} color={plan.color} />}
                  <Text
                    className="text-base font-bold"
                    style={{ color: plan.color }}
                  >
                    {plan.label}
                  </Text>
                  {active && (
                    <View className="bg-brand px-2 py-0.5 rounded-md">
                      <Text className="text-xs font-bold text-white">
                        خطتك الحالية
                      </Text>
                    </View>
                  )}
                </View>
                <View className="items-end">
                  <Text className="text-lg font-bold text-white tabular-nums">
                    {plan.price === 0 ? 'مجاناً' : `${plan.price} EGP`}
                  </Text>
                  {plan.price > 0 && (
                    <Text className="text-xs text-slate-500">/شهر</Text>
                  )}
                </View>
              </View>

              <View className="gap-2">
                {plan.features.map((f, i) => (
                  <View key={i} className="flex-row items-center gap-2">
                    <Check size={13} color="#10b981" />
                    <Text className="text-xs text-slate-300">{f}</Text>
                  </View>
                ))}
              </View>

              {!active && plan.id !== 'free' && (
                <Pressable
                  className="py-2.5 rounded-xl items-center mt-1"
                  style={{ backgroundColor: plan.color }}
                  onPress={() => {
                    // integrate Paymob here
                  }}
                >
                  <Text className="text-sm font-bold text-white">
                    ترقية لـ {plan.label}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}

        <Text className="text-xs text-slate-600 text-center leading-5">
          الدفع عبر Paymob — التجديد يدوي حالياً
        </Text>
      </ScrollView>
    </ScreenWrapper>
  );
}

