import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { getStockName } from '../../../lib/egxStocks';
import { Stock } from '../../../types';
import { Skeleton } from '../../ui/Skeleton';
import { formatChange } from './utils';

type Period = 'day' | 'week' | 'month' | 'year';

type PeriodRow = { ticker: string; changePercent: number; price: number };

type Props = {
  topGainers: Stock[];
  topLosers: Stock[];
  loading: boolean;
  isAr: boolean;
};

const PERIODS: Period[] = ['day', 'week', 'month', 'year'];

export function MarketGainersLosers({ topGainers, topLosers, loading, isAr }: Props) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const lang = isAr ? 'ar' : 'en';

  const [period, setPeriod] = useState<Period>('day');
  const [periodGainers, setPeriodGainers] = useState<PeriodRow[]>([]);
  const [periodLosers, setPeriodLosers] = useState<PeriodRow[]>([]);
  const [periodLoading, setPeriodLoading] = useState(false);

  const fetchPeriod = useCallback(async (p: Period) => {
    if (p === 'day') return;
    setPeriodLoading(true);
    try {
      const res = await fetch(`/api/stocks/gainers-losers?period=${p}`);
      if (!res.ok) throw new Error('fetch failed');
      const json = await res.json();
      const data = json.data ?? json;
      setPeriodGainers(data.gainers ?? []);
      setPeriodLosers(data.losers ?? []);
    } catch {
      setPeriodGainers([]);
      setPeriodLosers([]);
    } finally {
      setPeriodLoading(false);
    }
  }, []);

  useEffect(() => {
    if (period !== 'day') fetchPeriod(period);
  }, [period, fetchPeriod]);

  const isActive = loading || (period !== 'day' && periodLoading);

  // Merge both list shapes into a common display shape
  const displayGainers: { ticker: string; changePercent: number }[] =
    period === 'day'
      ? topGainers.map((s) => ({ ticker: s.ticker, changePercent: s.changePercent ?? 0 }))
      : periodGainers;

  const displayLosers: { ticker: string; changePercent: number }[] =
    period === 'day'
      ? topLosers.map((s) => ({ ticker: s.ticker, changePercent: s.changePercent ?? 0 }))
      : periodLosers;

  const periodLabel: Record<Period, string> = {
    day: t('market.periodDay'),
    week: t('market.periodWeek'),
    month: t('market.periodMonth'),
    year: t('market.periodYear'),
  };

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-bold text-[var(--text-primary)]">{t('market.gainersLosers')}</h2>

        {/* Period filter pills */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`relative px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200 ${
                period === p
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {period === p && (
                <motion.span
                  layoutId="period-pill"
                  className="absolute inset-0 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] shadow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{periodLabel[p]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gainers */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2 text-[var(--success)]">
            <TrendingUp className="w-4 h-4" />
            <span className="font-semibold text-sm">{t('market.topGainers')}</span>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {isActive ? (
              [...Array(6)].map((_, i) => (
                <li key={i} className="px-4 py-3">
                  <Skeleton height={36} className="w-full rounded-lg" />
                </li>
              ))
            ) : displayGainers.length === 0 ? (
              <li className="px-4 py-6 text-center text-[var(--text-muted)] text-sm">{t('market.noData')}</li>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={period + '-gainers'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {displayGainers.map((s, idx) => (
                    <motion.li
                      key={s.ticker}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.22, delay: idx * 0.04 }}
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/stocks/${s.ticker}`)}
                        className={`w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-[var(--bg-card-hover)] transition-colors ${isAr ? 'text-right' : 'text-left'}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-bold text-[var(--text-muted)] w-4 shrink-0 tabular-nums">{idx + 1}</span>
                          <div className="min-w-0">
                            <p className="font-bold text-[var(--text-primary)] text-sm">{s.ticker}</p>
                            <p className="text-xs text-[var(--text-muted)] truncate">{getStockName(s.ticker, lang)}</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-[var(--success)] flex items-center gap-0.5 shrink-0 tabular-nums">
                          {formatChange(s.changePercent ?? 0)}
                          <TrendingUp className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    </motion.li>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </ul>
        </div>

        {/* Losers */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2 text-[var(--danger)]">
            <TrendingDown className="w-4 h-4" />
            <span className="font-semibold text-sm">{t('market.topLosers')}</span>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {isActive ? (
              [...Array(6)].map((_, i) => (
                <li key={i} className="px-4 py-3">
                  <Skeleton height={36} className="w-full rounded-lg" />
                </li>
              ))
            ) : displayLosers.length === 0 ? (
              <li className="px-4 py-6 text-center text-[var(--text-muted)] text-sm">{t('market.noData')}</li>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={period + '-losers'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {displayLosers.map((s, idx) => (
                    <motion.li
                      key={s.ticker}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.22, delay: idx * 0.04 }}
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/stocks/${s.ticker}`)}
                        className={`w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-[var(--bg-card-hover)] transition-colors ${isAr ? 'text-right' : 'text-left'}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-bold text-[var(--text-muted)] w-4 shrink-0 tabular-nums">{idx + 1}</span>
                          <div className="min-w-0">
                            <p className="font-bold text-[var(--text-primary)] text-sm">{s.ticker}</p>
                            <p className="text-xs text-[var(--text-muted)] truncate">{getStockName(s.ticker, lang)}</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-[var(--danger)] flex items-center gap-0.5 shrink-0 tabular-nums">
                          {formatChange(s.changePercent ?? 0)}
                          <TrendingDown className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    </motion.li>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
