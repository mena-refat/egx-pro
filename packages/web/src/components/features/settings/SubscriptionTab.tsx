import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Check, Sparkles, ChevronDown, ChevronUp, Tag, Crown, Zap, Star, Shield, CalendarClock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { CheckoutModal } from './subscription/CheckoutModal';
import { CompareFeatureModal } from './subscription/CompareFeatureModal';
import { getPlansConfig, getBasePriceForPlan, getPaidPlanId, monthlyEquivalent } from './subscription/plansConfig';
import { YEARLY_SAVINGS_PERCENT } from '../../../lib/constants';
import type { PaidPlanId, BillingPeriod } from './subscription/types';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

const DISCOUNT_CODE_REGEX = /^[A-Z0-9]{18,30}$/;

const COMPARISON_ROWS = [
  { featureKey: 'compareWatchlist',   free: '-',    pro: '5',        ultra: '∞'    },
  { featureKey: 'comparePortfolio',   free: '3',    pro: '10',       ultra: '∞'    },
  { featureKey: 'compareGoals',       free: '1',    pro: '3',        ultra: '∞'    },
  { featureKey: 'compareAi',          free: '3',    pro: '20',       ultra: '45'   },
  { featureKey: 'comparePredictions', free: '3',    pro: '10',       ultra: '20'   },
  { featureKey: 'compareExactMode',   free: false,  pro: true,       ultra: true   },
  { featureKey: 'compareRealtime',    free: false,  pro: true,       ultra: true   },
  { featureKey: 'compareAlerts',      free: false,  pro: true,       ultra: true   },
  { featureKey: 'compareSharia',      free: true,   pro: true,       ultra: true   },
  { featureKey: 'compareSupport',     free: false,  pro: 'standard', ultra: 'priority' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

export function SubscriptionTab() {
  const { t, i18n } = useTranslation('common');
  const isAr = i18n.language?.startsWith('ar');
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const currentPlan = user?.plan ?? 'free';
  const planExpiresAt = user?.planExpiresAt;

  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [modalPlan, setModalPlan] = useState<PaidPlanId | null>(null);
  const [compareFeatureModal, setCompareFeatureModal] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(true);
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [discountCodeError, setDiscountCodeError] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [billingMessage, setBillingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const handleUpgradeSuccess = useCallback(async () => {
    try {
      const res = await api.get('/user/profile');
      const d = (res.data as { data?: unknown })?.data ?? res.data;
      const nextUser = (d as { user?: typeof user })?.user ?? d;
      if (nextUser && setUser) setUser(nextUser as NonNullable<typeof user>);
    } catch { /* ignore */ }
  }, [user, setUser]);

  useEffect(() => {
    const isReturn = searchParams.get('paymob_return') === '1';
    const txnId    = searchParams.get('id');
    const success  = searchParams.get('success');
    const plan     = searchParams.get('plan') as PaidPlanId | null;
    const dc       = searchParams.get('dc');
    if (!isReturn || !txnId || !plan) return;
    setSearchParams({}, { replace: true });
    if (success !== 'true') { setBillingMessage({ type: 'error', text: t('billing.upgradeFailed') }); return; }
    const pending = (() => {
      try { return JSON.parse(sessionStorage.getItem('paymob_pending') ?? 'null') as { plan: PaidPlanId; discountCode: string } | null; }
      catch { return null; }
    })();
    sessionStorage.removeItem('paymob_pending');
    const effectivePlan = (pending?.plan ?? plan) as PaidPlanId;
    const effectiveDc   = pending?.discountCode || dc || '';
    setUpgrading(true);
    api.post('/billing/upgrade', { plan: effectivePlan, paymentToken: txnId, ...(effectiveDc ? { discountCode: effectiveDc } : {}) })
      .then(() => { setBillingMessage({ type: 'success', text: t('billing.upgradeSuccess') }); return handleUpgradeSuccess(); })
      .catch(() => { setBillingMessage({ type: 'error', text: t('billing.upgradeFailed') }); })
      .finally(() => setUpgrading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/billing/plan', { signal: controller.signal })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const getFinalPrice = (planId: PaidPlanId): number => {
    const base = getBasePriceForPlan(planId);
    if (discountPercent == null) return base;
    return Math.round(base * (1 - discountPercent / 100));
  };

  const handleCodeChange = (raw: string) => {
    const sanitized = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 30);
    setDiscountCode(sanitized);
    setDiscountCodeError(sanitized.length > 0 && sanitized.length < 18 ? t('billing.codeErrorTooShort') : null);
    if (discountPercent !== null) setDiscountPercent(null);
  };

  const handleValidateCode = async () => {
    const code = discountCode.trim();
    if (!code || !DISCOUNT_CODE_REGEX.test(code)) { setDiscountCodeError(t('billing.codeErrorInvalidChars')); return; }
    setValidating(true); setBillingMessage(null);
    try {
      const res = await api.post('/billing/validate-discount', { code });
      const data = (res.data as { data?: { percent?: number } })?.data ?? res.data;
      setDiscountPercent((data as { percent?: number }).percent ?? 0);
      setBillingMessage({ type: 'success', text: t('billing.codeSuccess') });
    } catch (err: unknown) {
      setDiscountPercent(null);
      const errorCode = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      const msg = errorCode ? (t(`billing.errors.${errorCode}`, { defaultValue: '' }) || t('billing.codeInvalid')) : t('billing.codeInvalid');
      setBillingMessage({ type: 'error', text: msg });
    } finally { setValidating(false); }
  };

  const handleUpgrade = async (planId: PaidPlanId) => {
    if (discountPercent !== 100) return;
    setUpgrading(true); setBillingMessage(null);
    try {
      await api.post('/billing/upgrade', { plan: planId, discountCode: discountCode.trim() });
      setBillingMessage({ type: 'success', text: t('billing.upgradeSuccess') });
      const res = await api.get('/user/profile');
      const d = (res.data as { data?: unknown })?.data ?? res.data;
      const nextUser = (d as { user?: typeof user })?.user ?? d;
      if (nextUser && setUser) setUser(nextUser as NonNullable<typeof user>);
      setModalPlan(null);
    } catch {
      setBillingMessage({ type: 'error', text: t('billing.upgradeFailed') });
    } finally { setUpgrading(false); }
  };

  const plans = getPlansConfig();
  const isCurrent = (planId: string) =>
    (planId === 'free' && (currentPlan === 'free' || !currentPlan)) ||
    (planId === 'pro'  && (currentPlan === 'pro' || currentPlan === 'yearly')) ||
    (planId === 'ultra' && (currentPlan === 'ultra' || currentPlan === 'ultra_yearly'));

  const currentPlanLabel =
    currentPlan === 'pro' || currentPlan === 'yearly'             ? 'Pro'
    : currentPlan === 'ultra' || currentPlan === 'ultra_yearly'   ? 'Ultra'
    : t('billing.planFreeName');

  const currentPlanIcon =
    currentPlan === 'ultra' || currentPlan === 'ultra_yearly' ? Crown
    : currentPlan === 'pro'  || currentPlan === 'yearly'      ? Zap
    : Shield;

  const CurrentIcon = currentPlanIcon;

  const heroBg =
    currentPlan === 'ultra' || currentPlan === 'ultra_yearly'
      ? 'from-amber-500/20 via-[var(--bg-card)] to-amber-400/5 border-amber-400/20'
      : currentPlan === 'pro' || currentPlan === 'yearly'
        ? 'from-[var(--brand)]/20 via-[var(--bg-card)] to-[var(--brand)]/5 border-[var(--brand)]/20'
        : 'from-[var(--bg-secondary)] to-[var(--bg-card)] border-[var(--border)]';

  const heroIconBg =
    currentPlan === 'ultra' || currentPlan === 'ultra_yearly'
      ? 'from-amber-400 to-yellow-500 shadow-amber-400/30'
      : currentPlan === 'pro' || currentPlan === 'yearly'
        ? 'from-[var(--brand)] to-violet-600 shadow-[var(--brand)]/30'
        : 'from-[var(--bg-secondary)] to-[var(--border)] shadow-none';

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-2xl bg-[var(--bg-secondary)] animate-pulse" />
        <div className="h-10 w-56 rounded-xl bg-[var(--bg-secondary)] animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-80 rounded-2xl bg-[var(--bg-secondary)] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      dir={isAr ? 'rtl' : 'ltr'}
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* ── Status message ── */}
      <AnimatePresence>
        {billingMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className={`text-sm px-4 py-3 rounded-xl border ${
              billingMessage.type === 'success'
                ? 'bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success)]/30'
                : 'bg-[var(--danger-bg)] text-[var(--danger-text)] border-[var(--danger)]/30'
            }`}
          >
            {billingMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Current plan hero ── */}
      <motion.div
        variants={fadeUp}
        className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${heroBg} p-5`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_end,rgba(124,58,237,0.06),transparent_65%)] pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1">
              {t('billing.currentPlan')}
            </p>
            <p className="text-2xl font-black text-[var(--text-primary)]">{currentPlanLabel}</p>
            {currentPlan !== 'free' && (
              <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-[var(--brand)]/10 border border-[var(--brand)]/20">
                <CalendarClock className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />
                <span className="text-xs font-semibold text-[var(--brand)]">
                  {planExpiresAt
                    ? <>{isAr ? 'يُجدَّد في' : 'Renews'}{' '}{new Date(planExpiresAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                    : (isAr ? 'اشتراك نشط · بلا تاريخ انتهاء' : 'Active subscription · No expiry set')
                  }
                </span>
              </div>
            )}
          </div>
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${heroIconBg} flex items-center justify-center shadow-lg shrink-0`}>
            <CurrentIcon className="w-7 h-7 text-white" />
          </div>
        </div>
      </motion.div>

      {/* ── Billing period toggle ── */}
      <motion.div variants={fadeUp} className="flex items-center justify-center w-full">
        <div className="relative flex items-center gap-0 p-1 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)]">
          {(['monthly', 'yearly'] as BillingPeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setBillingPeriod(p)}
              className="relative px-5 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 z-10"
              style={{ color: billingPeriod === p ? 'white' : 'var(--text-muted)' }}
            >
              {billingPeriod === p && (
                <motion.div
                  layoutId="billing-pill"
                  className="absolute inset-0 rounded-xl bg-[var(--brand)] shadow-md"
                  style={{ zIndex: -1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              {p === 'monthly' ? t('billing.monthly') : (
                <span className="flex items-center gap-1.5">
                  {t('billing.yearly')}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                    billingPeriod === 'yearly' ? 'bg-white/20 text-white' : 'bg-[var(--success)] text-white'
                  }`}>
                    {t('billing.yearlySave', { percent: YEARLY_SAVINGS_PERCENT.pro })}
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Plan cards ── */}
      <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {plans.map((plan, idx) => {
          const isFree    = plan.id === 'free';
          const isUltra   = plan.id === 'ultra';
          const isPro     = plan.id === 'pro';
          const paidId    = !isFree ? getPaidPlanId(plan.id as 'pro' | 'ultra', billingPeriod) : null;
          const current   = isCurrent(plan.id);
          const basePrice = paidId ? getBasePriceForPlan(paidId) : 0;
          const finalPrice = paidId ? getFinalPrice(paidId) : 0;
          const isYearly  = billingPeriod === 'yearly';
          const monthly   = isYearly && paidId ? monthlyEquivalent(finalPrice) : 0;
          const savePct   = isPro ? YEARLY_SAVINGS_PERCENT.pro : isUltra ? YEARLY_SAVINGS_PERCENT.ultra : 0;

          const cardBorder = current
            ? isUltra ? 'border-amber-400' : isPro ? 'border-[var(--brand)]' : 'border-[var(--brand)]'
            : isUltra ? 'border-amber-400/30' : isPro ? 'border-[var(--brand)]/30' : 'border-[var(--border)]';

          const cardRing = current
            ? isUltra ? 'ring-2 ring-amber-400/50' : 'ring-2 ring-[var(--brand)]/50'
            : isPro   ? 'ring-1 ring-[var(--brand)]/10'
            : '';

          const headerGradient = isUltra
            ? 'from-amber-400/15 via-yellow-300/5 to-transparent'
            : isPro
              ? 'from-[var(--brand)]/15 via-violet-400/5 to-transparent'
              : 'from-[var(--bg-secondary)] to-[var(--bg-secondary)]';

          const accentLine = isUltra
            ? 'from-amber-300 via-yellow-400 to-amber-500'
            : isPro
              ? 'from-[var(--brand)] via-violet-500 to-indigo-500'
              : 'from-[var(--border)] to-[var(--border)]';

          const ctaBg = current
            ? 'bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-default'
            : isUltra
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:from-amber-300 hover:to-yellow-400 shadow-lg shadow-amber-400/20'
              : isPro
                ? 'bg-gradient-to-r from-[var(--brand)] to-violet-600 text-white hover:from-[var(--brand-hover)] hover:to-violet-700 shadow-lg shadow-[var(--brand)]/20'
                : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-default';

          return (
            <motion.div
              key={plan.id}
              variants={fadeUp}
              whileHover={!current ? { y: -5, transition: { duration: 0.2 } } : undefined}
              className={`relative flex flex-col rounded-2xl border overflow-hidden bg-[var(--bg-card)] transition-shadow duration-300
                ${cardBorder} ${cardRing}
                ${isUltra && !current ? 'hover:shadow-[0_12px_40px_rgba(251,191,36,0.12)]' : ''}
                ${isPro && !current ? 'hover:shadow-[0_12px_40px_rgba(124,58,237,0.12)]' : ''}
              `}
            >
              {/* Gradient accent top bar */}
              <div className={`h-1 bg-gradient-to-r ${accentLine}`} />

              {/* Badge */}
              {plan.badgeKey && (
                <div className="absolute top-4 end-4 z-10">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    isUltra
                      ? 'bg-amber-400/15 text-amber-500 dark:text-amber-400 ring-1 ring-amber-400/30'
                      : 'bg-[var(--brand)]/15 text-[var(--brand)] ring-1 ring-[var(--brand)]/30'
                  }`}>
                    {t(`billing.${plan.badgeKey}`)}
                  </span>
                </div>
              )}

              {/* Header */}
              <div className={`bg-gradient-to-b ${headerGradient} px-5 pt-5 pb-4`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isUltra ? 'bg-amber-400/15' : isPro ? 'bg-[var(--brand)]/15' : 'bg-[var(--bg-secondary)]'
                  }`}>
                    {isUltra ? <Crown className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    : isPro  ? <Zap className="w-4 h-4 text-[var(--brand)]" />
                    : <Star className="w-4 h-4 text-[var(--text-muted)]" />}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-base font-bold ${
                      isUltra ? 'text-amber-500 dark:text-amber-400' : isPro ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'
                    }`}>
                      {t(plan.nameKey)}
                    </span>
                    {current && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isUltra ? 'bg-amber-400 text-black' : 'bg-[var(--brand)] text-white'
                      }`}>
                        {t('billing.currentPlan')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Price */}
                {isFree ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-[var(--text-primary)]">{t('billing.free')}</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-4xl font-black text-[var(--text-primary)] tabular-nums">{finalPrice.toLocaleString()}</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {t('billing.egp')} / {isYearly ? t('billing.perYear') : t('billing.perMonth')}
                      </span>
                      {discountPercent != null && discountPercent > 0 && discountPercent < 100 && (
                        <span className="text-xs line-through text-[var(--text-muted)]">{basePrice.toLocaleString()}</span>
                      )}
                    </div>
                    {isYearly && monthly > 0 && (
                      <p className="text-xs text-[var(--success-text)] dark:text-[var(--success)] mt-1 flex items-center gap-1.5 flex-wrap">
                        ≈ {monthly} {t('billing.egp')} / {t('billing.perMonth')}
                        {savePct > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-[var(--success-bg)] font-bold text-[var(--success-text)] dark:text-[var(--success)]">
                            -{savePct}%
                          </span>
                        )}
                      </p>
                    )}
                    {discountPercent === 100 && (
                      <span className="mt-1 inline-block rounded-full bg-[var(--success-bg)] text-[var(--success-text)] dark:text-[var(--success)] text-xs px-2 py-0.5 font-bold">
                        {t('billing.free')} 🎉
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="px-5 py-4 border-t border-[var(--border)]/60 space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <div key={f.key} className="flex items-center gap-2.5 text-sm">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      f.unavailable
                        ? 'bg-[var(--bg-secondary)]'
                        : isUltra
                          ? 'bg-amber-400/15'
                          : isPro
                            ? 'bg-[var(--brand)]/15'
                            : 'bg-[var(--success-bg)]'
                    }`}>
                      <Check className={`w-2.5 h-2.5 ${
                        f.unavailable
                          ? 'text-[var(--text-muted)]'
                          : isUltra
                            ? 'text-amber-500 dark:text-amber-400'
                            : isPro
                              ? 'text-[var(--brand)]'
                              : 'text-[var(--success)]'
                      }`} />
                    </span>
                    <span className={f.unavailable ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-secondary)]'}>
                      {t(`billing.features.${f.key}`)}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {!isFree && (
                <div className="px-5 pb-5 mt-auto">
                  <motion.button
                    type="button"
                    disabled={current || upgrading}
                    onClick={() => {
                      if (current || !paidId) return;
                      if (discountPercent === 100) handleUpgrade(paidId);
                      else setModalPlan(paidId);
                    }}
                    whileHover={!current ? { scale: 1.02 } : undefined}
                    whileTap={!current ? { scale: 0.98 } : undefined}
                    className={`w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 ${ctaBg}`}
                  >
                    {current
                      ? <span className="flex items-center justify-center gap-1.5"><Check className="w-4 h-4" />{t('billing.currentPlan')}</span>
                      : discountPercent === 100
                        ? t('billing.activateNow')
                        : isUltra
                          ? t('billing.ctaGetUltra')
                          : t('billing.ctaUpgradePro')
                    }
                  </motion.button>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Discount code ── */}
      <motion.div variants={fadeUp} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDiscount((v) => !v)}
          className="flex items-center gap-2.5 text-sm font-semibold text-[var(--brand)] hover:text-[var(--brand-hover)] w-full text-start px-5 py-4 transition-colors hover:bg-[var(--bg-card-hover)]"
        >
          <div className="w-7 h-7 rounded-lg bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
            <Tag className="w-3.5 h-3.5" />
          </div>
          {t('billing.hasDiscount')}
        </button>

        <AnimatePresence>
          {showDiscount && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-4 border-t border-[var(--border)] pt-4 space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={discountCode}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    placeholder="XXXXXXXXXXXXXXXXXX"
                    wrapperClassName="flex-1"
                    inputClassName="font-mono tracking-wider text-sm"
                    maxLength={30}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleValidateCode}
                    loading={validating}
                    disabled={validating || discountCode.length < 18}
                    className="shrink-0"
                  >
                    {t('billing.applyCode')}
                  </Button>
                </div>
                {discountCodeError && (
                  <p className="text-xs text-[var(--danger)]">{discountCodeError}</p>
                )}
                {discountPercent != null && (
                  <p className="text-xs text-[var(--success-text)] dark:text-[var(--success)] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {t('billing.codeSuccess')} ({t('billing.percentOff', { percent: discountPercent })})
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Comparison table ── */}
      <motion.div variants={fadeUp} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowComparison((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--bg-card-hover)] transition-colors"
        >
          <span className="flex items-center gap-2.5 text-sm font-semibold text-[var(--text-primary)]">
            <div className="w-7 h-7 rounded-lg bg-[var(--brand)]/10 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-[var(--brand)]" />
            </div>
            {t('billing.compareTitle')}
          </span>
          <motion.div animate={{ rotate: showComparison ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
          </motion.div>
        </button>

        <AnimatePresence>
          {showComparison && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="overflow-x-auto border-t border-[var(--border)]">
                <table className="w-full text-xs text-[var(--text-secondary)] table-fixed">
                  <colgroup>
                    <col style={{ width: '46%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '18%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-[var(--bg-secondary)]">
                      <th className="text-start py-3 px-5 font-semibold text-[var(--text-muted)]">{t('billing.compareFeature')}</th>
                      <th className="text-center py-3 px-2 font-semibold text-[var(--text-muted)]">{t('billing.planFreeName')}</th>
                      <th className="text-center py-3 px-2 font-bold text-[var(--brand)]">Pro</th>
                      <th className="text-center py-3 px-2 font-bold text-amber-500 dark:text-amber-400">Ultra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_ROWS.map((row, i) => (
                      <tr key={row.featureKey} className={`border-t border-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-secondary)]/60 ${i % 2 !== 0 ? 'bg-[var(--bg-secondary)]/30' : ''}`}>
                        <td className="py-2.5 px-5">
                          <button
                            type="button"
                            onClick={() => setCompareFeatureModal(row.featureKey)}
                            className="text-start text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors"
                          >
                            {t(`billing.${row.featureKey}`)}
                          </button>
                        </td>
                        {(['free', 'pro', 'ultra'] as const).map((col) => {
                          const val = row[col];
                          return (
                            <td key={col} className="text-center py-2.5 px-2">
                              {val === true  ? (
                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full mx-auto ${col === 'ultra' ? 'bg-amber-400/15' : col === 'pro' ? 'bg-[var(--brand)]/15' : 'bg-[var(--success-bg)]'}`}>
                                  <Check className={`w-3 h-3 ${col === 'ultra' ? 'text-amber-500 dark:text-amber-400' : col === 'pro' ? 'text-[var(--brand)]' : 'text-[var(--success)]'}`} />
                                </span>
                              ) : val === false ? (
                                <span className="text-[var(--text-muted)]">–</span>
                              ) : val === 'standard' ? (
                                <span className="text-[var(--text-muted)]">{t('billing.supportStandard')}</span>
                              ) : val === 'priority' ? (
                                <span className="text-amber-500 dark:text-amber-400 font-semibold">{t('billing.supportPriority')}</span>
                              ) : (
                                <span className={col === 'ultra' ? 'text-amber-500 dark:text-amber-400 font-semibold' : col === 'pro' ? 'text-[var(--brand)] font-semibold' : ''}>{val}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Checkout modal ── */}
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
    </motion.div>
  );
}
