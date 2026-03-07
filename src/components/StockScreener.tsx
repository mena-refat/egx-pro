import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, TrendingUp, TrendingDown, Star, Plus, Circle, Timer } from 'lucide-react';
import api from '../lib/api';
import { useLivePrices } from '../hooks/useLivePrices';
import { useAuthStore } from '../store/authStore';
import { searchStocks, getStockName, getStockInfo } from '../lib/egxStocks';
import { getSector, isInEGX30, isInEGX70, isInEGX100 } from '../lib/egxIndicesSectors';
import { Stock } from '../types';

interface StockWithMeta extends Stock {
  inEGX30?: boolean;
  inEGX70?: boolean;
  inEGX100?: boolean;
}

type FilterId = 'all' | 'egx30' | 'egx70' | 'egx100' | 'banks' | 'realestate' | 'industry' | 'healthcare' | 'topGainers' | 'topLosers';
type SortId = 'ticker' | 'price' | 'change' | 'volume';

interface StockScreenerProps {
  onSelectStock: (stock: Stock) => void;
}

export default function StockScreener({ onSelectStock }: StockScreenerProps) {
  const { t, i18n } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const isPro = user?.plan === 'pro' || user?.plan === 'yearly';
  const [stocks, setStocks] = useState<StockWithMeta[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [sort, setSort] = useState<SortId>('ticker');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWatchlistLimitModal, setShowWatchlistLimitModal] = useState(false);

  const { prices: livePrices } = useLivePrices();
  const isAr = i18n.language === 'ar';
  const lang = isAr ? 'ar' : 'en';

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [stocksRes, watchlistRes] = await Promise.all([
        api.get('/stocks/prices'),
        api.get('/watchlist'),
      ]);
      const raw = Array.isArray(stocksRes.data) ? stocksRes.data : [];
      const withMeta: StockWithMeta[] = raw.map((s: Record<string, unknown>) => {
        const ticker = String(s.ticker ?? '');
        const info = getStockInfo(ticker);
        const nameAr = info?.nameAr ?? '';
        const nameEn = info?.nameEn ?? '';
        const sector = getSector(ticker, nameAr, nameEn, lang);
        return {
          ticker,
          name: isAr ? nameAr : nameEn || ticker,
          price: Number(s.price) || 0,
          change: Number(s.change) || 0,
          changePercent: Number(s.changePercent) || 0,
          volume: Number(s.volume) || 0,
          marketCap: Number(s.marketCap) || 0,
          sector,
          description: '',
          inEGX30: isInEGX30(ticker),
          inEGX70: isInEGX70(ticker),
          inEGX100: isInEGX100(ticker),
        };
      });
      setStocks(withMeta);
      setWatchlist(Array.isArray(watchlistRes.data) ? (watchlistRes.data as { ticker: string }[]).map((w) => w.ticker) : []);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      setError(msg || t('stocks.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleWatchlist = async (e: React.MouseEvent, ticker: string) => {
    e.stopPropagation();
    const isIn = watchlist.includes(ticker);
    try {
      if (isIn) {
        await api.delete(`/watchlist/${ticker}`);
        setWatchlist((prev) => prev.filter((t) => t !== ticker));
      } else {
        await api.post('/watchlist', { ticker });
        setWatchlist((prev) => [...prev, ticker]);
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('profile-completion-changed'));
      }
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err ? (err as { response?: { data?: { code?: string } } }).response?.data : undefined;
      if (data?.code === 'WATCHLIST_LIMIT') setShowWatchlistLimitModal(true);
    }
  };

  const merged = useMemo(() => {
    return stocks.map((s) => livePrices[s.ticker] ? { ...s, ...livePrices[s.ticker], sector: s.sector, inEGX30: s.inEGX30, inEGX70: s.inEGX70, inEGX100: s.inEGX100 } : s);
  }, [stocks, livePrices]);

  const filtered = useMemo(() => {
    let list = merged;
    const searchTrim = search.trim();
    if (searchTrim) {
      const matches = searchStocks(searchTrim, lang).map((e) => e.ticker.toUpperCase());
      const set = new Set(matches);
      if (set.size > 0) list = list.filter((s) => set.has(s.ticker.toUpperCase()));
      else list = list.filter((s) => s.ticker.toUpperCase().includes(searchTrim.toUpperCase()) || getStockName(s.ticker, lang).toLowerCase().includes(searchTrim.toLowerCase()));
    }
    if (filter === 'egx30') list = list.filter((s) => s.inEGX30);
    if (filter === 'egx70') list = list.filter((s) => s.inEGX70);
    if (filter === 'egx100') list = list.filter((s) => s.inEGX100);
    if (filter === 'banks') list = list.filter((s) => (isAr ? s.sector === 'بنوك' : s.sector === 'Banks'));
    if (filter === 'realestate') list = list.filter((s) => (isAr ? s.sector === 'عقارات' : s.sector === 'Real Estate'));
    if (filter === 'industry') list = list.filter((s) => (isAr ? s.sector === 'صناعة' : s.sector === 'Industry'));
    if (filter === 'healthcare') list = list.filter((s) => (isAr ? s.sector === 'رعاية صحية' : s.sector === 'Healthcare'));
    if (filter === 'topGainers') list = [...list].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0)).slice(0, 50);
    if (filter === 'topLosers') list = [...list].sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0)).slice(0, 50);
    return list;
  }, [merged, search, filter, isAr, lang]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort === 'ticker') list.sort((a, b) => a.ticker.localeCompare(b.ticker));
    if (sort === 'price') list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    if (sort === 'change') list.sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
    if (sort === 'volume') list.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    return list;
  }, [filtered, sort]);

  const filters: { id: FilterId; labelKey: string }[] = [
    { id: 'all', labelKey: 'stocks.filterAll' },
    { id: 'egx30', labelKey: 'stocks.filterEGX30' },
    { id: 'egx70', labelKey: 'stocks.filterEGX70' },
    { id: 'egx100', labelKey: 'stocks.filterEGX100' },
    { id: 'banks', labelKey: 'stocks.filterBanks' },
    { id: 'realestate', labelKey: 'stocks.filterRealEstate' },
    { id: 'industry', labelKey: 'stocks.filterIndustry' },
    { id: 'healthcare', labelKey: 'stocks.filterHealthcare' },
    { id: 'topGainers', labelKey: 'stocks.filterTopGainers' },
    { id: 'topLosers', labelKey: 'stocks.filterTopLosers' },
  ];

  const formatVol = (v: number) => {
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
    return String(v);
  };

  if (loading) {
    return (
      <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="h-12 w-full max-w-md bg-[var(--bg-secondary)] rounded-xl animate-pulse" />
        <div className="h-10 w-full overflow-hidden rounded-xl bg-[var(--bg-secondary)] animate-pulse" />
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-[var(--bg-secondary)] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-bg)] p-6 text-center" dir={isAr ? 'rtl' : 'ltr'}>
        <p className="text-[var(--danger-text)]">{error}</p>
        <button type="button" onClick={fetchData} className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-500">
          {t('stocks.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('stocks.title')}</h1>
          {isPro ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10">
              <Circle className="w-3 h-3 fill-emerald-500" aria-hidden />
              {t('delay.liveBadge')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full bg-[var(--bg-secondary)]">
              <Timer className="w-3 h-3" aria-hidden />
              {t('delay.delayedBadge')}
            </span>
          )}
        </div>
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 ltr:left-3 rtl:right-3" />
          <input
            type="text"
            placeholder={t('stocks.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-[var(--bg-card)] py-2.5 ltr:pl-10 ltr:pr-4 rtl:pr-10 rtl:pl-4 text-[var(--text-primary)] placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f.id
                ? 'bg-violet-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <span>{t('stocks.sortLabel')}</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortId)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-[var(--bg-card)] px-3 py-1.5 text-[var(--text-primary)]"
        >
          <option value="ticker">{t('stocks.sortByTicker')}</option>
          <option value="price">{t('stocks.sortByPrice')}</option>
          <option value="change">{t('stocks.sortByChange')}</option>
          <option value="volume">{t('stocks.sortByVolume')}</option>
        </select>
      </div>

      <ul className="space-y-3">
        {sorted.map((stock) => {
          const inWatch = watchlist.includes(stock.ticker);
          const changeP = stock.changePercent ?? 0;
          const isUp = changeP >= 0;
          return (
            <li
              key={stock.ticker}
              role="button"
              tabIndex={0}
              onClick={() => onSelectStock(stock)}
              onKeyDown={(e) => e.key === 'Enter' && onSelectStock(stock)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-[var(--bg-card)]/50 p-4 hover:border-violet-400 dark:hover:border-violet-500/50 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stock.ticker}</p>
                  <p className="font-medium text-[var(--text-primary)] truncate">{getStockName(stock.ticker, lang)}</p>
                </div>
                <div className="text-left ltr:text-right shrink-0">
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {(stock.price ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} {t('stocks.egp')}
                  </p>
                  <p className={`text-sm font-semibold flex items-center justify-end gap-0.5 ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--danger-text)]'}`}>
                    {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {isUp ? '+' : ''}{(changeP).toFixed(2)}%
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t('stocks.volume')}: {formatVol(stock.volume ?? 0)}
                </span>
                <button
                  type="button"
                  onClick={(e) => toggleWatchlist(e, stock.ticker)}
                  className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                    inWatch ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400 hover:bg-[var(--bg-card-hover)]'
                  }`}
                >
                  {inWatch ? <Star className="w-3.5 h-3.5 fill-amber-500" /> : <Plus className="w-3.5 h-3.5" />}
                  {inWatch ? t('stockDetail.watchlistRemove') : t('stocks.watchlistAdd')}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {sorted.length === 0 && (
        <div className="text-center py-12 rounded-xl border border-dashed border-[var(--border)] text-slate-500 dark:text-slate-400">
          {t('stocks.noResults')}
        </div>
      )}

      {showWatchlistLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowWatchlistLimitModal(false)}>
          <div className="bg-[var(--bg-card)] rounded-2xl shadow-xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">{t('plan.watchlistLimitMessage')}</p>
            <div className="flex gap-2 justify-center">
              <button type="button" onClick={() => { setShowWatchlistLimitModal(false); window.dispatchEvent(new CustomEvent('navigate-to-subscription')); }} className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-sm">{t('plan.subscribeNow')}</button>
              <button type="button" onClick={() => setShowWatchlistLimitModal(false)} className="px-4 py-2.5 border border-[var(--border)] rounded-xl font-medium text-sm">{t('plan.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
