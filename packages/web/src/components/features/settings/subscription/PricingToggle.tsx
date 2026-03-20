import { YEARLY_SAVINGS_PERCENT } from '../../../../lib/constants';
import { BillingPeriod } from './types';

interface PricingToggleProps {
  period: BillingPeriod;
  onPeriodChange: (p: BillingPeriod) => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}

export function PricingToggle({ period, onPeriodChange, t }: PricingToggleProps) {
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
