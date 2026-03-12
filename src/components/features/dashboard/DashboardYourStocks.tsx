import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PieChart, TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '../../ui/Skeleton';
import EmptyState from '../../shared/EmptyState';
import type { PortfolioHolding } from '../../../types/portfolio';

type Props = {
  holdings: PortfolioHolding[];
  livePrices: Record<string, { price: number }>;
  loading: boolean;
};

function formatEgp(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

function formatPrice(p: number): string {
  return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function DashboardYourStocks({ holdings, livePrices, loading }: Props) {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const isRTL = i18n.language.startsWith('ar');

  const sortedHoldings = React.useMemo(() => {
    return [...holdings].sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [holdings]);

  if (loading) {
    return (
      <div className="card-base card-elevated p-8 rounded-2xl">
        <h3 className="text-header font-semibold mb-6 text-[var(--text-primary)]">{t('dashboard.ownedStocks')}</h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card-base card-elevated p-8 rounded-2xl">
      <h3 className="text-header font-semibold mb-6 text-[var(--text-primary)]">{t('dashboard.ownedStocks')}</h3>

      {sortedHoldings.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title={t('portfolio.emptyTitle')}
          description={t('portfolio.emptyDescription')}
          actionLabel={t('portfolio.addFirst')}
          onAction={() => navigate('/portfolio')}
        />
      ) : (
        <div className="overflow-x-auto -mx-1">
          <div className="flex flex-col gap-4 min-w-[640px]" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="grid grid-cols-6 gap-4 items-center text-label font-semibold text-[var(--text-muted)] px-4 py-2 min-w-0">
            <span className="text-start">{t('dashboard.stockName')}</span>
            <span className="text-center tabular-nums">{t('dashboard.sharesOwned')}</span>
            <span className="text-center tabular-nums">{t('dashboard.unitPrice')}</span>
            <span className="text-center tabular-nums">{t('dashboard.lastPrice')}</span>
            <span className="text-center tabular-nums">{t('dashboard.marketValue')}</span>
            <span className="text-center tabular-nums">{t('dashboard.unrealizedReturn')}</span>
          </div>
          {sortedHoldings.map((holding) => {
            const currentPrice = livePrices[holding.ticker]?.price ?? holding.avgPrice;
            const totalValue = currentPrice * holding.shares;
            const cost = holding.avgPrice * holding.shares;
            const gainEgp = totalValue - cost;
            const gainPercent = cost > 0 ? (gainEgp / cost) * 100 : 0;
            const isProfit = gainEgp > 0;
            const isLoss = gainEgp < 0;
            const returnColor = isProfit
              ? 'text-emerald-700 dark:text-emerald-400'
              : isLoss
                ? 'text-red-700 dark:text-red-400'
                : 'text-emerald-600 dark:text-emerald-500';

            return (
              <div
                key={holding.id}
                className="grid grid-cols-6 gap-4 items-center py-4 px-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--text-muted)]/30 transition-colors cursor-pointer min-w-0"
                onClick={() => navigate(`/stocks/${holding.ticker}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/stocks/${holding.ticker}`)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[var(--bg-primary)] text-[var(--text-primary)] font-bold text-sm"
                    aria-hidden
                  >
                    {holding.ticker.slice(0, 2)}
                  </div>
                  <span className="text-body font-semibold text-[var(--text-primary)] truncate">{holding.ticker}</span>
                </div>
                <span className="text-center font-number tabular-nums text-[var(--text-primary)]">
                  {holding.shares.toLocaleString()}
                </span>
                <span className="text-center font-number tabular-nums text-[var(--text-primary)]">
                  {formatPrice(holding.avgPrice)} <span className="text-label text-[var(--text-muted)]">EGP</span>
                </span>
                <span className="text-center font-number tabular-nums text-[var(--text-primary)]">
                  {formatPrice(currentPrice)} <span className="text-label text-[var(--text-muted)]">EGP</span>
                </span>
                <span className="text-center font-number tabular-nums text-[var(--text-primary)]">
                  {formatEgp(totalValue)} <span className="text-label text-[var(--text-muted)]">EGP</span>
                </span>
                <span className={`text-center inline-flex items-center justify-center gap-1 font-semibold tabular-nums ${returnColor}`}>
                  {isProfit ? <TrendingUp className="w-4 h-4 shrink-0" /> : isLoss ? <TrendingDown className="w-4 h-4 shrink-0" /> : null}
                  ({isProfit ? '+' : ''}{gainPercent.toFixed(2)}%) {isProfit ? '+' : ''}{formatEgp(gainEgp)} EGP
                </span>
              </div>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
