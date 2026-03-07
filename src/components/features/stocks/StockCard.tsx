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
      className="card-base p-5 hover:shadow-violet-500/10 group"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold dark:text-white text-slate-900 group-hover:text-violet-500 transition-colors">
            {getStockName(ticker, lang)}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{ticker}</p>
          {info?.nameEn && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[180px]" title={info.nameEn}>{info.nameEn}</p>
          )}
          {!isConnected && (
            <span className="text-[10px] text-amber-500 animate-pulse font-medium">
              {t('common.updating')}
            </span>
          )}
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
          isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
        }`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{Math.abs(changePercent).toFixed(2)}%</span>
        </div>
      </div>

      <div className="relative h-12 flex items-end">
        <AnimatePresence mode="wait">
          <motion.span
            key={price}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-3xl font-black dark:text-white text-slate-900 tracking-tighter"
          >
            {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-sm font-normal text-slate-500 ml-1 mr-1">EGP</span>
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="mt-4 pt-4 border-t dark:border-white/5 border-slate-100 flex justify-end items-center">
        <div className={`text-lg font-bold flex items-center gap-1 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
          {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(2)}
        </div>
      </div>
    </motion.div>
  );
});

export default StockCard;
