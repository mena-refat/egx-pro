import { getStockName, getStockInfo } from '../lib/egxStocks';

interface StockNameDisplayProps {
  ticker: string;
  lang: 'ar' | 'en';
  className?: string;
}

/** Renders: name (by lang) big, ticker small, nameEn small below */
export default function StockNameDisplay({ ticker, lang, className = '' }: StockNameDisplayProps) {
  const name = getStockName(ticker, lang);
  const info = getStockInfo(ticker);
  const nameEn = info?.nameEn;

  return (
    <div className={className}>
      <div className="font-bold text-lg leading-tight">{name}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{ticker}</div>
      {nameEn && (
        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[200px]" title={nameEn}>
          {nameEn}
        </div>
      )}
    </div>
  );
}
