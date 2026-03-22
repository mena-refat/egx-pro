import React, { useRef, useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getStockName } from '../../../lib/egxStocks';
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

// ─── Single row — has its own hook to track price changes ───────────────────
interface RowProps {
  stock: StockWithMeta;
  index: number;
  isInWatchlist: boolean;
  onSelectStock: (s: StockWithMeta) => void;
  onToggleWatchlist: (e: React.MouseEvent, ticker: string) => void;
  t: TFunction;
  lang: 'ar' | 'en';
}

function StockRow({ stock, index, isInWatchlist, onSelectStock, onToggleWatchlist, t, lang }: RowProps) {
  const change   = stock.changePercent ?? 0;
  const isPositive = change >= 0;
  const absChange  = Math.abs(change);

  // ── Price flash on live update ──────────────────────────────────────────
  const prevPriceRef = useRef<number | null>(null);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (prevPriceRef.current === null) {
      prevPriceRef.current = stock.price;
      return;
    }
    if (stock.price !== prevPriceRef.current) {
      setFlash(stock.price > prevPriceRef.current ? 'up' : 'down');
      prevPriceRef.current = stock.price;
      const id = setTimeout(() => setFlash(null), 900);
      return () => clearTimeout(id);
    }
  }, [stock.price]);

  return (
    <motion.div
      custom={index}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.035, 0.35), ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -1, transition: { duration: 0.12 } }}
      onClick={() => onSelectStock(stock)}
      className="relative flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] cursor-pointer overflow-hidden group"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
    >
      {/* Hover gradient overlay */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${
        isPositive
          ? 'bg-gradient-to-r from-emerald-500/4 via-transparent to-transparent'
          : 'bg-gradient-to-r from-rose-500/4 via-transparent to-transparent'
      }`} />

      {/* Ticker + Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors duration-150 leading-tight">
          {stock.ticker}
        </p>
        <p className="text-xs text-[var(--text-muted)] truncate mt-0.5 leading-tight">
          {getStockName(stock.ticker, lang)}
        </p>
      </div>

      {/* Change % pill */}
      <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold tabular-nums shrink-0 ${
        isPositive
          ? 'bg-gradient-to-br from-emerald-500/15 to-emerald-500/8 text-emerald-400 border border-emerald-500/20'
          : 'bg-gradient-to-br from-rose-500/15 to-rose-500/8 text-rose-400 border border-rose-500/20'
      }`}>
        {isPositive
          ? <TrendingUp className="w-3 h-3 shrink-0" aria-hidden />
          : <TrendingDown className="w-3 h-3 shrink-0" aria-hidden />
        }
        {isPositive ? '+' : '-'}{absChange.toFixed(2)}%
      </div>

      {/* Price — flashes on live update */}
      <div className="text-end shrink-0 min-w-[68px]">
        <motion.p
          key={stock.price}
          initial={flash ? {
            backgroundColor: flash === 'up' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
            borderRadius: '6px',
          } : false}
          animate={{ backgroundColor: 'rgba(0,0,0,0)' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-sm font-black tabular-nums leading-tight text-[var(--text-primary)] px-1 -mx-1"
        >
          {(stock.price ?? 0).toFixed(2)}
        </motion.p>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{t('stocks.egp')}</p>
      </div>

      {/* Live dot — pulses when price just changed */}
      <AnimatePresence>
        {flash && (
          <motion.span
            key="dot"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-2 end-2 w-1.5 h-1.5 rounded-full ${
              flash === 'up' ? 'bg-emerald-400' : 'bg-rose-400'
            }`}
          />
        )}
      </AnimatePresence>

      {/* Watchlist button */}
      <motion.button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleWatchlist(e, stock.ticker); }}
        whileTap={{ scale: 0.78 }}
        whileHover={{ scale: 1.1 }}
        transition={{ duration: 0.12 }}
        className={`w-8 h-8 flex items-center justify-center rounded-lg border shrink-0 transition-colors duration-150 ${
          isInWatchlist
            ? 'border-amber-400/40 bg-amber-400/10 text-amber-400'
            : 'border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:border-amber-400/30 hover:text-amber-400'
        }`}
        aria-label={isInWatchlist ? t('stocks.watchlistRemove') : t('stocks.watchlistAdd')}
      >
        <Star className={`w-3.5 h-3.5 transition-all duration-150 ${isInWatchlist ? 'fill-amber-400' : ''}`} />
      </motion.button>
    </motion.div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────
export function StockTable({ stocks, watchlist, onSelectStock, onToggleWatchlist, t, lang }: StockTableProps) {
  if (stocks.length === 0) return null;

  return (
    <div className="space-y-2">
      {stocks.map((stock, i) => (
        <StockRow
          key={stock.ticker}
          stock={stock}
          index={i}
          isInWatchlist={watchlist.includes(stock.ticker)}
          onSelectStock={onSelectStock}
          onToggleWatchlist={onToggleWatchlist}
          t={t}
          lang={lang}
        />
      ))}
    </div>
  );
}
