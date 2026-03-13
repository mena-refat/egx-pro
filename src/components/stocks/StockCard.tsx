import React from 'react';
import { TrendingUp, TrendingDown, Star, Plus } from 'lucide-react';
import { getStockName } from '../../lib/egxStocks';
import type { StockWithMeta } from '../../hooks/useStockScreener';
import { formatVolume, GICS_SECTOR_LABELS } from '../../hooks/useStockScreener';

export interface StockCardProps {
  stock: StockWithMeta;
  inWatchlist: boolean;
  onSelect: () => void;
  onToggleWatchlist: (e: React.MouseEvent) => void;
  t: (key: string) => string;
  lang: string;
}

export function StockCard({
  stock,
  inWatchlist,
  onSelect,
  onToggleWatchlist,
  t,
  lang,
}: StockCardProps) {
  const changeP = stock.changePercent ?? 0;
  const isUp = changeP >= 0;

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 border-l-4 cursor-pointer
        transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5
        ${isUp ? 'border-l-[var(--positive)]' : 'border-l-[var(--negative)]'}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-label uppercase tracking-wider">{stock.ticker}</p>
            {(stock.sector && stock.sector.trim()) ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--brand-subtle)] text-[var(--brand)] font-medium">
                {stock.sector}
              </span>
            ) : stock.gicsSector && GICS_SECTOR_LABELS[stock.gicsSector] ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--brand-subtle)] text-[var(--brand)] font-medium">
                {lang === 'ar' ? GICS_SECTOR_LABELS[stock.gicsSector].ar : GICS_SECTOR_LABELS[stock.gicsSector].en}
              </span>
            ) : null}
            {stock.inEGX30 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--success-bg)] text-[var(--success)] font-medium" title={lang === 'ar' ? 'مؤشر EGX 30' : 'EGX 30 Index'}>
                {t('stocks.index30')}
              </span>
            )}
            {stock.inEGX70 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning)] font-medium" title={lang === 'ar' ? 'مؤشر EGX 70' : 'EGX 70 Index'}>
                {t('stocks.index70')}
              </span>
            )}
            {stock.inEGX100 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--cream-bg)] text-[var(--cream)] font-medium" title={lang === 'ar' ? 'مؤشر EGX 100' : 'EGX 100 Index'}>
                {t('stocks.index100')}
              </span>
            )}
          </div>
          <p className="font-medium text-body text-[var(--text-primary)] truncate">
            {getStockName(stock.ticker, lang as 'ar' | 'en')}
          </p>
        </div>
        <div className="text-left ltr:text-right shrink-0">
          <p className="text-body font-bold font-number tabular-nums text-[var(--text-primary)]">
            {(stock.price ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} {t('stocks.egp')}
          </p>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label font-bold tabular-nums ${
              isUp
                ? 'bg-[var(--success-bg)] text-[var(--positive)]'
                : 'bg-[var(--danger-bg)] text-[var(--negative)]'
            }`}
          >
            {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {isUp ? '+' : ''}
            {changeP.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]">
        <span className="text-xs text-[var(--text-muted)]">
          {t('stocks.volume')}: {formatVolume(stock.volume ?? 0)}
        </span>
        <button
          type="button"
          onClick={onToggleWatchlist}
          className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
            inWatchlist
              ? 'bg-[var(--warning-bg)] text-[var(--warning)]'
              : 'text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)]'
          }`}
        >
          {inWatchlist ? (
            <Star className="w-3.5 h-3.5 fill-[var(--warning)]" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          {inWatchlist ? t('stockDetail.watchlistRemove') : t('stocks.watchlistAdd')}
        </button>
      </div>
    </li>
  );
}
