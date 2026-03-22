import React from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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

  // Top bar: always brand — never red. Red banners cause psychological alarm.
  const accentGradient = isProfit
    ? 'from-emerald-500 via-teal-400 to-emerald-400'
    : 'from-[var(--brand)] via-violet-400 to-indigo-400';

  const profitLossColor = isProfit
    ? 'text-emerald-700 dark:text-emerald-400'
    : isLoss
      ? 'text-red-600 dark:text-red-400'
      : 'text-[var(--text-secondary)]';

  const gainBadgeClass = isProfit
    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
    : isLoss
      ? 'bg-red-500/10 text-red-600 dark:text-red-400'
      : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]';

  if (loading) {
    return (
      <div className="card-base card-elevated rounded-2xl overflow-hidden">
        <div className="h-1 bg-[var(--border)]" />
        <div className="p-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
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
      {/* Gradient accent top bar */}
      <div className={`h-1 bg-gradient-to-r ${accentGradient}`} />

      {/* Privacy toggle */}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={isPrivate}
        aria-label={isPrivate ? 'Show numbers' : 'Hide numbers'}
        className={`absolute top-4 end-4 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
          isPrivate
            ? 'bg-[var(--brand)]/15 text-[var(--brand)] ring-1 ring-[var(--brand)]/30'
            : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
        }`}
      >
        {isPrivate ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{isPrivate ? t('header.showNumbers', { defaultValue: 'Show' }) : t('header.hideNumbers', { defaultValue: 'Hide' })}</span>
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
        {/* Purchase Value */}
        <div className="p-6 sm:p-8 flex flex-col items-center gap-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            {t('dashboard.purchaseValue')}
          </p>
          <p className="text-2xl sm:text-3xl font-bold font-number tabular-nums text-[var(--text-primary)]">
            <BlurNum>{formatEgp(totalInvested)}</BlurNum>
          </p>
          <span className="text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2.5 py-0.5 rounded-full">
            EGP
          </span>
        </div>

        {/* Profit / Loss */}
        <div className="relative p-6 sm:p-8 flex flex-col items-center gap-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            {t('dashboard.profitLoss')}
          </p>
          <div className="flex items-center gap-2">
            {isProfit && <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />}
            {isLoss && <TrendingDown className="w-4 h-4 text-red-500 shrink-0" />}
            {!isProfit && !isLoss && <Minus className="w-4 h-4 text-[var(--text-muted)] shrink-0" />}
            <p className={`text-2xl sm:text-3xl font-bold font-number tabular-nums ${profitLossColor}`}>
              <BlurNum>{isProfit ? '+' : ''}{formatEgp(totalGain)}</BlurNum>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold tabular-nums px-2.5 py-0.5 rounded-full ${gainBadgeClass}`}>
              {isProfit ? '+' : ''}{gainPercent.toFixed(2)}%
            </span>
            <span className="text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2.5 py-0.5 rounded-full">
              EGP
            </span>
          </div>
        </div>

        {/* Current Value */}
        <div className="p-6 sm:p-8 flex flex-col items-center gap-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            {t('dashboard.currentValue')}
          </p>
          <p className="text-2xl sm:text-3xl font-bold font-number tabular-nums text-[var(--text-primary)]">
            <BlurNum>{formatEgp(totalValue)}</BlurNum>
          </p>
          <span className="text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2.5 py-0.5 rounded-full">
            EGP
          </span>
        </div>
      </div>
    </div>
  );
}
