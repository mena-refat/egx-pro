import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Linking, Alert,
  I18nManager, Platform, ActivityIndicator, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Crown, Zap, Check, Tag, X, ChevronDown, ChevronUp } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import { useGooglePlayBilling } from '../../hooks/useGooglePlayBilling';
import type { IAPPlanKey } from '../../hooks/useGooglePlayBilling';
import apiClient from '../../lib/api/client';
import { BRAND, GREEN } from '../../lib/theme';

type BillingPeriod = 'monthly' | 'yearly';

// Server returns these effective plan values
// DB values:  'pro' | 'yearly' | 'ultra' | 'ultra_yearly'
// API values: 'pro' | 'annual' | 'ultra' | 'ultra_annual'
const PLANS = [
  {
    id: 'free',
    yearlyId: 'free',          // same — free is always free
    iapMonthly: null as IAPPlanKey | null,
    iapYearly:  null as IAPPlanKey | null,
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
    yearlyId: 'annual',        // server returns 'annual' not 'yearly'
    iapMonthly: 'pro_monthly' as IAPPlanKey,
    iapYearly:  'pro_yearly'  as IAPPlanKey,
    label: 'Pro',
    monthlyPrice: 189,
    yearlyPrice: 1890,
    color: '#3b82f6',
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
    yearlyId: 'ultra_annual',  // server returns 'ultra_annual' not 'ultra_yearly'
    iapMonthly: 'ultra_monthly' as IAPPlanKey,
    iapYearly:  'ultra_yearly'  as IAPPlanKey,
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

// Display the current plan in a human-readable form
const PLAN_LABELS: Record<string, string> = {
  free:         'Free',
  pro:          'Pro (شهري)',
  annual:       'Pro (سنوي)',
  ultra:        'Ultra (شهري)',
  ultra_annual: 'Ultra (سنوي)',
};

interface DiscountResult {
  percent: number;
  finalPrice: number;
  discountAmount: number;
  code: string;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const { colors } = useTheme();
  const [billing, setBilling] = useState<BillingPeriod>('monthly');
  const { connected, purchasing, purchasePlan } = useGooglePlayBilling();

  // Promo code state
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoResult, setPromoResult] = useState<DiscountResult | null>(null);

  const currentPlan = user?.plan ?? 'free';
  const billingOptions: BillingPeriod[] = ['monthly', 'yearly'];

  // ── isActive: compares with server's effective plan values ──────────────────
  const isActive = (plan: typeof PLANS[number]) => {
    if (plan.id === 'free') return currentPlan === 'free';
    if (billing === 'monthly') return currentPlan === plan.id;       // 'pro' or 'ultra'
    // DB "effective" yearly plans are stored as: 'yearly' + 'ultra_yearly'
    if (plan.id === 'pro') return currentPlan === 'yearly';
    if (plan.id === 'ultra') return currentPlan === 'ultra_yearly';
    return false;
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
    return { saved, pct: Math.round((saved / fullYear) * 100) };
  };

  // ── Promo code validation ────────────────────────────────────────────────────
  const validatePromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError(null);
    setPromoResult(null);
    try {
      const planParam = billing === 'yearly' ? 'annual' : 'pro'; // validate against any paid plan
      const res = await apiClient.post('/api/billing/validate-discount', { code, plan: planParam });
      const data = (res.data as { data?: DiscountResult })?.data ?? res.data as DiscountResult;
      setPromoResult(data);
    } catch (err: unknown) {
      const errorCode = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (errorCode === 'INVALID_DISCOUNT_CODE') setPromoError('كود الخصم غير صحيح أو منتهي الصلاحية');
      else if (errorCode === 'DISCOUNT_ALREADY_USED') setPromoError('هذا الكود استُخدم من قبل');
      else setPromoError('تعذّر التحقق من الكود، حاول مرة أخرى');
    } finally {
      setPromoLoading(false);
    }
  };

  const clearPromo = () => {
    setPromoCode('');
    setPromoResult(null);
    setPromoError(null);
  };

  // ── Apply discounted final price to displayed amount ──────────────────────
  const getDiscountedPrice = (plan: typeof PLANS[number]) => {
    if (!promoResult || plan.monthlyPrice === 0) return null;
    const base = billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    const final = Math.round(base * (1 - promoResult.percent / 100));
    return { final, saved: base - final, percent: promoResult.percent };
  };

  // ── Upgrade handler ──────────────────────────────────────────────────────────
  const handleUpgrade = async (plan: typeof PLANS[number]) => {
    if (plan.id === 'free') return;

    const iapKey = billing === 'yearly' ? plan.iapYearly : plan.iapMonthly;
    const serverPlanKey = billing === 'yearly'
      ? (plan.id === 'pro' ? 'pro_yearly' : 'ultra_yearly')
      : (plan.id === 'pro' ? 'pro_monthly' : 'ultra_monthly');

    // If valid promo code → try server-side upgrade (100% discount activates free)
    if (promoResult) {
      try {
        const res = await apiClient.post('/api/billing/upgrade', {
          plan: serverPlanKey,
          discountCode: promoCode.trim().toUpperCase(),
        });
        const ok = (res.data as { data?: { success?: boolean } })?.data?.success
          ?? (res.data as { success?: boolean })?.success;
        if (ok) {
          // Refresh plan
          try {
            const planRes = await apiClient.get('/api/billing/plan');
            const d = (planRes.data as { data?: { plan?: string; planExpiresAt?: string } })?.data ?? planRes.data as { plan?: string; planExpiresAt?: string };
            const rawPlan = d?.plan;
            const safePlan =
              rawPlan === 'free' || rawPlan === 'pro' || rawPlan === 'yearly' || rawPlan === 'ultra' || rawPlan === 'ultra_yearly'
                ? rawPlan
                : null;
            if (safePlan) updateUser({ plan: safePlan, planExpiresAt: d.planExpiresAt ?? null });
          } catch { /* ignore */ }
          clearPromo();
          Alert.alert('تم الاشتراك!', 'تم تفعيل اشتراكك بنجاح 🎉');
          return;
        }
      } catch (err: unknown) {
        const errCode = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        if (errCode === 'PAYMENT_TOKEN_REQUIRED') {
          // Partial discount — fall through to Google Play / email
        } else {
          Alert.alert('خطأ', 'تعذّر تطبيق كود الخصم، حاول مرة أخرى');
          return;
        }
      }
    }

    // Android + Google Play Billing
    if (Platform.OS === 'android' && connected && iapKey) {
      const result = await purchasePlan(iapKey);
      if (result === 'success') {
        try {
          const planRes = await apiClient.get('/api/billing/plan');
          const d = (planRes.data as { data?: { plan?: string; planExpiresAt?: string } })?.data ?? planRes.data as { plan?: string; planExpiresAt?: string };
          const rawPlan = d?.plan;
          const safePlan =
            rawPlan === 'free' || rawPlan === 'pro' || rawPlan === 'yearly' || rawPlan === 'ultra' || rawPlan === 'ultra_yearly'
              ? rawPlan
              : null;
          if (safePlan) updateUser({ plan: safePlan, planExpiresAt: d.planExpiresAt ?? null });
        } catch { /* ignore */ }
        Alert.alert('تم الاشتراك!', 'تم تفعيل اشتراكك بنجاح 🎉');
      } else if (result === 'error') {
        Alert.alert('خطأ', 'تعذّر إتمام عملية الشراء، حاول مرة أخرى');
      }
      return;
    }

    // Fallback — iOS or no Google Play
    Alert.alert(
      `ترقية لـ ${plan.label}`,
      'للترقية تواصل معنا عبر البريد الإلكتروني وسنرسل لك رابط الدفع.',
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
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ backgroundColor: colors.hover, borderColor: colors.border }}
          className="w-9 h-9 rounded-xl border items-center justify-center"
        >
          {I18nManager.isRTL
            ? <ArrowRight size={16} color={colors.textMuted} />
            : <ArrowLeft  size={16} color={colors.textMuted} />}
        </Pressable>
        <View className="w-8 h-8 rounded-xl bg-brand/15 items-center justify-center">
          <Crown size={15} color={BRAND} />
        </View>
        <Text style={{ color: colors.text }} className="text-base font-bold">الاشتراك والخطة</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>

        {/* Current plan badge */}
        <View className="flex-row bg-brand/10 border border-brand/25 rounded-2xl px-4 py-3 items-center gap-2">
          <Crown size={16} color={BRAND} />
          <Text className="text-sm font-semibold text-brand flex-1">
            خطتك الحالية: {PLAN_LABELS[currentPlan] ?? currentPlan.toUpperCase()}
          </Text>
          {user?.planExpiresAt && (
            <Text style={{ color: colors.textMuted }} className="text-xs">
              تنتهي: {new Date(user.planExpiresAt).toLocaleDateString('ar-EG')}
            </Text>
          )}
        </View>

        {/* Billing toggle */}
        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="flex-row border rounded-2xl p-1.5 gap-1"
        >
          {billingOptions.map((b) => {
            const active = billing === b;
            return (
              <Pressable
                key={b}
                onPress={() => setBilling(b)}
                className="flex-row flex-1 items-center justify-center gap-1.5 py-2.5 rounded-xl"
                style={{ backgroundColor: active ? BRAND : 'transparent' }}
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
          const active = isActive(plan);
          const price = getPrice(plan);
          const savings = getSavings(plan);
          const discount = getDiscountedPrice(plan);
          const iapKey = billing === 'yearly' ? plan.iapYearly : plan.iapMonthly;
          const isPurchasing = iapKey ? purchasing === iapKey : false;

          return (
            <View
              key={plan.id}
              className="rounded-2xl border p-4 gap-3"
              style={{
                borderColor: active ? `${BRAND}40` : plan.id === 'pro' ? `${plan.color}25` : colors.border,
                backgroundColor: active ? `${BRAND}08` : colors.card,
              }}
            >
              {/* Plan header */}
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
                      {/* Discounted price */}
                      {discount ? (
                        <View className="items-end gap-0.5">
                          <Text style={{ color: colors.textMuted }} className="text-sm tabular-nums line-through">
                            {billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice} EGP
                          </Text>
                          <Text className="text-lg font-bold tabular-nums text-emerald-400">
                            {discount.final} EGP
                            <Text className="text-xs font-normal text-emerald-400">
                              {billing === 'yearly' ? '/سنة' : '/شهر'}
                            </Text>
                          </Text>
                          <View className="bg-emerald-500/15 px-1.5 py-0.5 rounded-md">
                            <Text className="text-[10px] font-bold text-emerald-400">
                              خصم {discount.percent}%
                            </Text>
                          </View>
                        </View>
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
                    </>
                  )}
                </View>
              </View>

              {/* Features */}
              <View className="gap-2">
                {plan.features.map((f, i) => (
                  <View key={i} className="flex-row items-center gap-2">
                    <Check size={13} color={GREEN} />
                    <Text style={{ color: colors.textSub }} className="text-xs">{f}</Text>
                  </View>
                ))}
              </View>

              {/* Upgrade button */}
              {!active && plan.id !== 'free' && (
                <Pressable
                  onPress={() => handleUpgrade(plan)}
                  disabled={isPurchasing}
                  className="flex-row py-2.5 rounded-xl items-center mt-1 justify-center gap-2"
                  style={{
                    backgroundColor: plan.color,
                    opacity: isPurchasing ? 0.7 : 1,
                  }}
                >
                  {isPurchasing && <ActivityIndicator size="small" color="#fff" />}
                  <Text className="text-sm font-bold text-white">
                    {isPurchasing
                      ? 'جارٍ الشراء...'
                      : `ترقية لـ ${plan.label} ${billing === 'yearly' ? '(سنوي)' : '(شهري)'}`}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}

        {/* ── Promo Code ─────────────────────────────────────────────────────── */}
        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="border rounded-2xl overflow-hidden"
        >
          <Pressable
            onPress={() => { setPromoOpen((v) => !v); if (promoOpen) clearPromo(); }}
            className="flex-row items-center gap-3 px-4 py-3.5"
          >
            <Tag size={15} color={promoResult ? '#4ade80' : colors.textMuted} />
            <Text style={{ color: promoResult ? '#4ade80' : colors.text }} className="text-sm font-medium flex-1">
              {promoResult ? `كود خصم مُطبَّق — خصم ${promoResult.percent}%` : 'عندك كود خصم؟'}
            </Text>
            {promoOpen
              ? <ChevronUp  size={14} color={colors.textMuted} />
              : <ChevronDown size={14} color={colors.textMuted} />}
          </Pressable>

          {promoOpen && (
            <View style={{ borderTopColor: colors.border }} className="border-t px-4 py-3 gap-3">
              <View className="flex-row gap-2">
                <View
                  style={{ backgroundColor: colors.hover, borderColor: promoError ? '#f87171' : promoResult ? '#4ade80' : colors.border }}
                  className="flex-row flex-1 items-center border rounded-xl px-3 gap-2"
                >
                  <TextInput
                    value={promoCode}
                    onChangeText={(t) => { setPromoCode(t.toUpperCase()); setPromoError(null); if (!t) setPromoResult(null); }}
                    placeholder="أدخل الكود"
                    placeholderTextColor={colors.textMuted}
                    style={{ color: colors.text, flex: 1, paddingVertical: 10, fontSize: 14, fontWeight: '600', letterSpacing: 1 }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!promoResult}
                  />
                  {promoCode.length > 0 && !promoResult && (
                    <Pressable onPress={clearPromo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <X size={14} color={colors.textMuted} />
                    </Pressable>
                  )}
                  {promoResult && <Check size={14} color="#4ade80" />}
                </View>

                <Pressable
                  onPress={promoResult ? clearPromo : validatePromo}
                  disabled={promoLoading || (!promoResult && !promoCode.trim())}
                  className="px-4 rounded-xl items-center justify-center"
                  style={{
                    backgroundColor: promoResult ? '#f8717120' : '#8b5cf6',
                    opacity: promoLoading || (!promoResult && !promoCode.trim()) ? 0.5 : 1,
                  }}
                >
                  {promoLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-sm font-bold" style={{ color: promoResult ? '#f87171' : '#fff' }}>
                      {promoResult ? 'إزالة' : 'تطبيق'}
                    </Text>
                  )}
                </Pressable>
              </View>

              {promoError && (
                <Text className="text-xs text-red-400">{promoError}</Text>
              )}

              {promoResult && (
                <View className="flex-row bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5 items-center gap-2">
                  <Tag size={13} color="#4ade80" />
                  <Text className="text-xs text-emerald-400 font-medium flex-1">
                    تم تطبيق الكود — ستحصل على خصم {promoResult.percent}% على الاشتراك
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <Text style={{ color: colors.textMuted }} className="text-xs text-center leading-5 px-4">
          {Platform.OS === 'android'
            ? 'الدفع عبر جوجل بلاي • يُجدَّد تلقائياً حتى الإلغاء'
            : 'للترقية تواصل معنا — الدفع عبر Paymob'}
        </Text>
      </ScrollView>
    </ScreenWrapper>
  );
}
