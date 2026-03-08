import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getStockName, getStockInfo } from '../../../lib/egxStocks';

interface StockCardProps {
  ticker: string;
  price?: number;
  change?: number;
  changePercent?: number;
  isConnected: boolean;
}

const StockCard = memo(function StockCard({
  ticker,
  price = 0,
  change = 0,
  changePercent = 0,
  isConnected
}: StockCardProps) {
  const { t, i18n } = useTranslation('common');
  const isPositive = change >= 0;
  const isRTL = i18n.language.startsWith('ar');
  const lang = isRTL ? 'ar' : 'en';
  const info = getStockInfo(ticker);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        card-base card-elevated p-5 rounded-2xl border-l-4
        ${isPositive ? 'border-l-[var(--positive)]' : 'border-l-[var(--negative)]'}
        group transition-all duration-200
      `}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-header font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
            {getStockName(ticker, lang)}
          </h3>
          <p className="text-label mt-0.5">{ticker}</p>
          {info?.nameEn && (
            <p className="text-label mt-0.5 truncate max-w-[180px]" title={info.nameEn}>{info.nameEn}</p>
          )}
          {!isConnected && (
            <span className="text-label text-[var(--warning)] animate-pulse font-medium">
              {t('common.updating')}
            </span>
          )}
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-label font-bold tabular-nums ${
          isPositive ? 'bg-[var(--success-bg)] text-[var(--positive)]' : 'bg-[var(--danger-bg)] text-[var(--negative)]'
        }`}>
          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          <span>{isPositive ? '+' : ''}{changePercent.toFixed(2)}%</span>
        </div>
      </div>

      <div className="relative h-12 flex items-end">
        <AnimatePresence mode="wait">
          <motion.span
            key={price}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-3xl font-bold font-number text-[var(--text-primary)] tracking-tight"
          >
            {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-body font-normal text-[var(--text-muted)] ml-1 mr-1">EGP</span>
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--border)] flex justify-end items-center">
        <div className={`text-body font-bold font-number tabular-nums flex items-center gap-1 ${isPositive ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
          {isPositive ? '↑' : '↓'} {isPositive ? '+' : ''}{Math.abs(change).toFixed(2)}
        </div>
      </div>
    </motion.div>
  );
});

export default StockCard;
