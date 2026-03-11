import React from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../../ui/Skeleton';

type Props = {
  totalValue: number;
  gainPercent: number;
  loading: boolean;
  error: string | null;
};

export function DashboardPortfolioHero({ totalValue, gainPercent, loading, error }: Props) {
  const { t } = useTranslation('common');
  const isPositiveGain = gainPercent >= 0;

  return (
    <div className="card-base card-elevated p-8 rounded-2xl">
      <p className="text-label mb-2">{t('dashboard.totalValue')}</p>
      {loading ? (
        <Skeleton className="h-14 w-56 rounded-lg" />
      ) : error ? (
        <p className="text-[var(--danger)] text-body">{error}</p>
      ) : (
        <div className="flex flex-wrap items-baseline gap-4 gap-y-2">
          <p className="text-[48px] font-bold font-number leading-tight tabular-nums text-[var(--text-primary)]">
            {totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            <span className="text-header font-normal text-[var(--text-muted)] ms-2">EGP</span>
          </p>
          <span
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-label font-bold tabular-nums ${
              isPositiveGain ? 'bg-[var(--success-bg)] text-[var(--positive)]' : 'bg-[var(--danger-bg)] text-[var(--negative)]'
            }`}
          >
            {isPositiveGain ? '↑' : '↓'} {isPositiveGain ? '+' : ''}{gainPercent.toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
}
