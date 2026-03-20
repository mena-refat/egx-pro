import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Sparkles, ChevronDown, ChevronUp, Tag } from 'lucide-react';
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
  { featureKey: 'compareWatchlist',         free: '—',    pro: '5',         ultra: '∞'    },
  { featureKey: 'comparePortfolio',         free: '3',    pro: '10',        ultra: '∞'    },
  { featureKey: 'compareGoals',             free: '1',    pro: '3',         ultra: '∞'    },
  { featureKey: 'compareAi',               free: '3',    pro: '20',        ultra: '45'   },
  { featureKey: 'comparePredictions',       free: '3',    pro: '10',        ultra: '20'   },
  { featureKey: 'compareExactMode',         free: false,  pro: true,        ultra: true   },
  { featureKey: 'compareRealtime',          free: false,  pro: true,        ultra: true   },
  { featureKey: 'compareAlerts',            free: false,  pro: true,        ultra: true   },
  { featureKey: 'compareSharia',            free: true,   pro: true,        ultra: true   },
  { featureKey: 'compareSupport',           free: false,  pro: 'standard',  ultra: 'priority' },
];

export function SubscriptionTab() {
  const { t } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const currentPlan = user?.plan ?? 'free';
  const planExpiresAt = user?.planExpiresAt;

  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('yearly');
  const [modalPlan, setModalPlan] = useState<PaidPlanId | null>(null);
  const [compareFeatureModal, setCompareFeatureModal] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [discountCodeError, setDiscountCodeError] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [billingMessage, setBillingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    setDiscountCodeError(
      sanitized.length > 0 && sanitized.length < 18
        ? t('billing.codeErrorTooShort', { defaultValue: 'الكود لازم يكون 18 حرف على الأقل' })
        : null
    );
    if (discountPercent !== null) setDiscountPercent(null);
  };

  const handleValidateCode = async () => {
    const code = discountCode.trim();
    if (!code || !DISCOUNT_CODE_REGEX.test(code)) { setDiscountCodeError(t('billing.codeErrorInvalidChars', { defaultValue: 'كود غير صحيح' })); return; }
    setValidating(true); setBillingMessage(null);
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
    } finally {
      setUpgrading(false);
    }
  };

  const handleUpgradeSuccess = async () => {
    try {
      const res = await api.get('/user/profile');
      const d = (res.data as { data?: unknown })?.data ?? res.data;
      const nextUser = (d as { user?: typeof user })?.user ?? d;
      if (nextUser && setUser) setUser(nextUser as NonNullable<typeof user>);
    } catch { /* ignore */ }
  };

  const plans = getPlansConfig();
  const isCurrent = (planId: string) =>
    (planId === 'free' && (currentPlan === 'free' || !currentPlan)) ||
    (planId === 'pro' && (currentPlan === 'pro' || currentPlan === 'yearly' || currentPlan === 'annual')) ||
    (planId === 'ultra' && (currentPlan === 'ultra' || currentPlan === 'ultra_yearly' || currentPlan === 'ultra_annual'));

  const planColor: Record<string, string> = {
    free:  'text-[var(--text-muted)]',
    pro:   'text-[var(--brand)]',
    ultra: 'text-amber-400',
  };
  const planBg: Record<string, string> = {
    free:  'bg-[var(--bg-secondary)] border-[var(--border)]',
    pro:   'bg-[var(--brand)]/5 border-[var(--brand)]/40',
    ultra: 'bg-amber-400/5 border-amber-400/40',
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-[var(--bg-secondary)] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">

      {/* ── Status message ── */}
      {billingMessage && (
        <div className={`text-sm px-4 py-3 rounded-xl border ${
          billingMessage.type === 'success'
            ? 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/30'
            : 'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)]/30'
        }`}>
          {billingMessage.text}
        </div>
      )}

      {/* ── Billing period toggle ── */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] w-fit">
        {(['monthly', 'yearly'] as BillingPeriod[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setBillingPeriod(p)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              billingPeriod === p
                ? 'bg-[var(--brand)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {p === 'monthly' ? t('billing.monthly') : (
              <span className="flex items-center gap-1.5">
                {t('billing.yearly')}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--success)] text-white">
                  {t('billing.yearlySave', { percent: YEARLY_SAVINGS_PERCENT.pro })}
                </span>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Plan cards ── */}
      <div className="space-y-3">
        {plans.map((plan) => {
          const isFree = plan.id === 'free';
          const paidId = !isFree ? getPaidPlanId(plan.id as 'pro' | 'ultra', billingPeriod) : null;
          const current = isCurrent(plan.id);
          const basePrice = paidId ? getBasePriceForPlan(paidId) : 0;
          const finalPrice = paidId ? getFinalPrice(paidId) : 0;
          const isYearly = billingPeriod === 'yearly';
          const monthly = isYearly && paidId ? monthlyEquivalent(finalPrice) : 0;
          const savePct = plan.id === 'pro' ? YEARLY_SAVINGS_PERCENT.pro : plan.id === 'ultra' ? YEARLY_SAVINGS_PERCENT.ultra : 0;

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border p-4 transition-all ${planBg[plan.id]} ${
                current ? 'ring-2 ring-[var(--brand)]' : ''
              }`}
            >
              {/* Badge */}
              {plan.badgeKey && (
                <span className={`absolute top-3 start-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  plan.id === 'ultra'
                    ? 'bg-amber-400/15 text-amber-400'
                    : 'bg-[var(--brand)]/15 text-[var(--brand)]'
                }`}>
                  {t(`billing.${plan.badgeKey}`)}
                </span>
              )}

              <div className="flex items-center justify-between gap-4">
                {/* Plan info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {plan.badgeKey && <span className="w-20" />}{/* spacer for badge */}
                    <span className={`text-base font-bold ${planColor[plan.id]}`}>
                      {t(plan.nameKey)}
                    </span>
                    {current && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--brand)] text-white">
                        {t('billing.currentPlan')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
                    {isFree ? (
                      <span className="text-2xl font-bold text-[var(--text-primary)]">
                        {t('billing.free')}
                      </span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-[var(--text-primary)]">
                          {finalPrice.toLocaleString()}
                        </span>
                        <span className="text-sm text-[var(--text-muted)]">
                          {t('billing.egp')} / {isYearly ? t('billing.perYear') : t('billing.perMonth')}
                        </span>
                        {discountPercent != null && discountPercent > 0 && discountPercent < 100 && (
                          <span className="text-sm line-through text-[var(--text-muted)]">{basePrice.toLocaleString()}</span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Yearly monthly equivalent */}
                  {isYearly && !isFree && monthly > 0 && (
                    <p className="text-xs text-[var(--success)] mt-0.5">
                      ≈ {monthly} {t('billing.egp')} / {t('billing.perMonth')}
                      {savePct > 0 && (
                        <span className="ms-1.5 px-1.5 py-0.5 rounded-full bg-[var(--success-bg)] text-[var(--success)] font-semibold">
                          -{savePct}%
                        </span>
                      )}
                    </p>
                  )}

                  {/* Expiry */}
                  {current && planExpiresAt && !isFree && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {t('billing.expiresOn', { date: new Date(planExpiresAt).toLocaleDateString('ar-EG') })}
                    </p>
                  )}
                </div>

                {/* CTA */}
                {!isFree && (
                  <button
                    type="button"
                    disabled={current || upgrading}
                    onClick={() => {
                      if (current || !paidId) return;
                      if (discountPercent === 100) handleUpgrade(paidId);
                      else setModalPlan(paidId);
                    }}
                    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      current
                        ? 'bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-default flex items-center gap-1.5'
                        : plan.id === 'ultra'
                        ? 'bg-amber-400 text-black hover:bg-amber-300'
                        : 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]'
                    }`}
                  >
                    {current
                      ? <><Check className="w-3.5 h-3.5 inline" /> {t('billing.currentPlan')}</>
                      : discountPercent === 100
                        ? t('billing.activateNow')
                        : plan.id === 'ultra'
                          ? t('billing.ctaGetUltra', { defaultValue: 'ترقية لـ Ultra' })
                          : t('billing.ctaUpgradePro', { defaultValue: 'ترقية لـ Pro' })
                    }
                  </button>
                )}
              </div>

              {/* Key features — short list */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t border-[var(--border)]/50">
                {plan.features.slice(0, 4).map((f) => (
                  <span key={f.key} className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                    <Check className="w-3 h-3 text-[var(--success)]" />
                    {t(`billing.features.${f.key}`)}
                  </span>
                ))}
                {plan.features.length > 4 && (
                  <span className="text-xs text-[var(--text-muted)]">+{plan.features.length - 4} {t('billing.moreFeatures', { defaultValue: 'مزايا إضافية' })}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Discount code ── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <button
          type="button"
          onClick={() => setShowDiscount((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-[var(--brand)] hover:text-[var(--brand-hover)] w-full text-start"
        >
          <Tag className="w-4 h-4" />
          {t('billing.hasDiscount', { defaultValue: 'عندك كود خصم؟' })}
        </button>

        {showDiscount && (
          <div className="mt-3 flex gap-2">
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
              {t('billing.applyCode', { defaultValue: 'تطبيق' })}
            </Button>
          </div>
        )}
        {showDiscount && discountCodeError && (
          <p className="text-xs text-[var(--danger)] mt-1.5">{discountCodeError}</p>
        )}
        {showDiscount && discountPercent != null && (
          <p className="text-xs text-[var(--success)] mt-1.5 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            {t('billing.codeSuccess')} ({discountPercent}% خصم)
          </p>
        )}
      </div>

      {/* ── Comparison table (collapsible) ── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowComparison((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--brand)]" />
            {t('billing.compareTitle', { defaultValue: 'مقارنة الباقات' })}
          </span>
          {showComparison
            ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
            : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
          }
        </button>

        {showComparison && (
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
                  <th className="text-start py-3 px-4 font-semibold text-[var(--text-muted)]">{t('billing.compareFeature', { defaultValue: 'الميزة' })}</th>
                  <th className="text-center py-3 px-2 font-semibold text-[var(--text-muted)]">{t('billing.planFreeName', { defaultValue: 'مجاني' })}</th>
                  <th className="text-center py-3 px-2 font-semibold text-[var(--brand)]">Pro</th>
                  <th className="text-center py-3 px-2 font-semibold text-amber-400">Ultra</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={row.featureKey} className={`border-t border-[var(--border-subtle)] ${i % 2 === 0 ? '' : 'bg-[var(--bg-secondary)]/40'}`}>
                    <td className="py-2.5 px-4">
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
                          {val === true  ? <Check className="w-3.5 h-3.5 text-[var(--success)] mx-auto" /> :
                           val === false ? <span className="text-[var(--text-muted)]">—</span> :
                           val === 'standard' ? <span className="text-[var(--text-muted)]">{t('billing.supportStandard', { defaultValue: 'عادي' })}</span> :
                           val === 'priority' ? <span className="text-amber-400 font-semibold">{t('billing.supportPriority', { defaultValue: 'أولوية' })}</span> :
                           <span>{val}</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
    </div>
  );
}
