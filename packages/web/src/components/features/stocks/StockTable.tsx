import React from 'react';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';
import { getStockName } from '../../../lib/egxStocks';
import { formatVolume } from '../../../hooks/useStockScreener';
import type { StockWithMeta } from '../../../hooks/useStockScreener';
import type { TFunction } from 'i18next';

interface StockTableProps {
  stocks: StockWithMeta[];
  watchlist: string[];
  onSelectStock: (stock: StockWithMeta) => void;
  onToggleWatchlist: (e: React.MouseEvent, ticker: string) => void;
  t: TFunction;
  lang: 'ar' | 'en';
}

export function StockTable({ stocks, watchlist, onSelectStock, onToggleWatchlist, t, lang }: StockTableProps) {
  if (stocks.length === 0) return null;

  return (
    <div className="space-y-2">
      {stocks.map((stock) => {
        const isPositive = (stock.changePercent ?? 0) >= 0;
        const isInWatchlist = watchlist.includes(stock.ticker);

        return (
          <div
            key={stock.ticker}
            onClick={() => onSelectStock(stock)}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--brand)]/30 cursor-pointer transition-all group"
          >
            {/* Ticker + Name */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                {stock.ticker}
              </p>
              <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                {getStockName(stock.ticker, lang)}
              </p>
            </div>

            {/* Volume */}
            <div className="hidden sm:block text-end min-w-[60px]">
              <p className="text-xs text-[var(--text-muted)]">{t('stocks.volume')}</p>
              <p className="text-xs font-medium text-[var(--text-secondary)] tabular-nums">
                {formatVolume(stock.volume ?? 0)}
              </p>
            </div>

            {/* Change % */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold tabular-nums min-w-[70px] justify-center
              ${isPositive ? 'bg-[var(--success-bg)] text-[var(--positive)]' : 'bg-[var(--danger-bg)] text-[var(--negative)]'}`}
            >
              {isPositive
                ? <TrendingUp className="w-3 h-3 shrink-0" />
                : <TrendingDown className="w-3 h-3 shrink-0" />
              }
              {isPositive ? '+' : ''}{(stock.changePercent ?? 0).toFixed(2)}%
            </div>

            {/* Price */}
            <div className="text-end min-w-[72px]">
              <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                {(stock.price ?? 0).toFixed(2)}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">{t('stocks.egp')}</p>
            </div>

            {/* Watchlist button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleWatchlist(e, stock.ticker); }}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all shrink-0
                ${isInWatchlist
                  ? 'border-[var(--brand)]/40 bg-[var(--brand)]/10 text-[var(--brand)]'
                  : 'border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:border-[var(--brand)]/30 hover:text-[var(--brand)]'
                }`}
              aria-label={isInWatchlist ? t('stocks.watchlistRemove') : t('stocks.watchlistAdd')}
            >
              <Star className={`w-3.5 h-3.5 ${isInWatchlist ? 'fill-[var(--brand)]' : ''}`} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
