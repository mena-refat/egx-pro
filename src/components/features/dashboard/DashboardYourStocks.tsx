import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PieChart } from 'lucide-react';
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
        <h3 className="text-header font-semibold mb-6 text-[var(--text-primary)]">{t('dashboard.yourStocks')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card-base card-elevated p-8 rounded-2xl">
      <h3 className="text-header font-semibold mb-6 text-[var(--text-primary)]">{t('dashboard.yourStocks')}</h3>

      {sortedHoldings.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title={t('portfolio.emptyTitle')}
          description={t('portfolio.emptyDescription')}
          actionLabel={t('portfolio.addFirst')}
          onAction={() => navigate('/portfolio')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {sortedHoldings.map((holding) => {
            const currentPrice = livePrices[holding.ticker]?.price ?? holding.avgPrice;
            const totalValue = currentPrice * holding.shares;
            const cost = holding.avgPrice * holding.shares;
            const gainEgp = totalValue - cost;
            const gainPercent = cost > 0 ? (gainEgp / cost) * 100 : 0;
            const isProfit = gainEgp > 0;
            const isLoss = gainEgp < 0;
            const colorClass = isProfit
              ? 'text-emerald-700 dark:text-emerald-400'
              : isLoss
                ? 'text-red-700 dark:text-red-400'
                : 'text-emerald-600 dark:text-emerald-500';

            return (
              <div
                key={holding.id}
                className="card-base card-elevated p-5 rounded-2xl flex items-center gap-4 transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer"
                onClick={() => navigate(`/stocks/${holding.ticker}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/stocks/${holding.ticker}`)}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[var(--bg-secondary)] text-[var(--text-primary)] font-bold text-sm"
                  aria-hidden
                >
                  {holding.ticker.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1" dir={isRTL ? 'rtl' : 'ltr'}>
                  <p className="text-header font-bold text-[var(--text-primary)] truncate">{holding.ticker}</p>
                  <p className="text-body font-number tabular-nums text-[var(--text-primary)] mt-0.5">
                    {formatEgp(totalValue)} <span className="text-label text-[var(--text-muted)]">EGP</span>
                  </p>
                  <p className={`text-label font-semibold tabular-nums mt-1 ${colorClass}`}>
                    {isProfit ? '+' : ''}{formatEgp(gainEgp)} EGP ({isProfit ? '+' : ''}{gainPercent.toFixed(2)}%)
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
