import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Eye, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { getStockName, getStockInfo } from '../../../lib/egxStocks';
import { Skeleton } from '../../ui/Skeleton';
import EmptyState from '../../shared/EmptyState';
import type { Stock } from '../../../types';

type LivePrices = Record<string, { price?: number; change?: number; changePercent?: number }>;
type WatchlistStock = Stock & { targetPrice?: number | null; targetDirection?: 'UP' | 'DOWN' | null };

type Props = {
  watchlist: WatchlistStock[];
  livePrices: LivePrices;
  loading: boolean;
  onGoToStocks: () => void;
  lang: 'ar' | 'en';
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export const DashboardWatchlistList = memo(function DashboardWatchlistList({
  watchlist,
  livePrices,
  loading,
  onGoToStocks,
  lang,
}: Props) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
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
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      initial="hidden"
      animate="show"
    >
      {watchlist.map((w) => {
        const priceData = livePrices[w.ticker];
        const stock = { ...w, ...priceData };
        const ch = (stock.changePercent ?? stock.change ?? 0) as number;
        const isUp = ch >= 0;
        const hasAlert = w.targetPrice != null;
        const alertDir = w.targetDirection ?? 'UP';
        const initials = stock.ticker.slice(0, 2);

        return (
          <motion.button
            type="button"
            key={stock.ticker}
            variants={itemVariants}
            onClick={() => navigate(`/stocks/${stock.ticker}`)}
            className="group w-full text-start flex items-center gap-4 p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--brand)]/25 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            aria-label={t('stockDetail.viewStock', { ticker: stock.ticker, defaultValue: `عرض ${getStockName(stock.ticker, lang)}` })}
          >
            {/* Gradient avatar */}
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold text-white shadow-md ${
                isUp
                  ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/20'
                  : 'bg-gradient-to-br from-red-400 to-rose-500 shadow-red-500/20'
              }`}
            >
              {initials}
            </div>

            {/* Name + ticker */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-sm text-[var(--text-primary)] truncate">
                  {getStockName(stock.ticker, lang)}
                </p>
                {hasAlert && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] shrink-0">
                    <Bell className="w-2.5 h-2.5" />
                    {alertDir === 'DOWN' ? '↓' : '↑'} {w.targetPrice!.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {stock.ticker}
                {getStockInfo(stock.ticker)?.nameEn && (
                  <span className="ms-1.5 hidden sm:inline">{getStockInfo(stock.ticker)?.nameEn}</span>
                )}
              </p>
            </div>

            {/* Price + change badge */}
            <div className="text-end shrink-0">
              <p className="font-number text-sm font-semibold text-[var(--text-primary)]">
                {(stock.price || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                <span className="text-xs text-[var(--text-muted)] ms-1">EGP</span>
              </p>
              <span
                className={`inline-block mt-1.5 text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
                  isUp
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'bg-red-500/10 text-red-700 dark:text-red-400'
                }`}
              >
                {isUp ? '↑ +' : '↓ '}{typeof ch === 'number' ? ch.toFixed(2) : ch}%
              </span>
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
});
