import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Skeleton } from '../../ui/Skeleton';

export type SessionStock = { ticker: string; changePercent: number } | null;

type Props = {
  topGainer: SessionStock;
  topLoser: SessionStock;
  loading: boolean;
};

export function DashboardTopPerformer({ topGainer, topLoser, loading }: Props) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="card-base card-elevated p-8 rounded-2xl">
        <h3 className="text-header font-semibold mb-6 text-[var(--text-primary)]">{t('dashboard.sessionPerformance')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-base card-elevated p-8 rounded-2xl">
      <h3 className="text-header font-semibold mb-6 text-[var(--text-primary)]">{t('dashboard.sessionPerformance')}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div
          className={`rounded-xl border-2 p-5 transition-all ${
            topGainer
              ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 cursor-pointer'
              : 'border-[var(--border)] bg-[var(--bg-secondary)]'
          }`}
          onClick={() => topGainer && navigate(`/stocks/${topGainer.ticker}`)}
          role={topGainer ? 'button' : undefined}
          tabIndex={topGainer ? 0 : undefined}
          onKeyDown={topGainer ? (e) => e.key === 'Enter' && navigate(`/stocks/${topGainer.ticker}`) : undefined}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-label font-semibold text-[var(--text-muted)]">{t('dashboard.topGainer')}</span>
          </div>
          {topGainer ? (
            <div className="flex items-baseline gap-2">
              <span className="text-body font-bold text-[var(--text-primary)]">{topGainer.ticker}</span>
              <span className="text-body font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{topGainer.changePercent.toFixed(2)}%
              </span>
            </div>
          ) : (
            <p className="text-body text-[var(--text-muted)] flex items-center gap-2">
              <Minus className="w-4 h-4 shrink-0" />
              {t('dashboard.noGainer')}
            </p>
          )}
        </div>

        <div
          className={`rounded-xl border-2 p-5 transition-all ${
            topLoser
              ? 'border-red-500/30 bg-red-500/5 hover:border-red-500/50 cursor-pointer'
              : 'border-[var(--border)] bg-[var(--bg-secondary)]'
          }`}
          onClick={() => topLoser && navigate(`/stocks/${topLoser.ticker}`)}
          role={topLoser ? 'button' : undefined}
          tabIndex={topLoser ? 0 : undefined}
          onKeyDown={topLoser ? (e) => e.key === 'Enter' && navigate(`/stocks/${topLoser.ticker}`) : undefined}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-label font-semibold text-[var(--text-muted)]">{t('dashboard.topLoser')}</span>
          </div>
          {topLoser ? (
            <div className="flex items-baseline gap-2">
              <span className="text-body font-bold text-[var(--text-primary)]">{topLoser.ticker}</span>
              <span className="text-body font-bold text-red-600 dark:text-red-400 tabular-nums">
                {topLoser.changePercent.toFixed(2)}%
              </span>
            </div>
          ) : (
            <p className="text-body text-[var(--text-muted)] flex items-center gap-2">
              <Minus className="w-4 h-4 shrink-0" />
              {t('dashboard.noLoser')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
