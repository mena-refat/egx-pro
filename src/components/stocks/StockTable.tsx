import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { StockCard } from './StockCard';
import type { StockWithMeta } from '../../hooks/useStockScreener';

/** ارتفاع الصف = ارتفاع البطاقة + مسافة؛ البطاقة تحتوي على سطرين + شريط سفلي */
const ROW_HEIGHT_ESTIMATE = 132;
const ROW_GAP = 4;
const OVERSCAN = 5;

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
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: stocks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT_ESTIMATE + ROW_GAP,
    overscan: OVERSCAN,
  });

  if (stocks.length === 0) return null;

  return (
    <div
      ref={parentRef}
      className="overflow-auto rounded-xl"
      style={{ maxHeight: 'min(70vh, 600px)' }}
    >
      <ul
        className="relative w-full list-none p-0 m-0"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const stock = stocks[virtualRow.index];
          return (
            <li
              key={stock.ticker}
              className="absolute left-0 w-full px-0 box-border"
              style={{
                top: virtualRow.start,
                height: `${virtualRow.size}px`,
                paddingBottom: ROW_GAP,
                boxSizing: 'border-box',
              }}
            >
              <StockCard
                as="div"
                stock={stock}
                inWatchlist={watchlist.includes(stock.ticker)}
                onSelect={() => onSelectStock(stock)}
                onToggleWatchlist={(e) => onToggleWatchlist(e, stock.ticker)}
                t={t}
                lang={lang}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
