import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import EmptyState from '../../shared/EmptyState';
import { Button } from '../../ui/Button';
import { StockFilters } from './StockFilters';
import { StockTable } from './StockTable';
import { WatchlistTargetModal } from './WatchlistTargetModal';
import { useStockScreener } from '../../../hooks/useStockScreener';
import { Stock } from '../../../types';
import type { StockWithMeta } from '../../../hooks/useStockScreener';

export interface StockScreenerProps {
  onSelectStock?: (stock: Stock) => void;
}

export default function StockScreener({ onSelectStock }: StockScreenerProps = {}) {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const isAr = i18n.language.startsWith('ar');
  const screener = useStockScreener();
  const { isConnected, connectionError } = screener;
  const handleSelectStock = onSelectStock ?? ((s: Stock) => navigate(`/stocks/${s.ticker}`));

  const handleSubscribe = () => {
    screener.setShowWatchlistLimitModal(false);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('navigate-to-subscription'));
  };

  if (screener.loading) {
    return (
      <div className="space-y-5" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="h-11 w-full max-w-md bg-[var(--bg-secondary)] rounded-xl animate-pulse" />
        <div className="h-10 w-full rounded-xl bg-[var(--bg-secondary)] animate-pulse" />
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-16 rounded-md bg-[var(--bg-secondary)]" />
                <div className="h-2.5 w-28 rounded-md bg-[var(--bg-secondary)]" />
              </div>
              <div className="h-7 w-16 rounded-lg bg-[var(--bg-secondary)]" />
              <div className="h-8 w-16 rounded-md bg-[var(--bg-secondary)]" />
              <div className="h-8 w-8 rounded-lg bg-[var(--bg-secondary)]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (screener.error) {
    return (
      <div
        className="rounded-xl border border-[var(--danger)] bg-[var(--danger-bg)] p-6 text-center"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <p className="text-[var(--danger)]">{screener.error}</p>
        <Button type="button" variant="primary" onClick={() => screener.fetchData()} className="mt-4">
          {screener.t('stocks.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {(!isConnected || connectionError) && (
        <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs text-center py-1.5 rounded-lg" role="status">
          {connectionError || t('dashboard.reconnectingLive', { defaultValue: 'جاري إعادة الاتصال بالأسعار المباشرة...' })}
        </div>
      )}
      <StockFilters
        search={screener.search}
        onSearchChange={screener.setSearch}
        filter={screener.filter}
        onFilterChange={screener.setFilter}
        sector={screener.sector}
        onSectorChange={screener.setSector}
        sort={screener.sort}
        onSortChange={screener.setSort}
        isPro={screener.isPro}
        isAr={screener.isAr}
        t={screener.t}
      />
      <StockTable
        stocks={screener.stocks}
        watchlist={screener.watchlist}
        onSelectStock={(s: StockWithMeta) => handleSelectStock(s)}
        onToggleWatchlist={screener.toggleWatchlist}
        t={screener.t}
        lang={screener.isAr ? 'ar' : 'en'}
      />
      {screener.stocks.length === 0 && (
        <EmptyState
          icon={Search}
          title={screener.t('stocks.noResults')}
          description={screener.t('stocks.noResultsDescription')}
        />
      )}

      {/* Pagination */}
      {screener.pages > 1 && (
        <div className="flex items-center justify-between px-1 py-2">
          <span className="text-xs text-[var(--text-muted)]">
            {isAr ? `${screener.total} سهم` : `${screener.total} stocks`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => screener.setPage(screener.page - 1)}
              disabled={screener.page <= 1}
              className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={isAr ? 'السابق' : 'Previous'}
            >
              {isAr
                ? <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                : <ChevronLeft  className="w-4 h-4 text-[var(--text-secondary)]" />}
            </button>
            <span className="text-sm text-[var(--text-secondary)] tabular-nums min-w-[60px] text-center">
              {isAr
                ? `${screener.page} / ${screener.pages}`
                : `${screener.page} / ${screener.pages}`}
            </span>
            <button
              onClick={() => screener.setPage(screener.page + 1)}
              disabled={screener.page >= screener.pages}
              className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={isAr ? 'التالي' : 'Next'}
            >
              {isAr
                ? <ChevronLeft  className="w-4 h-4 text-[var(--text-secondary)]" />
                : <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />}
            </button>
          </div>
        </div>
      )}

      <WatchlistTargetModal
        addTargetModal={screener.addTargetModal}
        addTargetPrice={screener.addTargetPrice}
        onAddTargetPriceChange={screener.setAddTargetPrice}
        addTargetSubmitting={screener.addTargetSubmitting}
        addTargetError={screener.addTargetError}
        onSubmitAddTarget={screener.submitAddWithTarget}
        onCloseAddTarget={() => {
          screener.setAddTargetModal(null);
          screener.setAddTargetError(null);
        }}
        showLimitModal={screener.showWatchlistLimitModal}
        onCloseLimitModal={() => screener.setShowWatchlistLimitModal(false)}
        showPriceAlertProModal={screener.showPriceAlertProModal}
        onClosePriceAlertProModal={() => screener.setShowPriceAlertProModal(false)}
        onSubscribe={handleSubscribe}
        t={screener.t}
      />
    </div>
  );
}
