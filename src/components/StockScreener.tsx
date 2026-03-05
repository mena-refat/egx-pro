import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, TrendingUp, TrendingDown, Star, StarOff } from 'lucide-react';
import { motion } from 'motion/react';
import api from '../lib/api';
import { useLivePrices } from '../hooks/useLivePrices';
import { searchStocks } from '../lib/egxStocks';
import StockNameDisplay from './StockNameDisplay';
import { Stock } from '../types';

interface StockScreenerProps {
  onSelectStock: (stock: Stock) => void;
}

export default function StockScreener({ onSelectStock }: StockScreenerProps) {
  const { i18n } = useTranslation('common');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { prices: livePrices } = useLivePrices();

  const isRTL = i18n.language === 'ar';

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [stocksRes, watchlistRes] = await Promise.all([
        api.get('/stocks/prices'),
        api.get('/watchlist')
      ]);
      
      if (Array.isArray(stocksRes.data)) {
        setStocks(stocksRes.data);
      }
      if (Array.isArray(watchlistRes.data)) {
        setWatchlist(watchlistRes.data.map((w: { ticker: string }) => w.ticker));
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setError((err as any).response?.data?.error || 'Failed to fetch stocks data');
      } else {
        setError('Failed to fetch stocks data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleWatchlist = async (ticker: string) => {
    const isInWatchlist = watchlist.includes(ticker);
    try {
      if (isInWatchlist) {
        await api.delete(`/watchlist/${ticker}`);
        setWatchlist(prev => prev.filter(t => t !== ticker));
      } else {
        await api.post('/watchlist', { ticker });
        setWatchlist(prev => [...prev, ticker]);
      }
    } catch (err) {
      console.error('Watchlist toggle error', err);
    }
  };

  const sectors = useMemo(() => {
    return ['All', ...new Set(stocks.map(s => s.sector).filter(Boolean))];
  }, [stocks]);

  const filteredStocks = useMemo(() => {
    const lang = i18n.language === 'ar' ? 'ar' : 'en';
    const searchTrim = search.trim();
    const matchingTickers = searchTrim
      ? new Set(searchStocks(searchTrim, lang).map((eg) => eg.ticker.toUpperCase()))
      : null;
    return stocks
      .filter((s) => {
        const matchesSearch = !matchingTickers || matchingTickers.has(s.ticker.toUpperCase());
        const matchesSector = sectorFilter === 'All' || s.sector === sectorFilter;
        return matchesSearch && matchesSector;
      })
      .map((s) => livePrices[s.ticker] || s);
  }, [stocks, search, sectorFilter, livePrices, i18n.language]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4">
          <div className="h-12 w-96 bg-slate-800/50 animate-pulse rounded-xl" />
          <div className="h-12 w-32 bg-slate-800/50 animate-pulse rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-800/50 animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 card-base">
        <p>{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-500">
          {isRTL ? 'إعادة المحاولة' : 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input 
            type="text"
            placeholder={isRTL ? 'ابحث عن سهم...' : 'Search stocks...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-white/5 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="text-slate-500 w-4 h-4" />
          <select 
            value={sectorFilter}
            onChange={e => setSectorFilter(e.target.value)}
            className="bg-slate-800 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all w-full md:w-auto"
          >
            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredStocks.map(stock => (
          <motion.div 
            key={stock.ticker}
            whileHover={{ y: -5 }}
            onClick={() => onSelectStock(stock)}
            className="card-base p-6 hover:border-violet-500/30 cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <StockNameDisplay ticker={stock.ticker} lang={isRTL ? 'ar' : 'en'} className="group-hover:text-violet-500 transition-colors" />
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleWatchlist(stock.ticker); }}
                className={`p-2 transition-colors ${watchlist.includes(stock.ticker) ? 'text-yellow-500' : 'text-slate-400 hover:text-yellow-500'}`}
              >
                {watchlist.includes(stock.ticker) ? <Star className="w-4 h-4 fill-yellow-500" /> : <StarOff className="w-4 h-4" />}
              </button>
            </div>
            
            <div className="flex justify-between items-end">
              <div>
                <p className="text-2xl font-bold">{(stock.price || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider">{stock.sector}</p>
              </div>
              <div className={`flex items-center gap-1 text-sm font-bold ${(stock.change || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {(stock.change || 0) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {(stock.change || 0) >= 0 ? '+' : ''}{(stock.changePercent || 0).toFixed(2)}%
              </div>
            </div>
          </motion.div>
        ))}
        {filteredStocks.length === 0 && (
          <div className="col-span-full text-center p-8 text-slate-500 border border-dashed border-slate-700 rounded-xl">
            {isRTL ? 'لا توجد نتائج' : 'No results found'}
          </div>
        )}
      </div>
    </div>
  );
}
