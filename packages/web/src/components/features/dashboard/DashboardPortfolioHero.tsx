import React from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { Skeleton } from '../../ui/Skeleton';
import { BlurNum } from '../../ui/BlurNum';
import { usePrivacyStore } from '../../../store/privacyStore';

type Props = {
  totalInvested: number;
  totalValue: number;
  totalGain: number;
  gainPercent: number;
  loading: boolean;
  error: string | null;
};

function formatEgp(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

export function DashboardPortfolioHero({ totalInvested, totalValue, totalGain, gainPercent, loading, error }: Props) {
  const { t } = useTranslation('common');
  const { isPrivate, toggle } = usePrivacyStore();
  const isProfit = totalGain > 0;
  const isLoss = totalGain < 0;
  const profitLossColor = isProfit
    ? 'text-emerald-700 dark:text-emerald-400'
    : isLoss
      ? 'text-red-700 dark:text-red-400'
      : 'text-emerald-600 dark:text-emerald-500';

  if (loading) {
    return (
      <div className="card-base card-elevated p-8 rounded-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-base card-elevated p-8 rounded-2xl">
        <p className="text-red-600 dark:text-red-400 text-body">{error}</p>
      </div>
    );
  }

  return (
    <div className="card-base card-elevated rounded-2xl overflow-hidden relative">
      {/* Privacy toggle */}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={isPrivate}
        aria-label={isPrivate ? 'Show numbers' : 'Hide numbers'}
        className={`absolute top-3 end-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
          isPrivate
            ? 'bg-[var(--brand)]/15 text-[var(--brand)] ring-1 ring-[var(--brand)]/30'
            : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
        }`}
      >
        {isPrivate ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{isPrivate ? t('header.showNumbers', { defaultValue: 'Show' }) : t('header.hideNumbers', { defaultValue: 'Hide' })}</span>
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
        <div className="p-6 sm:p-8 flex flex-col items-center gap-1 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
            {t('dashboard.purchaseValue')}
          </p>
          <p className="text-2xl sm:text-3xl font-bold font-number tabular-nums text-[var(--text-primary)]">
            <BlurNum>{formatEgp(totalInvested)}</BlurNum> <span className="text-base font-normal text-[var(--text-muted)]">EGP</span>
          </p>
        </div>
        <div className="p-6 sm:p-8 flex flex-col items-center gap-1 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
            {t('dashboard.profitLoss')}
          </p>
          <p className={`text-2xl sm:text-3xl font-bold font-number tabular-nums ${profitLossColor}`}>
            <BlurNum>{isProfit ? '+' : ''}{formatEgp(totalGain)} <span className="text-base font-normal opacity-90">EGP</span></BlurNum>
            <span className="text-lg font-semibold ms-1.5">({isProfit ? '+' : ''}{gainPercent.toFixed(2)}%)</span>
          </p>
        </div>
        <div className="p-6 sm:p-8 flex flex-col items-center gap-1 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
            {t('dashboard.currentValue')}
          </p>
          <p className="text-2xl sm:text-3xl font-bold font-number tabular-nums text-[var(--text-primary)]">
            <BlurNum>{formatEgp(totalValue)}</BlurNum> <span className="text-base font-normal text-[var(--text-muted)]">EGP</span>
          </p>
        </div>
      </div>
    </div>
  );
}
