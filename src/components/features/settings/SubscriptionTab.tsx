import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Lock } from 'lucide-react';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { PLAN_PRICES } from '../../../lib/constants';

// ─── Types ─────────────────────────────────────────────────────────────────

type TierId = 'free' | 'pro' | 'ultra';
type PaidPlanId = 'pro_monthly' | 'pro_yearly' | 'ultra_monthly' | 'ultra_yearly';
type BillingPeriod = 'monthly' | 'yearly';

interface PlanFeature {
  key: string;
  unavailable?: boolean;
}

interface PlanConfig {
  id: TierId;
  nameKey: string;
  badgeKey?: string;
  savingsNoteKey?: string;
  highlighted?: boolean;
  features: PlanFeature[];
}

declare global {
  interface Window {
    google?: {
      payments: {
        api: {
          PaymentsClient: new (opts: { environment: 'TEST' | 'PRODUCTION' }) => {
            loadPaymentData: (req: unknown) => Promise<{
              paymentMethodData: { tokenizationData: { token: string } };
            }>;
          };
        };
      };
    };
  }
}

// ─── FeatureItem ─────────────────────────────────────────────────────────────

function FeatureItem({ featureKey, unavailable, t }: { featureKey: string; unavailable?: boolean; t: (k: string) => string }) {
  const text = t(`billing.features.${featureKey}`);
  return (
    <div className="flex items-center gap-2 text-sm">
      {unavailable ? (
        <X className="w-4 h-4 shrink-0 text-[var(--danger)]" aria-hidden />
      ) : (
        <Check className="w-4 h-4 shrink-0 text-[var(--success)]" aria-hidden />
      )}
      <span className={unavailable ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}>
        {text}
      </span>
    </div>
  );
}

// ─── Period switch (شهري | سنوي) ───────────────────────────────────────────

function PeriodSwitch({
  period,
  onPeriodChange,
  t,
}: {
  period: BillingPeriod;
  onPeriodChange: (p: BillingPeriod) => void;
  t: (k: string) => string;
}) {
  return (
    <div
      className="inline-flex rounded-xl bg-[var(--bg-input)] p-1 border border-[var(--border-subtle)]"
      role="tablist"
      aria-label={t('billing.billingPeriod')}
    >
      <button
        type="button"
        role="tab"
        aria-selected={period === 'monthly'}
        onClick={() => onPeriodChange('monthly')}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          period === 'monthly'
            ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
        }`}
      >
        {t('billing.monthly')}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={period === 'yearly'}
        onClick={() => onPeriodChange('yearly')}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          period === 'yearly'
            ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
        }`}
      >
        {t('billing.yearly')}
      </button>
    </div>
  );
}

// ─── PlanCard ──────────────────────────────────────────────────────────────

function getPaidPlanId(tier: 'pro' | 'ultra', period: BillingPeriod): PaidPlanId {
  return period === 'yearly' ? `${tier}_yearly` : `${tier}_monthly`;
}

interface PlanCardProps {
  plan: PlanConfig;
  index: number;
  period: BillingPeriod;
  onPeriodChange: (period: BillingPeriod) => void;
  currentPlan: string | null | undefined;
  planExpiresAt: string | null | undefined;
  discountPercent: number | null;
  getFinalPrice: (plan: PaidPlanId) => number;
  getBasePrice: (plan: PaidPlanId) => number;
  upgrading: boolean;
  onUpgrade: (plan: PaidPlanId) => void;
  onSelectPlan: (plan: PaidPlanId) => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}

function PlanCard({
  plan,
  index,
  period,
  onPeriodChange,
  currentPlan,
  planExpiresAt,
  discountPercent,
  getFinalPrice,
  getBasePrice,
  upgrading,
  onUpgrade,
  onSelectPlan,
  t,
}: PlanCardProps) {
  const isFree = plan.id === 'free';
  const paidPlanId = !isFree ? getPaidPlanId(plan.id as 'pro' | 'ultra', period) : null;
  const isCurrent =
    (isFree && (currentPlan === 'free' || !currentPlan)) ||
    (plan.id === 'pro' && (currentPlan === 'pro' || currentPlan === 'yearly' || currentPlan === 'annual')) ||
    (plan.id === 'ultra' && (currentPlan === 'ultra' || currentPlan === 'ultra_yearly' || currentPlan === 'ultra_annual'));

  const handleCta = () => {
    if (isCurrent && isFree) return;
    if (isFree || !paidPlanId) return;
    if (discountPercent === 100) {
      onUpgrade(paidPlanId);
      return;
    }
    onSelectPlan(paidPlanId);
  };

  const basePrice = paidPlanId ? getBasePrice(paidPlanId) : 0;
  const finalPrice = paidPlanId ? getFinalPrice(paidPlanId) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`relative flex flex-col rounded-2xl border p-6 bg-[var(--bg-card)] ${
        plan.highlighted
          ? 'border-2 border-[var(--brand)] md:scale-[1.02]'
          : 'border-[var(--border)]'
      }`}
      style={
        plan.highlighted
          ? { boxShadow: '0 0 30px rgba(124, 58, 237, 0.15)' }
          : undefined
      }
    >
      {plan.badgeKey && (
        <div className="absolute top-0 start-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="rounded-full bg-[var(--brand)] px-4 py-1 text-xs font-bold text-[var(--text-inverse)]">
            {t(`billing.${plan.badgeKey}`)}
          </span>
        </div>
      )}

      <h3 className="text-lg font-bold text-[var(--text-primary)] mt-2">
        {t(plan.nameKey)}
      </h3>

      {!isFree && (
        <div className="mt-4">
          <PeriodSwitch period={period} onPeriodChange={onPeriodChange} t={t} />
        </div>
      )}

      <div className="mt-4 flex items-baseline gap-1">
        {isFree ? (
          <span className="text-3xl font-black text-[var(--text-primary)] tabular-nums">
            {t('billing.free')}
          </span>
        ) : (
          <>
            <span className="text-4xl font-black text-[var(--text-primary)] tabular-nums">
              {finalPrice}
            </span>
            <span className="text-sm text-[var(--text-secondary)] self-end mb-2 ms-1">
              {t('billing.egp')}
            </span>
          </>
        )}
      </div>
      {!isFree && discountPercent != null && discountPercent < 100 && (
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-sm line-through text-[var(--text-muted)]">
            {basePrice} {t('billing.egp')}
          </span>
          <span className="rounded-full bg-[var(--success-bg)] text-[var(--success)] text-xs px-2 py-0.5 font-bold">
            -{discountPercent}%
          </span>
        </div>
      )}
      {!isFree && discountPercent === 100 && (
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <span className="text-sm line-through text-[var(--text-muted)]">
            {basePrice} {t('billing.egp')}
          </span>
          <span className="rounded-full bg-[var(--success-bg)] text-[var(--success)] text-xs px-2 py-0.5 font-bold">
            {t('billing.free')} 🎉
          </span>
        </div>
      )}
      {!isFree && (
        <span className="text-sm text-[var(--text-muted)]">
          / {period === 'yearly' ? t('billing.yearly') : t('billing.monthly')}
        </span>
      )}
      {!isFree && plan.savingsNoteKey && period === 'yearly' && !discountPercent && (
        <span className="mt-1 inline-block rounded-full bg-[var(--success-bg)] text-[var(--success)] text-xs px-2 py-0.5 w-fit">
          {t(`billing.${plan.savingsNoteKey}`)}
        </span>
      )}

      {currentPlan && currentPlan !== 'free' && planExpiresAt && isCurrent && (
        <p className="text-xs text-[var(--text-muted)] text-center mt-1">
          {t('billing.expiresOn', { date: new Date(planExpiresAt).toLocaleDateString('ar-EG') })}
        </p>
      )}

      <div className="border-t border-[var(--border)] my-4" aria-hidden />

      <ul className="flex flex-col gap-2">
        {plan.features.map((f) => (
          <li key={f.key}>
            <FeatureItem featureKey={f.key} unavailable={f.unavailable} t={t} />
          </li>
        ))}
      </ul>

      <div className="mt-6 flex-1 flex flex-col justify-end">
        <Button
          type="button"
          variant={isFree ? 'secondary' : 'primary'}
          fullWidth
          className="rounded-xl py-3 font-bold"
          disabled={isFree || upgrading}
          loading={upgrading}
          icon={isCurrent ? <Check className="w-4 h-4" /> : undefined}
          iconPosition="left"
          onClick={handleCta}
        >
          {isCurrent
            ? t('billing.currentPlan')
            : isFree
              ? t('billing.planFree')
              : discountPercent === 100
                ? t('billing.activateNow')
                : discountPercent != null && discountPercent > 0
                  ? t('billing.payDiscounted', { price: finalPrice })
                  : t('billing.startNow')}
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Checkout Modal ────────────────────────────────────────────────────────

interface CheckoutModalProps {
  open: boolean;
  plan: PaidPlanId;
  getFinalPrice: (plan: PaidPlanId) => number;
  discountCode: string;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
  onSuccessMessage: (message: string) => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}

function CheckoutModal({
  open,
  plan,
  getFinalPrice,
  discountCode,
  onClose,
  onSuccess,
  onError,
  onSuccessMessage,
  t,
}: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const finalPrice = getFinalPrice(plan);
  const planLabel =
    plan === 'pro_monthly'
      ? t('billing.planProMonthly')
      : plan === 'pro_yearly'
        ? t('billing.planProYearly')
        : plan === 'ultra_monthly'
          ? t('billing.planUltraMonthly')
          : t('billing.planUltraYearly');

  const handleGooglePay = async () => {
    const g = window.google?.payments?.api;
    if (!g) {
      onError(t('billing.upgradeFailed'));
      return;
    }
    const paymentsClient = new g.PaymentsClient({ environment: 'TEST' });
    const priceStr = finalPrice.toFixed(2);
    const paymentRequest = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [
        {
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['MASTERCARD', 'VISA'],
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
              gateway: 'paymob',
              gatewayMerchantId: 'YOUR_KEY',
            },
          },
        },
      ],
      merchantInfo: {
        merchantId: 'YOUR_MERCHANT_ID',
        merchantName: 'Borsa',
      },
      transactionInfo: {
        totalPriceStatus: 'FINAL' as const,
        totalPrice: priceStr,
        currencyCode: 'EGP',
        countryCode: 'EG',
      },
    };

    setLoading(true);
    try {
      const paymentData = await paymentsClient.loadPaymentData(paymentRequest);
      const token = paymentData.paymentMethodData?.tokenizationData?.token;
      await api.post('/billing/upgrade', {
        plan,
        paymentToken: token,
        ...(discountCode.trim() ? { discountCode: discountCode.trim() } : {}),
      });
      onSuccessMessage(t('billing.upgradeSuccess'));
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: string }).statusCode;
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (statusCode === 'CANCELED') return;
      onError(code ? t(`billing.errors.${code}`, { defaultValue: t('billing.upgradeFailed') }) : t('billing.upgradeFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-primary)]/80 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="checkout-modal-title" className="text-xl font-bold text-[var(--text-primary)] mb-4">
            {t('billing.completePayment')}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {planLabel} — {finalPrice} {t('billing.egp')}
          </p>

          <Button
            type="button"
            variant="primary"
            fullWidth
            className="rounded-xl py-3 font-bold mb-2"
            loading={loading}
            disabled={loading}
            onClick={handleGooglePay}
          >
            Google Pay
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)] mt-2">
            <Lock className="w-3.5 h-3.5" aria-hidden />
            {t('billing.securePayment')}
          </p>

          <Button
            type="button"
            variant="ghost"
            fullWidth
            className="mt-4"
            onClick={onClose}
          >
            {t('common.cancel')}
          </Button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─── Plans config ───────────────────────────────────────────────────────────

function getBasePriceForPlan(planId: PaidPlanId): number {
  switch (planId) {
    case 'pro_monthly':
      return PLAN_PRICES.pro;
    case 'pro_yearly':
      return PLAN_PRICES.yearly;
    case 'ultra_monthly':
      return PLAN_PRICES.ultra;
    case 'ultra_yearly':
      return PLAN_PRICES.ultra_yearly;
    default:
      return PLAN_PRICES.pro;
  }
}

function getPlansConfig(): PlanConfig[] {
  return [
    {
      id: 'free',
      nameKey: 'billing.planFreeName',
      features: [
        { key: 'freeWatchlist' },
        { key: 'freePortfolio' },
        { key: 'freeGoals' },
        { key: 'freeAi' },
        { key: 'delayed10' },
      ],
    },
    {
      id: 'pro',
      nameKey: 'billing.planPro',
      badgeKey: 'mostPopular',
      savingsNoteKey: 'equivalentPro',
      highlighted: true,
      features: [
        { key: 'proWatchlist' },
        { key: 'proPortfolio' },
        { key: 'proGoals' },
        { key: 'proAi' },
        { key: 'realtimePrices' },
        { key: 'priceAlerts' },
        { key: 'shariaMode' },
      ],
    },
    {
      id: 'ultra',
      nameKey: 'billing.planUltra',
      badgeKey: 'bestValue',
      savingsNoteKey: 'equivalentUltra',
      features: [
        { key: 'ultraWatchlist' },
        { key: 'ultraPortfolio' },
        { key: 'ultraGoals' },
        { key: 'ultraAi' },
        { key: 'realtimePrices' },
        { key: 'priceAlerts' },
        { key: 'shariaMode' },
        { key: 'prioritySupport' },
        { key: 'earlyAccess' },
      ],
    },
  ];
}

// ─── SubscriptionTab (main) ────────────────────────────────────────────────

export function SubscriptionTab() {
  const { t } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const currentPlan = user?.plan ?? 'free';
  const planExpiresAt = user?.planExpiresAt;

  const [loading, setLoading] = useState(true);
  const [planData, setPlanData] = useState<unknown>(null);
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [modalPlan, setModalPlan] = useState<PaidPlanId | null>(null);
  const [billingMessage, setBillingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [proPeriod, setProPeriod] = useState<BillingPeriod>('yearly');
  const [ultraPeriod, setUltraPeriod] = useState<BillingPeriod>('yearly');

  useEffect(() => {
    const controller = new AbortController();
    api
      .get('/billing/plan', { signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted)
          setPlanData((res.data as { data?: unknown })?.data ?? res.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPlanData(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const handleValidateCode = async () => {
    if (!discountCode.trim()) return;
    setValidating(true);
    setBillingMessage(null);
    try {
      const res = await api.post('/billing/validate-discount', { code: discountCode.trim() });
      const data = (res.data as { data?: { percent?: number } })?.data ?? res.data;
      const percent = (data as { percent?: number }).percent ?? 0;
      setDiscountPercent(percent);
      setBillingMessage({ type: 'success', text: t('billing.codeSuccess') });
    } catch {
      setDiscountPercent(null);
      setBillingMessage({ type: 'error', text: t('billing.codeInvalid') });
    } finally {
      setValidating(false);
    }
  };

  const getBasePrice = (plan: PaidPlanId): number => getBasePriceForPlan(plan);

  const getFinalPrice = (plan: PaidPlanId): number => {
    const base = getBasePriceForPlan(plan);
    if (discountPercent == null) return base;
    return Math.round(base * (1 - discountPercent / 100));
  };

  const handleUpgrade = async (plan: PaidPlanId) => {
    if (discountPercent === 100) {
      setUpgrading(true);
      setBillingMessage(null);
      try {
        await api.post('/billing/upgrade', {
          plan,
          discountCode: discountCode.trim(),
        });
        setBillingMessage({ type: 'success', text: t('billing.upgradeSuccess') });
        await handleUpgradeSuccess();
        setModalPlan(null);
      } catch (err: unknown) {
        const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        const errMsg = code
          ? t(`billing.errors.${code}`, { defaultValue: t('billing.upgradeFailed') })
          : t('billing.upgradeFailed');
        setBillingMessage({ type: 'error', text: errMsg });
      } finally {
        setUpgrading(false);
      }
      return;
    }
  };

  const handleSelectPlan = (plan: PaidPlanId) => {
    setModalPlan(plan);
  };

  const handleUpgradeSuccess = async () => {
    try {
      const res = await api.get('/user/profile');
      const data = (res.data as { data?: unknown })?.data ?? res.data;
      const nextUser = (data as { user?: typeof user })?.user ?? data;
      if (nextUser && setUser) setUser(nextUser as NonNullable<typeof user>);
    } catch {
      // ignore
    }
  };

  const handleBillingError = (message: string) => {
    setBillingMessage({ type: 'error', text: message });
  };
  const handleBillingSuccess = (message: string) => {
    setBillingMessage({ type: 'success', text: message });
  };

  const plans = getPlansConfig();

  if (loading) {
    return (
      <div className="p-6 text-center text-[var(--text-muted)]">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8" dir="rtl">
      <header className="text-center">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          {t('billing.title')}
        </h2>
        <p className="mt-1 text-[var(--text-secondary)]">
          {t('billing.subtitle')}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-4">
        {plans.map((plan, index) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            index={index}
            period={plan.id === 'pro' ? proPeriod : plan.id === 'ultra' ? ultraPeriod : 'monthly'}
            onPeriodChange={plan.id === 'pro' ? setProPeriod : plan.id === 'ultra' ? setUltraPeriod : () => {}}
            currentPlan={currentPlan}
            planExpiresAt={planExpiresAt}
            discountPercent={discountPercent}
            getFinalPrice={getFinalPrice}
            getBasePrice={getBasePrice}
            upgrading={upgrading}
            onUpgrade={handleUpgrade}
            onSelectPlan={handleSelectPlan}
            t={t}
          />
        ))}
      </div>

      {!showDiscount ? (
        <div className="text-center">
          <Button
            type="button"
            variant="link"
            className="text-sm underline underline-offset-2"
            onClick={() => setShowDiscount(true)}
          >
            {t('billing.hasDiscount')}
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-2 max-w-sm mx-auto">
          <div className="flex gap-2 w-full">
            <Input
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              placeholder={t('billing.placeholderCode')}
              wrapperClassName="flex-1"
              inputClassName="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleValidateCode}
              loading={validating}
              disabled={validating}
            >
              {t('billing.applyCode')}
            </Button>
          </div>
          {discountPercent != null && (
            <div className="flex items-center gap-2 text-[var(--success)] text-sm">
              <Check className="w-4 h-4" aria-hidden />
              <span>{t('billing.codeSuccess')}</span>
            </div>
          )}
        </div>
      )}

      <CheckoutModal
        open={modalPlan !== null}
        plan={modalPlan ?? 'pro_yearly'}
        getFinalPrice={getFinalPrice}
        discountCode={discountCode}
        onClose={() => setModalPlan(null)}
        onSuccess={handleUpgradeSuccess}
        onError={handleBillingError}
        onSuccessMessage={handleBillingSuccess}
        t={t}
      />

      {billingMessage && (
        <p
          className={`text-center text-sm ${
            billingMessage.type === 'success' ? 'text-[var(--success)]' : 'text-[var(--danger)]'
          }`}
          role="status"
        >
          {billingMessage.text}
        </p>
      )}
    </div>
  );
}
