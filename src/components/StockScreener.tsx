import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import EmptyState from './shared/EmptyState';
import { Button } from './ui/Button';
import { StockFilters } from './stocks/StockFilters';
import { StockTable } from './stocks/StockTable';
import { WatchlistTargetModal } from './stocks/WatchlistTargetModal';
import { useStockScreener } from '../hooks/useStockScreener';
import { Stock } from '../types';
import type { StockWithMeta } from '../hooks/useStockScreener';

export interface StockScreenerProps {
  onSelectStock?: (stock: Stock) => void;
}

export default function StockScreener({ onSelectStock }: StockScreenerProps = {}) {
  const { i18n } = useTranslation('common');
  const navigate = useNavigate();
  const isAr = i18n.language.startsWith('ar');
  const screener = useStockScreener();
  const handleSelectStock = onSelectStock ?? ((s: Stock) => navigate(`/stocks/${s.ticker}`));

  const handleSubscribe = () => {
    screener.setShowWatchlistLimitModal(false);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('navigate-to-subscription'));
  };

  if (screener.loading) {
    return (
      <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="h-12 w-full max-w-md bg-[var(--bg-secondary)] rounded-xl animate-pulse" />
        <div className="h-10 w-full overflow-hidden rounded-xl bg-[var(--bg-secondary)] animate-pulse" />
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-[var(--bg-secondary)] rounded-xl animate-pulse" />
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
      <StockFilters
        search={screener.search}
        onSearchChange={screener.setSearch}
        filter={screener.filter}
        onFilterChange={screener.setFilter}
        sort={screener.sort}
        onSortChange={screener.setSort}
        isPro={screener.isPro}
        t={screener.t}
      />
      <StockTable
        stocks={screener.sorted}
        watchlist={screener.watchlist}
        onSelectStock={(s: StockWithMeta) => handleSelectStock(s)}
        onToggleWatchlist={screener.toggleWatchlist}
        t={screener.t}
        lang={screener.lang}
      />
      {screener.sorted.length === 0 && (
        <EmptyState
          icon={Search}
          title={screener.t('stocks.noResults')}
          description={screener.t('stocks.noResultsDescription')}
        />
      )}
      <WatchlistTargetModal
        addTargetModal={screener.addTargetModal}
        addTargetPrice={screener.addTargetPrice}
        onAddTargetPriceChange={screener.setAddTargetPrice}
        addTargetSubmitting={screener.addTargetSubmitting}
        onSubmitAddTarget={screener.submitAddWithTarget}
        onCloseAddTarget={() => screener.setAddTargetModal(null)}
        showLimitModal={screener.showWatchlistLimitModal}
        onCloseLimitModal={() => screener.setShowWatchlistLimitModal(false)}
        onSubscribe={handleSubscribe}
        t={screener.t}
      />
    </div>
  );
}
