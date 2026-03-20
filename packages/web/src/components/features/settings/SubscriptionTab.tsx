import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { PlanCard } from './subscription/PlanCard';
import { PricingToggle } from './subscription/PricingToggle';
import { CheckoutModal } from './subscription/CheckoutModal';
import { CompareFeatureModal } from './subscription/CompareFeatureModal';
import { ComparisonTable } from './subscription/ComparisonTable';
import { TrustSection } from './subscription/TrustSection';
import { DiscountSection } from './subscription/DiscountSection';
import { getPlansConfig, getBasePriceForPlan } from './subscription/plansConfig';
import { PaidPlanId, BillingPeriod } from './subscription/types';

const DISCOUNT_CODE_REGEX = /^[A-Z0-9]{18,30}$/;

export function SubscriptionTab() {
  const { t } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const currentPlan = user?.plan ?? 'free';
  const planExpiresAt = user?.planExpiresAt;

  const [loading, setLoading] = useState(true);
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [discountCodeError, setDiscountCodeError] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [modalPlan, setModalPlan] = useState<PaidPlanId | null>(null);
  const [billingMessage, setBillingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('yearly');
  const [compareFeatureModal, setCompareFeatureModal] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/billing/plan', { signal: controller.signal })
      .catch((err) => { if (import.meta.env.DEV) console.error('Billing plan fetch failed:', err); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const validateDiscountCode = (code: string): string | null => {
    if (code.length < 18) return t('billing.codeErrorTooShort', { defaultValue: 'الكود لازم يكون 18 حرف على الأقل' });
    if (code.length > 30) return t('billing.codeErrorTooLong', { defaultValue: 'الكود لازم يكون 30 حرف على الأكثر' });
    if (!DISCOUNT_CODE_REGEX.test(code)) return t('billing.codeErrorInvalidChars', { defaultValue: 'الكود يحتوي على رموز غير مسموح بها' });
    return null;
  };

  const handleCodeChange = (raw: string) => {
    const sanitized = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 30);
    setDiscountCode(sanitized);
    setDiscountCodeError(sanitized.length > 0 ? (sanitized.length < 18 ? t('billing.codeErrorTooShort', { defaultValue: 'الكود لازم يكون 18 حرف على الأقل' }) : null) : null);
    if (discountPercent !== null) setDiscountPercent(null);
  };

  const handleValidateCode = async () => {
    const code = discountCode.trim();
    if (!code) return;
    const err = validateDiscountCode(code);
    if (err) { setDiscountCodeError(err); return; }
    setValidating(true);
    setBillingMessage(null);
    try {
      const res = await api.post('/billing/validate-discount', { code });
      const data = (res.data as { data?: { percent?: number } })?.data ?? res.data;
      setDiscountPercent((data as { percent?: number }).percent ?? 0);
      setBillingMessage({ type: 'success', text: t('billing.codeSuccess') });
    } catch {
      setDiscountPercent(null);
      setBillingMessage({ type: 'error', text: t('billing.codeInvalid') });
    } finally {
      setValidating(false);
    }
  };

  const getBasePrice = (plan: PaidPlanId) => getBasePriceForPlan(plan);
  const getFinalPrice = (plan: PaidPlanId): number => {
    const base = getBasePriceForPlan(plan);
    if (discountPercent == null) return base;
    return Math.round(base * (1 - discountPercent / 100));
  };

  const handleUpgradeSuccess = async () => {
    try {
      const res = await api.get('/user/profile');
      const data = (res.data as { data?: unknown })?.data ?? res.data;
      const nextUser = (data as { user?: typeof user })?.user ?? data;
      if (nextUser && setUser) setUser(nextUser as NonNullable<typeof user>);
    } catch { /* ignore */ }
  };

  const handleUpgrade = async (plan: PaidPlanId) => {
    if (discountPercent !== 100) return;
    setUpgrading(true);
    setBillingMessage(null);
    try {
      await api.post('/billing/upgrade', { plan, discountCode: discountCode.trim() });
      setBillingMessage({ type: 'success', text: t('billing.upgradeSuccess') });
      await handleUpgradeSuccess();
      setModalPlan(null);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setBillingMessage({ type: 'error', text: code ? t(`billing.errors.${code}`, { defaultValue: t('billing.upgradeFailed') }) : t('billing.upgradeFailed') });
    } finally {
      setUpgrading(false);
    }
  };

  const plans = getPlansConfig();

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 space-y-12 pb-24" dir="rtl">
        <div className="h-10 w-48 bg-[var(--bg-secondary)] rounded-xl animate-pulse mx-auto" />
        <div className="h-12 w-64 bg-[var(--bg-secondary)] rounded-full animate-pulse mx-auto" />
        <div className="flex flex-wrap justify-center gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-full max-w-[320px] h-[560px] rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 pb-24" dir="rtl">
      <header className="text-center pt-6 mb-24">
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
          {t('billing.title')}
        </h1>
        <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto mt-6">
          {t('billing.subtitle')}
        </p>
      </header>

      <div className="flex justify-center mb-8">
        <PricingToggle period={billingPeriod} onPeriodChange={setBillingPeriod} t={t} />
      </div>

      <div className="flex flex-col md:flex-row justify-center gap-6 md:gap-8 items-stretch mb-24">
        {plans.map((plan, index) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            index={index}
            period={billingPeriod}
            currentPlan={currentPlan}
            planExpiresAt={planExpiresAt}
            discountPercent={discountPercent}
            getFinalPrice={getFinalPrice}
            getBasePrice={getBasePrice}
            upgrading={upgrading}
            onUpgrade={handleUpgrade}
            onSelectPlan={setModalPlan}
            t={t}
          />
        ))}
      </div>

      <div className="text-center mb-12">
        <DiscountSection
          showDiscount={showDiscount}
          discountCode={discountCode}
          discountCodeError={discountCodeError}
          discountPercent={discountPercent}
          validating={validating}
          onShowDiscount={() => setShowDiscount(true)}
          onCodeChange={handleCodeChange}
          onValidate={handleValidateCode}
          t={t}
        />
      </div>

      <div className="mb-24">
        <ComparisonTable t={t} onFeatureClick={setCompareFeatureModal} />
      </div>

      <TrustSection t={t} />

      <CheckoutModal
        open={modalPlan !== null}
        plan={modalPlan ?? 'pro_yearly'}
        getFinalPrice={getFinalPrice}
        discountCode={discountCode}
        onClose={() => setModalPlan(null)}
        onSuccess={handleUpgradeSuccess}
        onError={(msg) => setBillingMessage({ type: 'error', text: msg })}
        onSuccessMessage={(msg) => setBillingMessage({ type: 'success', text: msg })}
        t={t}
      />

      {compareFeatureModal && (
        <CompareFeatureModal
          featureKey={compareFeatureModal}
          onClose={() => setCompareFeatureModal(null)}
          t={t}
        />
      )}

      {billingMessage && (
        <p
          className={`text-center text-sm mt-4 ${billingMessage.type === 'success' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}
          role="status"
        >
          {billingMessage.text}
        </p>
      )}
    </div>
  );
}
