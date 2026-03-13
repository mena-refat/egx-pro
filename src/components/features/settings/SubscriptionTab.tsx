import { useState, useEffect, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Lock, BarChart3, Brain, Bell, TrendingUp, Shield, Sparkles, Zap } from 'lucide-react';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { PLAN_PRICES, YEARLY_SAVINGS_PERCENT } from '../../../lib/constants';

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

// ─── FeatureItem (with optional icon, animated check) ─────────────────────────

const FEATURE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  freeNoWatchlist: BarChart3,
  freePortfolio: BarChart3,
  freeGoals: BarChart3,
  proWatchlist: BarChart3,
  proPortfolio: BarChart3,
  proGoals: BarChart3,
  ultraWatchlist: BarChart3,
  ultraPortfolio: BarChart3,
  ultraGoals: BarChart3,
  freeAi: Brain,
  proAi: Brain,
  ultraAi: Brain,
  priceAlerts: Bell,
  realtimePrices: TrendingUp,
  delayed10: TrendingUp,
  shariaMode: Shield,
  prioritySupport: Sparkles,
  earlyAccess: Zap,
};

function FeatureItem({ featureKey, unavailable, t }: { featureKey: string; unavailable?: boolean; t: (k: string) => string }) {
  const text = t(`billing.features.${featureKey}`);
  const Icon = FEATURE_ICONS[featureKey];
  return (
    <div className="flex items-center gap-3 text-sm leading-[1.6]">
      {unavailable ? (
        <X className="w-[18px] h-[18px] shrink-0 text-[var(--danger)]" aria-hidden />
      ) : Icon ? (
        <Icon className="w-[18px] h-[18px] shrink-0 text-[var(--brand)] opacity-90" aria-hidden />
      ) : (
        <span className="flex shrink-0 w-[18px] h-[18px] rounded-full bg-[var(--success-bg)] flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-[var(--success)]" strokeWidth={3} aria-hidden />
        </span>
      )}
      <span className={unavailable ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}>
        {text}
      </span>
    </div>
  );
}

// ─── PricingToggle (شهري / سنوي) ───────────────────────────────────────────

function PricingToggle({
  period,
  onPeriodChange,
  t,
}: {
  period: BillingPeriod;
  onPeriodChange: (p: BillingPeriod) => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const savePercent = YEARLY_SAVINGS_PERCENT.pro;
  return (
    <div className="flex flex-col items-center gap-2 mb-8">
      <div
        className="inline-flex rounded-full p-1 bg-[var(--bg-secondary)] border border-[var(--border)] shadow-sm"
        role="tablist"
        aria-label={t('billing.billingPeriod')}
      >
        <button
          type="button"
          role="tab"
          aria-selected={period === 'monthly'}
          onClick={() => onPeriodChange('monthly')}
          className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-200 ${
            period === 'monthly'
              ? 'bg-[var(--brand)] text-[var(--text-inverse)] shadow-md'
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
          className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
            period === 'yearly'
              ? 'bg-[var(--brand)] text-[var(--text-inverse)] shadow-md'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          {t('billing.yearly')}
          <span className="rounded-full bg-[var(--success)] px-2 py-0.5 text-xs font-bold text-white shrink-0">
            {t('billing.yearlySave', { percent: savePercent })}
          </span>
        </button>
      </div>
      <p className="text-[13px] text-[var(--text-muted)]">{t('billing.billingNote')}</p>
    </div>
  );
}

// ─── PricingCard (PlanCard) ─────────────────────────────────────────────────

function getPaidPlanId(tier: 'pro' | 'ultra', period: BillingPeriod): PaidPlanId {
  return period === 'yearly' ? `${tier}_yearly` : `${tier}_monthly`;
}

function monthlyEquivalent(yearlyPrice: number): number {
  return Math.round((yearlyPrice / 12) * 100) / 100;
}

interface PlanCardProps {
  plan: PlanConfig;
  index: number;
  period: BillingPeriod;
  currentPlan: string | null | undefined;
  planExpiresAt: string | null | undefined;
  discountPercent: number | null;
  getFinalPrice: (plan: PaidPlanId) => number;
  getBasePrice: (plan: PaidPlanId) => number;
  upgrading: boolean;
  onUpgrade: (plan: PaidPlanId) => void;
  onSelectPlan: (plan: PaidPlanId) => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
  /** React key – not passed to component */
  key?: string | number;
}

function PlanCard({
  plan,
  index,
  period,
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
  const isYearly = period === 'yearly';
  const yearlyEquivalent = isYearly && paidPlanId && (plan.id === 'pro' || plan.id === 'ultra')
    ? monthlyEquivalent(finalPrice)
    : 0;
  const savingsPercent = plan.id === 'pro' ? YEARLY_SAVINGS_PERCENT.pro : plan.id === 'ultra' ? YEARLY_SAVINGS_PERCENT.ultra : 0;

  const ctaLabel = isCurrent
    ? t('billing.currentPlan')
    : isFree
      ? t('billing.ctaStartFree')
      : plan.id === 'pro'
        ? t('billing.ctaUpgradePro')
        : t('billing.ctaGetUltra');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.25 }}
      whileHover={{ y: -6 }}
      className={`relative flex flex-col w-full max-w-[320px] min-h-[560px] rounded-[20px] overflow-hidden border transition-all duration-200 ease-out ${
        isFree
          ? 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] hover:border-[var(--border)] hover:shadow-lg'
          : plan.highlighted
            ? 'bg-[var(--bg-card)] border-2 border-[var(--brand)] shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:shadow-[0_16px_48px_rgba(124,58,237,0.15)]'
            : 'bg-[var(--bg-card)] border-[var(--border)] shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)]'
      }`}
    >
      {plan.badgeKey && (
        <div className="absolute top-0 end-0 z-10 pt-4 pe-4">
          <span className="rounded-full bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
            {t(`billing.${plan.badgeKey}`)}
          </span>
        </div>
      )}
      <div className="flex flex-col flex-1 p-8">
        <h3 className="text-[22px] font-bold leading-tight" style={{ color: isFree ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
          {t(plan.nameKey)}
        </h3>

        <div
          className={`mt-4 rounded-xl px-4 py-4 flex flex-col justify-center ${
            isFree ? 'bg-[var(--bg-card)]/80' : 'bg-[var(--bg-secondary)]'
          }`}
        >
          {isFree ? (
            <span className="text-[48px] font-bold text-[var(--text-primary)] tabular-nums leading-none">
              {t('billing.free')}
            </span>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <div className="flex items-baseline gap-2">
                  <span className="text-[48px] font-bold tabular-nums tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
                    {finalPrice.toLocaleString()}
                  </span>
                  <span className="text-[14px] opacity-70 whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                    {t('billing.egp')} {isYearly ? t('billing.perYear') : t('billing.perMonth')}
                  </span>
                </div>
              </div>
              {isYearly && !discountPercent && (
                <div className="flex items-center justify-between gap-2 mt-1 min-w-0">
                  <span className="text-[14px] font-medium whitespace-nowrap" style={{ color: 'var(--success)' }}>
                    <span>{t('billing.perMonth')}</span>{' '}
                    <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>{yearlyEquivalent} / ≈</span>
                  </span>
                  {savingsPercent > 0 && (
                    <span className="rounded-full bg-[var(--success-bg)] text-[var(--success)] text-xs font-semibold px-2 py-0.5 shrink-0">
                      {t('billing.yearlySave', { percent: savingsPercent })}
                    </span>
                  )}
                </div>
              )}
              {discountPercent != null && discountPercent < 100 && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-sm line-through opacity-60" style={{ color: 'var(--text-primary)' }}>
                    {basePrice} {t('billing.egp')}
                  </span>
                  <span className="rounded-full bg-[var(--success-bg)] text-[var(--success)] text-xs px-2 py-0.5 font-semibold">
                    -{discountPercent}%
                  </span>
                </div>
              )}
              {discountPercent === 100 && (
                <span className="mt-2 inline-block rounded-full bg-[var(--success-bg)] text-[var(--success)] text-xs px-2 py-0.5 font-semibold w-fit">
                  {t('billing.free')} 🎉
                </span>
              )}
            </>
          )}
        </div>

        {currentPlan && currentPlan !== 'free' && planExpiresAt && isCurrent && (
          <p className="text-[13px] text-[var(--text-muted)] text-center mt-2">
            {t('billing.expiresOn', { date: new Date(planExpiresAt).toLocaleDateString('ar-EG') })}
          </p>
        )}

        <div className="border-t border-[var(--border)] mt-4" aria-hidden />

        <ul className="flex flex-col gap-3 mt-6">
          {plan.features.map((f) => (
            <li key={f.key}>
              <FeatureItem featureKey={f.key} unavailable={f.unavailable} t={t} />
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }} className="w-full">
            <Button
              type="button"
              variant={isFree ? 'secondary' : 'primary'}
              fullWidth
              className="h-12 rounded-[12px] font-semibold transition-shadow duration-200 hover:shadow-lg"
              style={!isFree && !isCurrent ? { background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-hover) 100%)' } : undefined}
              disabled={isFree || upgrading}
              loading={upgrading}
              icon={isCurrent ? <Check className="w-4 h-4" /> : undefined}
              iconPosition="left"
              onClick={handleCta}
            >
              {isCurrent ? ctaLabel : discountPercent === 100 ? t('billing.activateNow') : discountPercent != null && discountPercent > 0 ? t('billing.payDiscounted', { price: finalPrice }) : ctaLabel}
            </Button>
          </motion.div>
        </div>
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

// ─── Feature explain modal (مقارنة الخطط) ───────────────────────────────────

function CompareFeatureModal({
  featureKey,
  onClose,
  t,
}: {
  featureKey: string;
  onClose: () => void;
  t: (k: string) => string;
}) {
  const title = t(`billing.${featureKey}`);
  const descKey = `${featureKey}Desc`;
  const description = t(`billing.${descKey}`);
  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-explain-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 id="feature-explain-title" className="text-lg font-bold text-[var(--text-primary)] mb-3">
            {title}
          </h3>
          <p className="text-[var(--text-secondary)] text-[15px] leading-[1.6]">
            {description}
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4 w-full"
            onClick={onClose}
          >
            {t('billing.compareFeatureClose')}
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
        { key: 'freeNoWatchlist' },
        { key: 'freePortfolio' },
        { key: 'freeGoals' },
        { key: 'freeAi' },
        { key: 'shariaMode' },
        { key: 'delayed10' },
      ],
    },
    {
      id: 'pro',
      nameKey: 'billing.planPro',
      badgeKey: 'mostUsed',
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
      badgeKey: 'forProfessionals',
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
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('yearly');
  const [compareFeatureModal, setCompareFeatureModal] = useState<string | null>(null);

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

  const sectionGap = '96px';
  const componentGap = '48px';

  return (
    <div className="max-w-[1200px] mx-auto px-6 pb-24" dir="rtl">
      <header className="text-center pt-6" style={{ marginBottom: sectionGap }}>
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
          {t('billing.title')}
        </h1>
        <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto mt-6">
          {t('billing.subtitle')}
        </p>
      </header>

      <div className="flex justify-center" style={{ marginBottom: '32px' }}>
        <PricingToggle period={billingPeriod} onPeriodChange={setBillingPeriod} t={t} />
      </div>

      <div
        className="flex flex-col md:flex-row justify-center gap-6 md:gap-8 items-stretch"
        style={{ marginBottom: sectionGap }}
      >
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
            onSelectPlan={handleSelectPlan}
            t={t}
          />
        ))}
      </div>

      <div className="text-center" style={{ marginBottom: componentGap }}>
        {!showDiscount ? (
          <button
            type="button"
            onClick={() => setShowDiscount(true)}
            className="text-sm text-[var(--brand)] hover:text-[var(--brand-hover)] font-medium underline underline-offset-2 transition-colors"
          >
            {t('billing.hasDiscount')}
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4 max-w-sm mx-auto p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
            <div className="flex gap-2 w-full">
              <Input
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                placeholder={t('billing.placeholderCode')}
                wrapperClassName="flex-1"
                inputClassName="flex-1 rounded-xl"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleValidateCode}
                loading={validating}
                disabled={validating}
                className="rounded-xl h-12 font-semibold"
              >
                {t('billing.applyCode')}
              </Button>
            </div>
            {discountPercent != null && (
              <div className="flex items-center gap-2 text-[var(--success)] text-sm font-medium">
                <Check className="w-4 h-4" aria-hidden />
                <span>{t('billing.codeSuccess')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ComparisonTable */}
      <section className="rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden" aria-labelledby="compare-plans" style={{ marginBottom: sectionGap }}>
        <h2 id="compare-plans" className="text-xl font-bold text-[var(--text-primary)] py-6 px-6 border-b border-[var(--border)]">
          {t('billing.compareTitle')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] text-sm text-[var(--text-secondary)] table-fixed">
            <colgroup>
              <col style={{ width: '40%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                <th className="text-start py-4 px-4 font-semibold text-[var(--text-primary)]">{t('billing.compareFeature')}</th>
                <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">{t('billing.planFreeName')}</th>
                <th className="text-center py-4 px-4 font-semibold text-[var(--brand)]">{t('billing.planPro')}</th>
                <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">{t('billing.planUltra')}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { featureKey: 'compareWatchlist', free: '—', pro: '5', ultra: 'unlimited' },
                { featureKey: 'comparePortfolio', free: '3', pro: '10', ultra: 'unlimited' },
                { featureKey: 'compareGoals', free: '1', pro: '3', ultra: 'unlimited' },
                { featureKey: 'compareAi', free: '3', pro: '30', ultra: 'unlimited' },
                { featureKey: 'compareRealtime', free: 'x', pro: 'check', ultra: 'check' },
                { featureKey: 'compareAlerts', free: 'x', pro: 'check', ultra: 'check' },
                { featureKey: 'compareSharia', free: 'check', pro: 'check', ultra: 'check' },
                { featureKey: 'compareSupport', free: 'x', pro: 'x', ultra: 'check' },
              ].map((row, i) => (
                <tr key={row.featureKey} className={`border-b border-[var(--border-subtle)] h-14 ${i % 2 === 0 ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg-secondary)]'}`}>
                  <td className="py-0 px-4 h-14 align-middle">
                    <button
                      type="button"
                      onClick={() => setCompareFeatureModal(row.featureKey)}
                      className="text-start text-[var(--brand)] font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2 rounded px-1 -ms-1"
                      aria-label={t('billing.compareFeature')}
                    >
                      {t(`billing.${row.featureKey}`)}
                    </button>
                  </td>
                  <td className="text-center py-0 px-4 h-14 align-middle">
                    <div className="flex justify-center items-center">
                      {row.free === 'check' ? <Check className="w-4 h-4 text-[var(--success)]" aria-hidden /> : row.free === 'x' ? <X className="w-4 h-4 text-[var(--text-muted)]" aria-hidden /> : row.free}
                    </div>
                  </td>
                  <td className="py-0 px-4 h-14 align-middle">
                    <div className="flex justify-center items-center">
                      {row.pro === 'check' ? <Check className="w-4 h-4 text-[var(--success)]" aria-hidden /> : row.pro === 'x' ? <X className="w-4 h-4 text-[var(--text-muted)]" aria-hidden /> : row.pro === 'unlimited' ? t('billing.compareUnlimited') : row.pro}
                    </div>
                  </td>
                  <td className="py-0 px-4 h-14 align-middle">
                    <div className="flex justify-center items-center font-medium">
                      {row.ultra === 'check' ? <Check className="w-4 h-4 text-[var(--success)]" aria-hidden /> : row.ultra === 'x' ? <X className="w-4 h-4 text-[var(--text-muted)]" aria-hidden /> : row.ultra === 'unlimited' ? t('billing.compareUnlimited') : row.ultra}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="py-12 px-8 rounded-[20px] bg-[var(--bg-secondary)] border border-[var(--border-subtle)]" aria-labelledby="trust-heading">
        <h2 id="trust-heading" className="text-[22px] font-bold text-[var(--text-primary)] text-center mb-10">
          {t('billing.trustTitle')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-[var(--brand)]" aria-hidden />
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{t('billing.trust1Title')}</h3>
            <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">{t('billing.trust1')}</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-[var(--brand)]" aria-hidden />
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{t('billing.trust2Title')}</h3>
            <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">{t('billing.trust2')}</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-[var(--brand)]" aria-hidden />
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{t('billing.trust3Title')}</h3>
            <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">{t('billing.trust3')}</p>
          </div>
        </div>
      </section>

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

      {compareFeatureModal && (
        <CompareFeatureModal
          featureKey={compareFeatureModal}
          onClose={() => setCompareFeatureModal(null)}
          t={t}
        />
      )}

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
