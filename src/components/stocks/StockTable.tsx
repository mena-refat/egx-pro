import React from 'react';
import { StockCard } from './StockCard';
import type { StockWithMeta } from '../../hooks/useStockScreener';

export interface StockTableProps {
  stocks: StockWithMeta[];
  watchlist: string[];
  onSelectStock: (stock: StockWithMeta) => void;
  onToggleWatchlist: (e: React.MouseEvent, ticker: string) => void;
  t: (key: string) => string;
  lang: string;
}

export function StockTable({
  stocks,
  watchlist,
  onSelectStock,
  onToggleWatchlist,
  t,
  lang,
}: StockTableProps) {
  return (
    <ul className="space-y-3">
      {stocks.map((stock) => (
        <React.Fragment key={stock.ticker}>
          <StockCard
            stock={stock}
            inWatchlist={watchlist.includes(stock.ticker)}
            onSelect={() => onSelectStock(stock)}
            onToggleWatchlist={(e) => onToggleWatchlist(e, stock.ticker)}
            t={t}
            lang={lang}
          />
        </React.Fragment>
      ))}
    </ul>
  );
}
