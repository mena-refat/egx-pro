import React, { useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Skeleton } from '../components/ui/Skeleton';
import PortfolioPerformanceChart from '../components/PortfolioPerformanceChart';
import {
  DashboardMarketBar,
  DashboardPortfolioHero,
  DashboardYourStocks,
  DashboardTopPerformer,
  DashboardWatchlistList,
} from '../components/features/dashboard';
import { useLivePrices } from '../hooks/useLivePrices';
import { usePortfolio } from '../hooks/usePortfolio';
import { useDashboardMarketWatchlist } from '../hooks/useDashboardMarketWatchlist';

export default function DashboardPage() {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const { prices: livePrices, isConnected } = useLivePrices();
  const { holdings, stats, isLoading: portfolioLoading, error: portfolioError } = usePortfolio(livePrices);
  const { marketOverview, watchlist, watchlistLoading } = useDashboardMarketWatchlist();

  useEffect(() => {
    const items = watchlist
      .filter((w: { ticker: string; targetPrice?: number | null }) => w.targetPrice != null && typeof w.targetPrice === 'number')
      .map((w: { ticker: string; targetPrice: number }) => ({
        ticker: w.ticker,
        targetPrice: w.targetPrice,
        currentPrice: livePrices[w.ticker]?.price ?? 0,
      }))
      .filter((item: { currentPrice: number; targetPrice: number }) => item.currentPrice >= item.targetPrice);
    if (items.length === 0) return;
    api.post('/watchlist/check-targets', { items }).catch(() => {});
  }, [watchlist, livePrices]);

  const topPerformer = useMemo(() => {
    if (!holdings.length) return { ticker: '--', change: 0 };
    let best = holdings[0];
    let bestChange = -Infinity;
    holdings.forEach((h) => {
      const currentPrice = livePrices[h.ticker]?.price || h.avgPrice;
      const change = ((currentPrice - h.avgPrice) / h.avgPrice) * 100;
      if (change > bestChange) {
        bestChange = change;
        best = h;
      }
    });
    return { ticker: best.ticker, change: bestChange === -Infinity ? 0 : bestChange };
  }, [holdings, livePrices]);

  const isRTL = i18n.language.startsWith('ar');
  const goToStocks = useCallback(() => navigate('/stocks'), [navigate]);
  const gainPercent = stats.gainPercent ?? 0;

  if (portfolioLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <DashboardMarketBar egx30={marketOverview?.egx30 ?? null} locale={i18n.language} />

      <DashboardPortfolioHero
        totalInvested={stats.totalCost}
        totalValue={stats.totalValue}
        totalGain={stats.totalGain}
        gainPercent={gainPercent}
        loading={portfolioLoading}
        error={portfolioError}
      />

      <DashboardYourStocks
        holdings={holdings}
        livePrices={livePrices}
        loading={portfolioLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <DashboardTopPerformer
            ticker={topPerformer.ticker}
            change={topPerformer.change}
            loading={portfolioLoading}
          />

          <div className="card-base card-elevated p-8 rounded-2xl">
            <h3 className="text-header font-semibold mb-6">{t('dashboard.portfolioPerformance')}</h3>
            <PortfolioPerformanceChart />
          </div>

          <div className="card-base card-elevated p-8 rounded-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-header font-semibold">{t('dashboard.watchlist')}</h3>
            </div>
            <DashboardWatchlistList
              watchlist={watchlist}
              livePrices={livePrices}
              loading={watchlistLoading}
              onGoToStocks={goToStocks}
              lang={isRTL ? 'ar' : 'en'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
