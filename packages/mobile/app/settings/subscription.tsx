import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Linking, Alert,
  Platform, ActivityIndicator, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Crown, Zap, Check, Tag, X, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
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
  },
] as const;

interface DiscountResult {
  percent: number;
  finalPrice: number;
  discountAmount: number;
  code: string;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const { colors, isRTL } = useTheme();
  const { t } = useTranslation();
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

  const getPlanLabel = (plan: string) => {
    const labels: Record<string, string> = {
      free: t('subscription.free'),
      pro: t('subscription.planProMonthly'),
      annual: t('subscription.planProYearly'),
      ultra: t('subscription.planUltraMonthly'),
      ultra_annual: t('subscription.planUltraYearly'),
      yearly: t('subscription.planProYearly'),
      ultra_yearly: t('subscription.planUltraYearly'),
    };
    return labels[plan] ?? plan.toUpperCase();
  };

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
    if (billing === 'monthly') return { amount: plan.monthlyPrice, label: t('subscription.perMonth') };
    const monthly = Math.round(plan.yearlyPrice / 12);
    return { amount: monthly, label: t('subscription.perMonth'), yearly: plan.yearlyPrice };
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
      if (errorCode === 'INVALID_DISCOUNT_CODE') setPromoError(t('subscription.errorInvalidCode'));
      else if (errorCode === 'DISCOUNT_ALREADY_USED') setPromoError(t('subscription.errorAlreadyUsed'));
      else setPromoError(t('subscription.errorVerify'));
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
          Alert.alert(t('subscription.successTitle'), t('subscription.successMsg'));
          return;
        }
      } catch (err: unknown) {
        const errCode = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        if (errCode === 'PAYMENT_TOKEN_REQUIRED') {
          // Partial discount — fall through to Google Play / email
        } else {
          Alert.alert(t('common.error'), t('subscription.errorApplyCode'));
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
        Alert.alert(t('subscription.successTitle'), t('subscription.successMsg'));
      } else if (result === 'error') {
        Alert.alert(t('common.error'), t('subscription.purchaseError'));
      }
      return;
    }

    // Fallback — iOS or no Google Play
    Alert.alert(
      t('subscription.upgradeAlertTitle', { plan: plan.label }),
      t('subscription.upgradeAlertMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('subscription.contactUs'), onPress: () => Linking.openURL('mailto:support@borsa.app') },
      ],
    );
  };

  return (
    <ScreenWrapper padded={false}>
      {/* Header */}
      <View
        style={{ borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }}
        className="items-center gap-3 px-4 pt-5 pb-4 border-b"
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ backgroundColor: colors.hover, borderColor: colors.border }}
          className="w-9 h-9 rounded-xl border items-center justify-center"
        >
          {isRTL
            ? <ArrowRight size={16} color={colors.textMuted} />
            : <ArrowLeft  size={16} color={colors.textMuted} />}
        </Pressable>
        <View className="w-8 h-8 rounded-xl bg-brand/15 items-center justify-center">
          <Crown size={15} color={BRAND} />
        </View>
        <Text style={{ color: colors.text }} className="text-base font-bold">{t('subscription.title')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>

        {/* Current plan badge */}
        <View className="flex-row bg-brand/10 border border-brand/25 rounded-2xl px-4 py-3 items-center gap-2">
          <Crown size={16} color={BRAND} />
          <Text className="text-sm font-semibold text-brand flex-1">
            {t('subscription.current')}: {getPlanLabel(currentPlan)}
          </Text>
          {user?.planExpiresAt && (
            <Text style={{ color: colors.textMuted }} className="text-xs">
              {t('subscription.expires')}: {new Date(user.planExpiresAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
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
                  {b === 'monthly' ? t('subscription.monthly') : t('subscription.yearly')}
                </Text>
                {b === 'yearly' && !active && (
                  <View className="bg-emerald-500/20 px-1.5 py-0.5 rounded-md">
                    <Text className="text-[10px] font-bold text-emerald-400">{t('subscription.freeMonths')}</Text>
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
                      <Text className="text-xs font-bold text-brand">{t('subscription.currentBadge')}</Text>
                    </View>
                  )}
                </View>

                <View className="items-end gap-0.5">
                  {price === null ? (
                    <Text style={{ color: colors.text }} className="text-lg font-bold">{t('subscription.free')}</Text>
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
                              {t(billing === 'yearly' ? 'subscription.perYear' : 'subscription.perMonth')}
                            </Text>
                          </Text>
                          <View className="bg-emerald-500/15 px-1.5 py-0.5 rounded-md">
                            <Text className="text-[10px] font-bold text-emerald-400">
                              {t('subscription.discountPct', { pct: discount.percent })}
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
                              {price.yearly} EGP{t('subscription.perYear')}
                            </Text>
                          )}
                          {savings && (
                            <View className="bg-emerald-500/15 px-1.5 py-0.5 rounded-md mt-0.5">
                              <Text className="text-[10px] font-bold text-emerald-400">
                                {t('subscription.savedAmount', { amount: savings.saved })}
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
                {(t(`subscription.${plan.id}Features`, { returnObjects: true }) as string[]).map((f: string, i: number) => (
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
                      ? t('subscription.purchasing')
                      : billing === 'yearly'
                        ? t('subscription.upgradeYearly', { plan: plan.label })
                        : t('subscription.upgradeMonthly', { plan: plan.label })}
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
              {promoResult ? t('subscription.promoApplied', { pct: promoResult.percent }) : t('subscription.promoCode')}
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
                    placeholder={t('subscription.promoPlaceholder')}
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
                      {promoResult ? t('subscription.removePromo') : t('subscription.applyPromo')}
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
                    {t('subscription.promoSuccess', { pct: promoResult.percent })}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <Text style={{ color: colors.textMuted }} className="text-xs text-center leading-5 px-4">
          {Platform.OS === 'android'
            ? t('subscription.googlePlayNote')
            : t('subscription.paymobNote')}
        </Text>
      </ScrollView>
    </ScreenWrapper>
  );
}
