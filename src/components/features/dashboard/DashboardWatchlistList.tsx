import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye } from 'lucide-react';
import { getStockName, getStockInfo } from '../../../lib/egxStocks';
import { Skeleton } from '../../ui/Skeleton';
import EmptyState from '../../shared/EmptyState';
import type { Stock } from '../../../types';

type LivePrices = Record<string, { price?: number; change?: number; changePercent?: number }>;

type Props = {
  watchlist: Stock[];
  livePrices: LivePrices;
  loading: boolean;
  onGoToStocks: () => void;
  lang: 'ar' | 'en';
};

export const DashboardWatchlistList = memo(function DashboardWatchlistList({ watchlist, livePrices, loading, onGoToStocks, lang }: Props) {
  const { t } = useTranslation('common');

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (watchlist.length === 0) {
    return (
      <EmptyState
        icon={Eye}
        title={t('watchlist.emptyTitle')}
        description={t('watchlist.emptyDescription')}
        actionLabel={t('watchlist.addFirst')}
        onAction={onGoToStocks}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {watchlist.map((w) => {
        const priceData = livePrices[w.ticker];
        const stock = { ...w, ...priceData };
        const ch = (stock.changePercent ?? stock.change ?? 0) as number;
        const isUp = ch >= 0;
        return (
          <div
            key={stock.ticker}
            className="flex justify-between items-center p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="min-w-0">
              <p className="font-semibold text-body text-[var(--text-primary)]">{getStockName(stock.ticker, lang)}</p>
              <p className="text-label mt-0.5">{stock.ticker}</p>
              {getStockInfo(stock.ticker)?.nameEn && (
                <p className="text-label mt-0.5 truncate max-w-[200px]">{getStockInfo(stock.ticker)?.nameEn}</p>
              )}
            </div>
            <div className="text-end shrink-0 ms-4">
              <p className="font-number text-body text-[var(--text-primary)]">{(stock.price || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} EGP</p>
              <p className={`text-label font-bold tabular-nums mt-0.5 ${isUp ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                {isUp ? '↑' : '↓'} {isUp ? '+' : ''}{typeof ch === 'number' ? ch.toFixed(2) : ch}%
              </p>
              <div className={`mt-2 h-1 rounded-full overflow-hidden w-16 ms-auto ${isUp ? 'bg-[var(--positive)]/20' : 'bg-[var(--negative)]/20'}`}>
                <div
                  className={`h-full w-progress rounded-full ${isUp ? 'bg-[var(--positive)]' : 'bg-[var(--negative)]'}`}
                  style={{ ['--progress-width']: `${Math.min(100, Math.abs(ch) / 2 + 20)}%` } as React.CSSProperties}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});
