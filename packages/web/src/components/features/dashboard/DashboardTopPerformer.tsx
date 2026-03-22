import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '../../ui/Skeleton';
import { getStockName } from '../../../lib/egxStocks';

export type SessionStock = { ticker: string; changePercent: number } | null;

type Props = {
  topGainer: SessionStock;
  topLoser: SessionStock;
  loading: boolean;
};

export function DashboardTopPerformer({ topGainer, topLoser, loading }: Props) {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const lang = i18n.language.startsWith('ar') ? 'ar' : 'en';

  if (loading) {
    return (
      <div className="card-base card-elevated p-8 rounded-2xl">
        <Skeleton className="h-5 w-44 mb-6 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-base card-elevated p-8 rounded-2xl">
      <h3 className="text-header font-semibold mb-6 text-[var(--text-primary)]">{t('dashboard.sessionPerformance')}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Top Gainer */}
        <motion.div
          className={`relative rounded-2xl overflow-hidden p-5 ${
            topGainer ? 'cursor-pointer' : ''
          }`}
          onClick={() => topGainer && navigate(`/stocks/${topGainer.ticker}`)}
          role={topGainer ? 'button' : undefined}
          tabIndex={topGainer ? 0 : undefined}
          onKeyDown={topGainer ? (e) => e.key === 'Enter' && navigate(`/stocks/${topGainer.ticker}`) : undefined}
          whileHover={topGainer ? { scale: 1.015, y: -2 } : undefined}
          whileTap={topGainer ? { scale: 0.985 } : undefined}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-emerald-400/5 to-transparent" />
          <div className="absolute inset-0 rounded-2xl ring-1 ring-emerald-500/20" />
          {topGainer && (
            <div className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-200 shadow-lg shadow-emerald-500/10" />
          )}
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                {t('dashboard.topGainer')}
              </span>
            </div>
            {topGainer ? (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-[var(--text-primary)]">{topGainer.ticker}</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    +{topGainer.changePercent.toFixed(2)}%
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                  {getStockName(topGainer.ticker, lang)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                <Minus className="w-4 h-4 shrink-0" />
                {t('dashboard.noGainer')}
              </p>
            )}
          </div>
        </motion.div>

        {/* Top Loser */}
        <motion.div
          className={`relative rounded-2xl overflow-hidden p-5 ${
            topLoser ? 'cursor-pointer' : ''
          }`}
          onClick={() => topLoser && navigate(`/stocks/${topLoser.ticker}`)}
          role={topLoser ? 'button' : undefined}
          tabIndex={topLoser ? 0 : undefined}
          onKeyDown={topLoser ? (e) => e.key === 'Enter' && navigate(`/stocks/${topLoser.ticker}`) : undefined}
          whileHover={topLoser ? { scale: 1.015, y: -2 } : undefined}
          whileTap={topLoser ? { scale: 0.985 } : undefined}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-rose-400/5 to-transparent" />
          <div className="absolute inset-0 rounded-2xl ring-1 ring-red-500/20" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shrink-0 shadow-md shadow-red-500/25">
                <TrendingDown className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                {t('dashboard.topLoser')}
              </span>
            </div>
            {topLoser ? (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-[var(--text-primary)]">{topLoser.ticker}</span>
                  <span className="text-base font-bold text-red-600 dark:text-red-400 tabular-nums">
                    {topLoser.changePercent.toFixed(2)}%
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                  {getStockName(topLoser.ticker, lang)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                <Minus className="w-4 h-4 shrink-0" />
                {t('dashboard.noLoser')}
              </p>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
