import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { YEARLY_SAVINGS_PERCENT } from '../../../../lib/constants';
import { Button } from '../../../ui/Button';
import { FeatureItem } from './FeatureItem';
import { getPaidPlanId, monthlyEquivalent } from './plansConfig';
import { PlanConfig, PaidPlanId, BillingPeriod } from './types';

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
}

export function PlanCard({
  plan, index, period, currentPlan, planExpiresAt, discountPercent,
  getFinalPrice, getBasePrice, upgrading, onUpgrade, onSelectPlan, t,
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
    if (discountPercent === 100) { onUpgrade(paidPlanId); return; }
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

        <div className={`mt-4 rounded-xl px-4 py-4 flex flex-col justify-center ${isFree ? 'bg-[var(--bg-card)]/80' : 'bg-[var(--bg-secondary)]'}`}>
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
              {isCurrent
                ? ctaLabel
                : discountPercent === 100
                  ? t('billing.activateNow')
                  : discountPercent != null && discountPercent > 0
                    ? t('billing.payDiscounted', { price: finalPrice })
                    : ctaLabel}
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
