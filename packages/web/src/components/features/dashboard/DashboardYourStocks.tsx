import React, { useState, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PieChart, TrendingUp, TrendingDown, ChevronUp, ChevronDown } from 'lucide-react';
import { Skeleton } from '../../ui/Skeleton';
import EmptyState from '../../shared/EmptyState';
import type { PortfolioHolding } from '../../../types/portfolio';
import { getStockName } from '../../../lib/egxStocks';
import { BlurNum } from '../../ui/BlurNum';

type Props = {
  holdings: PortfolioHolding[];
  livePrices: Record<string, { price: number }>;
  loading: boolean;
};

type SortKey = 'name' | 'shares' | 'unitPrice' | 'lastPrice' | 'marketValue' | 'unrealized';
type SortDir = 'asc' | 'desc';
type SortHeaderProps = {
  active: boolean;
  columnKey: SortKey;
  label: string;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
};

function formatEgp(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

function formatPrice(p: number): string {
  return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SortHeader({ active, columnKey, label, sortDir, onSort }: SortHeaderProps) {
  return (
    <button
      type="button"
      onClick={() => onSort(columnKey)}
      className="inline-flex items-center justify-center gap-1.5 tabular-nums text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)] rounded px-1 py-0.5"
      aria-label={label}
    >
      <span>{label}</span>
      <span className="inline-flex flex-col gap-0 items-center">
        <ChevronUp
          className={`w-4 h-4 shrink-0 stroke-[2.5] ${active && sortDir === 'asc' ? 'text-[var(--brand)] opacity-100' : 'opacity-40'}`}
          aria-hidden
        />
        <ChevronDown
          className={`w-4 h-4 shrink-0 stroke-[2.5] -mt-2 ${active && sortDir === 'desc' ? 'text-[var(--brand)] opacity-100' : 'opacity-40'}`}
          aria-hidden
        />
      </span>
    </button>
  );
}

export const DashboardYourStocks = memo(function DashboardYourStocks({ holdings, livePrices, loading }: Props) {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const isRTL = i18n.language.startsWith('ar');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const lang = isRTL ? 'ar' : 'en';

  // Aggregate duplicate tickers by WACC before display
  const aggregatedHoldings = useMemo<PortfolioHolding[]>(() => {
    const map = new Map<string, { ticker: string; shares: number; totalCost: number; buyDate: string }>();
    for (const h of holdings) {
      if (map.has(h.ticker)) {
        const e = map.get(h.ticker)!;
        e.totalCost += h.avgPrice * h.shares;
        e.shares += h.shares;
      } else {
        map.set(h.ticker, { ticker: h.ticker, shares: h.shares, totalCost: h.avgPrice * h.shares, buyDate: h.buyDate });
      }
    }
    return Array.from(map.values()).map(({ ticker, shares, totalCost, buyDate }) => ({
      id: ticker,
      ticker,
      shares,
      avgPrice: shares > 0 ? totalCost / shares : 0,
      buyDate,
    }));
  }, [holdings]);

  const sortedHoldings = useMemo(() => {
    const withMeta = aggregatedHoldings.map((h) => {
      const currentPrice = livePrices[h.ticker]?.price ?? h.avgPrice;
      const totalValue = currentPrice * h.shares;
      const cost = h.avgPrice * h.shares;
      const gainEgp = totalValue - cost;
      const gainPercent = cost > 0 ? (gainEgp / cost) * 100 : 0;
      return { holding: h, currentPrice, totalValue, cost, gainEgp, gainPercent };
    });
    withMeta.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = (getStockName(a.holding.ticker, lang) || a.holding.ticker).localeCompare(getStockName(b.holding.ticker, lang) || b.holding.ticker);
          break;
        case 'shares':
          cmp = a.holding.shares - b.holding.shares;
          break;
        case 'unitPrice':
          cmp = a.holding.avgPrice - b.holding.avgPrice;
          break;
        case 'lastPrice':
          cmp = a.currentPrice - b.currentPrice;
          break;
        case 'marketValue':
          cmp = a.totalValue - b.totalValue;
          break;
        case 'unrealized':
          cmp = a.gainPercent - b.gainPercent;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return withMeta;
  }, [aggregatedHoldings, livePrices, sortKey, sortDir, lang]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

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
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 shrink-0" aria-hidden />
              <SortHeader active={sortKey === 'name'} columnKey="name" label={t('dashboard.stockName')} sortDir={sortDir} onSort={handleSort} />
            </div>
            <div className="flex justify-center">
              <SortHeader active={sortKey === 'shares'} columnKey="shares" label={t('dashboard.sharesOwned')} sortDir={sortDir} onSort={handleSort} />
            </div>
            <div className="flex justify-center">
              <SortHeader active={sortKey === 'unitPrice'} columnKey="unitPrice" label={t('dashboard.unitPrice')} sortDir={sortDir} onSort={handleSort} />
            </div>
            <div className="flex justify-center">
              <SortHeader active={sortKey === 'lastPrice'} columnKey="lastPrice" label={t('dashboard.lastPrice')} sortDir={sortDir} onSort={handleSort} />
            </div>
            <div className="flex justify-center">
              <SortHeader active={sortKey === 'marketValue'} columnKey="marketValue" label={t('dashboard.marketValue')} sortDir={sortDir} onSort={handleSort} />
            </div>
            <div className="flex justify-center">
              <SortHeader active={sortKey === 'unrealized'} columnKey="unrealized" label={t('dashboard.unrealizedReturn')} sortDir={sortDir} onSort={handleSort} />
            </div>
          </div>
          {sortedHoldings.map(({ holding, currentPrice, totalValue, gainEgp, gainPercent }, idx) => {
            const isProfit = gainEgp > 0;
            const isLoss = gainEgp < 0;
            const returnColor = isProfit
              ? 'text-emerald-700 dark:text-emerald-400'
              : isLoss
                ? 'text-red-700 dark:text-red-400'
                : 'text-emerald-600 dark:text-emerald-500';

            return (
              <motion.div
                key={holding.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: idx * 0.04, ease: [0.25, 0.1, 0.25, 1] }}
                className="grid grid-cols-6 gap-4 items-center py-4 px-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--brand)]/20 hover:shadow-sm hover:-translate-y-px transition-all duration-200 cursor-pointer min-w-0"
                onClick={() => navigate(`/stocks/${holding.ticker}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/stocks/${holding.ticker}`)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold shadow-sm ${
                      isProfit
                        ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/20'
                        : isLoss
                          ? 'bg-gradient-to-br from-red-400 to-rose-500 shadow-red-500/20'
                          : 'bg-gradient-to-br from-[var(--brand)] to-violet-500 shadow-[var(--brand)]/20'
                    }`}
                    aria-hidden
                  >
                    {holding.ticker.slice(0, 2)}
                  </div>
                  <span className="text-body font-semibold text-[var(--text-primary)] truncate">{getStockName(holding.ticker, lang) || holding.ticker}</span>
                </div>
                <span className="text-center font-number tabular-nums text-[var(--text-primary)]">
                  <BlurNum>{holding.shares.toLocaleString()}</BlurNum>
                </span>
                <span className="text-center font-number tabular-nums text-[var(--text-primary)]">
                  <BlurNum>{formatPrice(holding.avgPrice)}</BlurNum> <span className="text-label text-[var(--text-muted)]">EGP</span>
                </span>
                <span className="text-center font-number tabular-nums text-[var(--text-primary)]">
                  <BlurNum>{formatPrice(currentPrice)}</BlurNum> <span className="text-label text-[var(--text-muted)]">EGP</span>
                </span>
                <span className="text-center font-number tabular-nums text-[var(--text-primary)]">
                  <BlurNum>{formatEgp(totalValue)}</BlurNum> <span className="text-label text-[var(--text-muted)]">EGP</span>
                </span>
                <span className={`text-center inline-flex items-center justify-center gap-1 font-semibold tabular-nums ${returnColor}`}>
                  {isProfit ? <TrendingUp className="w-4 h-4 shrink-0" /> : isLoss ? <TrendingDown className="w-4 h-4 shrink-0" /> : null}
                  ({isProfit ? '+' : ''}{gainPercent.toFixed(2)}%) <BlurNum>{isProfit ? '+' : ''}{formatEgp(gainEgp)} EGP</BlurNum>
                </span>
              </motion.div>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
});
