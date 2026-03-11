import React from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import StockCard from '../stocks/StockCard';
import { Skeleton } from '../../ui/Skeleton';
import EmptyState from '../../shared/EmptyState';
import type { Stock } from '../../../types';

type Props = {
  stocks: Stock[];
  loading: boolean;
  isConnected: boolean;
  onGoToStocks: () => void;
};

export function DashboardLiveWatchlist({ stocks, loading, isConnected, onGoToStocks }: Props) {
  const { t } = useTranslation('common');

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h3 className="text-header font-semibold text-[var(--text-primary)]">
          {stocks.length > 0 ? t('dashboard.liveWatchlist') : t('market.livePrices')}
        </h3>
        <div className={`flex items-center gap-2 text-label font-medium ${isConnected ? 'text-[var(--positive)]' : 'text-[var(--warning)]'}`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--positive)] animate-pulse' : 'bg-[var(--warning)]'}`} />
          {isConnected ? 'Live' : 'Connecting...'}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stocks.map((stock) => (
            <div key={stock.ticker} className="transition-transform duration-200 hover:-translate-y-0.5">
              <StockCard
                ticker={stock.ticker}
                price={stock.price}
                change={stock.change}
                changePercent={stock.changePercent}
                isConnected={isConnected}
              />
            </div>
          ))}
          {stocks.length === 0 && !loading && (
            <div className="col-span-full">
              <EmptyState
                icon={Star}
                title={t('watchlist.emptyTitle')}
                description={t('watchlist.emptyDescription')}
                actionLabel={t('watchlist.addFirst')}
                onAction={onGoToStocks}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
