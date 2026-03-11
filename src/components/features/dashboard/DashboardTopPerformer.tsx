import React from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../../ui/Skeleton';

type Props = {
  ticker: string;
  change: number;
  loading: boolean;
};

export function DashboardTopPerformer({ ticker, change, loading }: Props) {
  const { t } = useTranslation('common');

  return (
    <div className="card-base card-elevated p-6 rounded-2xl">
      <h4 className="text-label mb-2">{t('dashboard.topPerformer')}</h4>
      {loading ? (
        <Skeleton className="h-10 w-32 rounded-lg" />
      ) : (
        <div className="flex items-baseline gap-2">
          <p className="text-header font-bold text-[var(--positive)] tabular-nums">{ticker}</p>
          {ticker !== '--' && (
            <span className="text-label font-bold text-[var(--positive)]/90">({change.toFixed(2)}%)</span>
          )}
        </div>
      )}
    </div>
  );
}
