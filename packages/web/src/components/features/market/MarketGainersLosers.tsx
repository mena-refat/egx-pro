import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { getStockName } from '../../../lib/egxStocks';
import { Stock } from '../../../types';
import { Skeleton } from '../../ui/Skeleton';
import { formatValue, formatChange } from './utils';

type Props = {
  topGainers: Stock[];
  topLosers: Stock[];
  loading: boolean;
  isAr: boolean;
};

export function MarketGainersLosers({ topGainers, topLosers, loading, isAr }: Props) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const lang = isAr ? 'ar' : 'en';

  if (loading) {
    return (
      <section>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">{t('market.gainersLosers')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} height={48} className="w-full" />
            ))}
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} height={48} className="w-full" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">{t('market.gainersLosers')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2 text-[var(--success)]">
            <TrendingUp className="w-4 h-4" />
            <span className="font-semibold text-sm">{t('market.topGainers')}</span>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {topGainers.length === 0 ? (
              <li className="px-4 py-6 text-center text-[var(--text-muted)] text-sm">{t('market.noData')}</li>
            ) : (
              topGainers.map((s) => (
                <li key={s.ticker}>
                  <button
                    type="button"
                    onClick={() => navigate(`/stocks/${s.ticker}`)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-[var(--bg-card-hover)] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--text-primary)] truncate">{getStockName(s.ticker, lang)}</p>
                      <p className="text-xs text-[var(--text-muted)]">{s.ticker}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-medium text-[var(--text-secondary)]">{formatValue(s.price ?? 0, 2)}</span>
                      <span className="text-xs font-semibold text-[var(--success)] flex items-center gap-0.5">
                        {formatChange(s.changePercent ?? 0)}
                        <TrendingUp className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2 text-[var(--danger)]">
            <TrendingDown className="w-4 h-4" />
            <span className="font-semibold text-sm">{t('market.topLosers')}</span>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {topLosers.length === 0 ? (
              <li className="px-4 py-6 text-center text-[var(--text-muted)] text-sm">{t('market.noData')}</li>
            ) : (
              topLosers.map((s) => (
                <li key={s.ticker}>
                  <button
                    type="button"
                    onClick={() => navigate(`/stocks/${s.ticker}`)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-[var(--bg-card-hover)] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--text-primary)] truncate">{getStockName(s.ticker, lang)}</p>
                      <p className="text-xs text-[var(--text-muted)]">{s.ticker}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-medium text-[var(--text-secondary)]">{formatValue(s.price ?? 0, 2)}</span>
                      <span className="text-xs font-semibold text-[var(--danger)] flex items-center gap-0.5">
                        {formatChange(s.changePercent ?? 0)}
                        <TrendingDown className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
