import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
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
import { useWatchlistTargets } from '../hooks/useWatchlistTargets';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

export default function DashboardPage() {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const { prices: livePrices, isConnected, connectionError } = useLivePrices();
  const { holdings, stats, isLoading: portfolioLoading, error: portfolioError } = usePortfolio(livePrices);
  const { marketOverview, watchlist, watchlistLoading } = useDashboardMarketWatchlist();

  useWatchlistTargets(watchlist, livePrices);

  const { topGainer, topLoser } = useMemo(() => {
    type SessionStock = { ticker: string; changePercent: number } | null;
    let gainer: SessionStock = null;
    let loser: SessionStock = null;
    let bestGain = -Infinity;
    let worstLoss = Infinity;
    holdings.forEach((h) => {
      const sessionChange = livePrices[h.ticker]?.changePercent ?? 0;
      if (sessionChange > 0 && sessionChange > bestGain) {
        bestGain = sessionChange;
        gainer = { ticker: h.ticker, changePercent: sessionChange };
      }
      if (sessionChange < 0 && sessionChange < worstLoss) {
        worstLoss = sessionChange;
        loser = { ticker: h.ticker, changePercent: sessionChange };
      }
    });
    return { topGainer: gainer, topLoser: loser };
  }, [holdings, livePrices]);

  const isRTL = i18n.language.startsWith('ar');
  const goToStocks = useCallback(() => navigate('/stocks'), [navigate]);
  const gainPercent = stats.gainPercent ?? 0;

  if (portfolioLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      dir={isRTL ? 'rtl' : 'ltr'}
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {(!isConnected || connectionError) && (
        <motion.div
          variants={fadeUp}
          className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs text-center py-2 rounded-xl"
          role="status"
        >
          {connectionError || t('dashboard.reconnectingLive', { defaultValue: 'جاري إعادة الاتصال بالأسعار المباشرة...' })}
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <DashboardMarketBar egx30={marketOverview?.egx30 ?? null} locale={i18n.language} />
      </motion.div>

      <motion.div variants={fadeUp}>
        <DashboardPortfolioHero
          totalInvested={stats.totalCost}
          totalValue={stats.totalValue}
          totalGain={stats.totalGain}
          gainPercent={gainPercent}
          loading={portfolioLoading}
          error={portfolioError}
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <DashboardYourStocks holdings={holdings} livePrices={livePrices} loading={portfolioLoading} />
      </motion.div>

      <motion.div variants={fadeUp}>
        <DashboardTopPerformer topGainer={topGainer} topLoser={topLoser} loading={portfolioLoading} />
      </motion.div>

      <motion.div variants={fadeUp} className="card-base card-elevated rounded-2xl overflow-hidden">
        <div className="p-8">
          <h3 className="text-header font-semibold mb-6">{t('dashboard.watchlist')}</h3>
          <DashboardWatchlistList
            watchlist={watchlist}
            livePrices={livePrices}
            loading={watchlistLoading}
            onGoToStocks={goToStocks}
            lang={isRTL ? 'ar' : 'en'}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
