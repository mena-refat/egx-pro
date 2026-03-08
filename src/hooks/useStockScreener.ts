import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useLivePrices } from './useLivePrices';
import { searchStocks, getStockName, getStockInfo } from '../lib/egxStocks';
import { getSector, isInEGX30, isInEGX70, isInEGX100 } from '../lib/egxIndicesSectors';
import { Stock } from '../types';

export interface StockWithMeta extends Stock {
  inEGX30?: boolean;
  inEGX70?: boolean;
  inEGX100?: boolean;
}

export type FilterId =
  | 'all'
  | 'egx30'
  | 'egx70'
  | 'egx100'
  | 'banks'
  | 'realestate'
  | 'industry'
  | 'healthcare'
  | 'topGainers'
  | 'topLosers';
export type SortId = 'ticker' | 'price' | 'change' | 'volume';

export const FILTERS: { id: FilterId; labelKey: string }[] = [
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

export function formatVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  return String(v);
}

export function useStockScreener() {
  const { t, i18n } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const isPro = user?.plan === 'pro' || user?.plan === 'yearly';
  const { prices: livePrices } = useLivePrices();
  const isAr = i18n.language.startsWith('ar');
  const lang = isAr ? 'ar' : 'en';

  const [stocks, setStocks] = useState<StockWithMeta[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [sort, setSort] = useState<SortId>('ticker');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWatchlistLimitModal, setShowWatchlistLimitModal] = useState(false);
  const [addTargetModal, setAddTargetModal] = useState<{ ticker: string } | null>(null);
  const [addTargetPrice, setAddTargetPrice] = useState('');
  const [addTargetSubmitting, setAddTargetSubmitting] = useState(false);

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const [stocksRes, watchlistRes] = await Promise.all([
          api.get('/stocks/prices', { signal }),
          api.get('/watchlist', { signal }),
        ]);
        if (signal?.aborted) return;
        const rawList = (stocksRes.data as { data?: unknown[] })?.data ?? stocksRes.data;
        const raw = Array.isArray(rawList) ? rawList : [];
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
        const watchlistItems = (watchlistRes.data as { items?: { ticker: string }[] })?.items;
        setWatchlist(Array.isArray(watchlistItems) ? watchlistItems.map((w) => w.ticker) : []);
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          (err.name === 'AbortError' || (err as { code?: string }).code === 'ERR_CANCELED')
        )
          return;
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
            : null;
        setError(msg || t('stocks.loadError'));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [lang, isAr, t]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const toggleWatchlist = useCallback(
    async (e: React.MouseEvent, ticker: string) => {
      e.stopPropagation();
      const isIn = watchlist.includes(ticker);
      if (isIn) {
        try {
          await api.delete(`/watchlist/${ticker}`);
          setWatchlist((prev) => prev.filter((t) => t !== ticker));
        } catch {
          // ignore
        }
        return;
      }
      setAddTargetModal({ ticker });
      setAddTargetPrice('');
    },
    [watchlist]
  );

  const submitAddWithTarget = useCallback(async () => {
    if (!addTargetModal) return;
    setAddTargetSubmitting(true);
    try {
      const targetPriceNum = addTargetPrice.trim() ? parseFloat(addTargetPrice) : undefined;
      await api.post('/watchlist', {
        ticker: addTargetModal.ticker,
        ...(targetPriceNum != null &&
        Number.isFinite(targetPriceNum) &&
        targetPriceNum > 0
          ? { targetPrice: targetPriceNum }
          : {}),
      });
      setWatchlist((prev) => [...prev, addTargetModal.ticker]);
      setAddTargetModal(null);
      if (typeof window !== 'undefined')
        window.dispatchEvent(new CustomEvent('profile-completion-changed'));
    } catch (err: unknown) {
      const data =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
          : undefined;
      if (data?.error === 'WATCHLIST_LIMIT_REACHED') setShowWatchlistLimitModal(true);
    } finally {
      setAddTargetSubmitting(false);
    }
  }, [addTargetModal, addTargetPrice]);

  const merged = useMemo(() => {
    return stocks.map((s) =>
      livePrices[s.ticker]
        ? {
            ...s,
            ...livePrices[s.ticker],
            sector: s.sector,
            inEGX30: s.inEGX30,
            inEGX70: s.inEGX70,
            inEGX100: s.inEGX100,
          }
        : s
    );
  }, [stocks, livePrices]);

  const filtered = useMemo(() => {
    let list = merged;
    const searchTrim = search.trim();
    if (searchTrim) {
      const matches = searchStocks(searchTrim, lang).map((e) => e.ticker.toUpperCase());
      const set = new Set(matches);
      if (set.size > 0) list = list.filter((s) => set.has(s.ticker.toUpperCase()));
      else
        list = list.filter(
          (s) =>
            s.ticker.toUpperCase().includes(searchTrim.toUpperCase()) ||
            getStockName(s.ticker, lang).toLowerCase().includes(searchTrim.toLowerCase())
        );
    }
    if (filter === 'egx30') list = list.filter((s) => s.inEGX30);
    if (filter === 'egx70') list = list.filter((s) => s.inEGX70);
    if (filter === 'egx100') list = list.filter((s) => s.inEGX100);
    if (filter === 'banks') list = list.filter((s) => (isAr ? s.sector === 'بنوك' : s.sector === 'Banks'));
    if (filter === 'realestate')
      list = list.filter((s) => (isAr ? s.sector === 'عقارات' : s.sector === 'Real Estate'));
    if (filter === 'industry')
      list = list.filter((s) => (isAr ? s.sector === 'صناعة' : s.sector === 'Industry'));
    if (filter === 'healthcare')
      list = list.filter((s) => (isAr ? s.sector === 'رعاية صحية' : s.sector === 'Healthcare'));
    if (filter === 'topGainers')
      list = [...list].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0)).slice(0, 50);
    if (filter === 'topLosers')
      list = [...list].sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0)).slice(0, 50);
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

  return {
    sorted,
    watchlist,
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    loading,
    error,
    fetchData,
    toggleWatchlist,
    showWatchlistLimitModal,
    setShowWatchlistLimitModal,
    addTargetModal,
    setAddTargetModal,
    addTargetPrice,
    setAddTargetPrice,
    addTargetSubmitting,
    submitAddWithTarget,
    isAr,
    lang,
    isPro,
    t,
  };
}
