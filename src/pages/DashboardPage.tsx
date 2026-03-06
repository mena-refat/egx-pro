import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import StockCard from '../components/StockCard.tsx';
import PortfolioPerformanceChart from '../components/PortfolioPerformanceChart';
import { useLivePrices } from '../hooks/useLivePrices';
import { usePortfolio } from '../hooks/usePortfolio';
import { getStockName, getStockInfo } from '../lib/egxStocks';
import { Stock } from '../types';

export default function DashboardPage() {
  const { t, i18n } = useTranslation('common');
  const { prices: livePrices, isConnected } = useLivePrices();
  const { holdings, stats, isLoading: portfolioLoading, error: portfolioError } = usePortfolio(livePrices);

  const [marketOverview, setMarketOverview] = useState<{
    usdEgp: { value: number; change: number; changePercent: number };
    egx30: { value: number; change: number; changePercent: number };
    egx30Capped?: { value: number; change: number; changePercent: number };
    egx70: { value: number; change: number; changePercent: number };
    egx100: { value: number; change: number; changePercent: number };
    egx33: { value: number; change: number; changePercent: number };
    egx35: { value: number; change: number; changePercent: number };
    gold: { value: number; change: number; changePercent: number };
    lastUpdated: number;
  } | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [showMarketOverview, setShowMarketOverview] = useState(true);
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);

  const fetchMarketOverview = async () => {
    setMarketLoading(true);
    setMarketError(null);
    try {
      const res = await api.get('/stocks/market/overview');
      setMarketOverview(res.data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMarketError(err.message);
      } else {
        setMarketError('Failed to fetch market overview');
      }
    } finally {
      setMarketLoading(false);
    }
  };

  const fetchWatchlist = async () => {
    setWatchlistLoading(true);
    try {
      const res = await api.get('/watchlist');
      setWatchlist(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch watchlist', err);
      setWatchlist([]);
    } finally {
      setWatchlistLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketOverview();
    fetchWatchlist();
  }, []);

  // Notify when a watchlist item reaches its target price
  useEffect(() => {
    const items = watchlist
      .filter((w: { ticker: string; targetPrice?: number | null }) => w.targetPrice != null && typeof w.targetPrice === 'number')
      .map((w: { ticker: string; targetPrice: number }) => ({
        ticker: w.ticker,
        targetPrice: w.targetPrice,
        currentPrice: livePrices[w.ticker]?.price ?? 0,
      }))
      .filter((item: { currentPrice: number; targetPrice: number }) => item.currentPrice >= item.targetPrice);
    if (items.length === 0) return;
    api.post('/watchlist/check-targets', { items }).catch(() => {});
  }, [watchlist, livePrices]);

  const liveWatchlistStocks = useMemo(() => {
    return watchlist.map(w => livePrices[w.ticker] || w).slice(0, 4);
  }, [watchlist, livePrices]);

  const topPerformer = useMemo(() => {
    if (!holdings.length) return { ticker: '--', change: 0 };
    let best = holdings[0];
    let bestChange = -Infinity;
    holdings.forEach(h => {
      const currentPrice = livePrices[h.ticker]?.price || h.avgPrice;
      const change = ((currentPrice - h.avgPrice) / h.avgPrice) * 100;
      if (change > bestChange) {
        bestChange = change;
        best = h;
      }
    });
    return { ticker: best.ticker, change: bestChange === -Infinity ? 0 : bestChange };
  }, [holdings, livePrices]);

  const isRTL = i18n.language === 'ar';

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* سطر حالة السوق: اليمين = السوق مفتوح، اليسار = إخفاء المؤشرات */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className="font-medium text-slate-200">
            {isConnected ? (isRTL ? 'السوق مفتوح' : 'Market Open') : (isRTL ? 'جاري الاتصال...' : 'Connecting...')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowMarketOverview(!showMarketOverview)}
          className="text-sm text-slate-500 hover:text-slate-400 transition-colors"
        >
          {showMarketOverview ? (isRTL ? 'إخفاء المؤشرات' : 'Hide Indicators') : (isRTL ? 'إظهار المؤشرات' : 'Show Indicators')}
        </button>
      </div>

      {/* المؤشرات — شريط أفقي scrollable */}
      {showMarketOverview && (
        <div className="overflow-x-auto pb-2 -mx-1 scrollbar-thin">
          {marketLoading ? (
            <div className="flex gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 w-32 shrink-0 rounded-xl bg-slate-800/50 animate-pulse" />
              ))}
            </div>
          ) : marketError ? (
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-center text-red-400 text-sm">
              <p>{marketError}</p>
              <button type="button" onClick={fetchMarketOverview} className="mt-2 text-violet-400 hover:underline">
                {isRTL ? 'إعادة المحاولة' : 'Retry'}
              </button>
            </div>
          ) : marketOverview ? (
            <div className="flex gap-3 min-w-0">
              {[
                { label: t('market.egx30'), value: marketOverview.egx30?.value, change: marketOverview.egx30?.changePercent },
                { label: t('market.egx30Capped'), value: marketOverview.egx30Capped?.value, change: marketOverview.egx30Capped?.changePercent },
                { label: t('market.egx70'), value: marketOverview.egx70?.value, change: marketOverview.egx70?.changePercent },
                { label: t('market.egx100'), value: marketOverview.egx100?.value, change: marketOverview.egx100?.changePercent },
                { label: t('market.usdEgp'), value: marketOverview.usdEgp?.value, change: marketOverview.usdEgp?.changePercent },
                { label: t('market.egx33Sharia'), value: marketOverview.egx33?.value, change: marketOverview.egx33?.changePercent },
                { label: t('market.egx35lv'), value: marketOverview.egx35?.value, change: marketOverview.egx35?.changePercent },
                { label: 'Gold', value: marketOverview.gold?.value, change: marketOverview.gold?.changePercent },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="shrink-0 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 min-w-[120px]"
                >
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{item.label}</p>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-sm font-bold text-slate-100">
                      {item.value != null ? Number(item.value).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                    </span>
                    {item.change != null && (
                      <span className={`text-[10px] font-semibold ${item.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {item.change >= 0 ? '+' : ''}{Number(item.change).toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* Live Prices Grid */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">
            {watchlist.length > 0 ? (i18n.language === 'ar' ? 'قائمة المتابعة اللحظية' : 'Live Watchlist') : t('market.livePrices')}
          </h3>
          <div className={`flex items-center gap-2 text-[10px] ${isConnected ? 'text-emerald-500' : 'text-amber-500'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {isConnected ? 'Live' : 'Connecting...'}
          </div>
        </div>
        
        {watchlistLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card-base p-6 h-32 animate-pulse bg-slate-800/50" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {liveWatchlistStocks.map(stock => (
              <div key={stock.ticker}>
                <StockCard 
                  ticker={stock.ticker}
                  price={stock.price}
                  change={stock.change}
                  changePercent={stock.changePercent}
                  isConnected={isConnected}
                />
              </div>
            ))}
            {liveWatchlistStocks.length === 0 && (
              <div className="col-span-full text-center p-8 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                {i18n.language === 'ar' ? 'لا توجد أسهم في قائمة المتابعة' : 'No stocks in watchlist'}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-base p-6">
              <h4 className="text-sm text-slate-400 mb-2">{i18n.language === 'ar' ? 'إجمالي القيمة' : 'Total Value'}</h4>
              {portfolioLoading ? (
                <div className="h-10 w-32 bg-slate-800 animate-pulse rounded" />
              ) : portfolioError ? (
                <div className="text-red-500 text-sm">{portfolioError}</div>
              ) : (
                <p className="text-3xl font-bold">{stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-sm font-normal text-slate-500">EGP</span></p>
              )}
            </div>
            <div className="card-base p-6">
              <h4 className="text-sm text-slate-400 mb-2">{i18n.language === 'ar' ? 'أفضل سهم' : 'Top Performer'}</h4>
              {portfolioLoading ? (
                <div className="h-10 w-32 bg-slate-800 animate-pulse rounded" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-emerald-500">{topPerformer.ticker}</p>
                  {topPerformer.ticker !== '--' && (
                    <span className="text-xs text-emerald-500/80 font-bold">({topPerformer.change.toFixed(2)}%)</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="card-base p-8">
            <h3 className="text-xl font-bold mb-6">{i18n.language === 'ar' ? 'أداء المحفظة' : 'Portfolio Performance'}</h3>
            <PortfolioPerformanceChart />
          </div>
          
          <div className="card-base p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{i18n.language === 'ar' ? 'قائمة المتابعة' : 'Watchlist'}</h3>
            </div>
            
            {watchlistLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-800/50 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {watchlist.map(w => {
                  const stock = livePrices[w.ticker] || w;
                  return (
                    <div key={stock.ticker} className="flex justify-between items-center p-4 bg-slate-800/50 dark:bg-slate-800/50 bg-slate-50 rounded-2xl border border-white/5 dark:border-white/5 border-slate-200">
                      <div>
                        <p className="font-bold">{getStockName(stock.ticker, i18n.language === 'ar' ? 'ar' : 'en')}</p>
                        <p className="text-xs text-slate-500">{stock.ticker}</p>
                        {getStockInfo(stock.ticker)?.nameEn && (
                          <p className="text-xs text-slate-400 mt-0.5">{getStockInfo(stock.ticker)!.nameEn}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{(stock.price || 0).toLocaleString()} EGP</p>
                        <p className={`text-xs font-bold ${(stock.change || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {(stock.change || 0) >= 0 ? '+' : ''}{(stock.change || 0)}%
                        </p>
                      </div>
                    </div>
                  );
                })}
                {watchlist.length === 0 && (
                  <p className="text-slate-500 text-sm italic col-span-2">{i18n.language === 'ar' ? 'لا توجد أسهم في قائمة المتابعة' : 'No stocks in watchlist'}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
