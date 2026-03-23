import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { clearCache } from '../lib/queryCache';
import { useAuthStore } from '../store/authStore';
import { useLivePrices } from './useLivePrices';
import { getStockInfo } from '../lib/egxStocks';
import { getSector } from '../lib/egxIndicesSectors';
import type { Stock } from '../types';

export const SECTOR_OPTIONS = [
  { value: '', labelAr: 'كل القطاعات', labelEn: 'All Sectors' },
  { value: 'INFORMATION_TECHNOLOGY', labelAr: 'تكنولوجيا المعلومات', labelEn: 'Information Technology' },
  { value: 'HEALTH_CARE', labelAr: 'الرعاية الصحية', labelEn: 'Health Care' },
  { value: 'FINANCIALS', labelAr: 'المالية', labelEn: 'Financials' },
  { value: 'CONSUMER_DISCRETIONARY', labelAr: 'الاستهلاك التقديري', labelEn: 'Consumer Discretionary' },
  { value: 'CONSUMER_STAPLES', labelAr: 'السلع الأساسية', labelEn: 'Consumer Staples' },
  { value: 'ENERGY', labelAr: 'الطاقة', labelEn: 'Energy' },
  { value: 'INDUSTRIALS', labelAr: 'الصناعة', labelEn: 'Industrials' },
  { value: 'MATERIALS', labelAr: 'المواد الخام', labelEn: 'Materials' },
  { value: 'UTILITIES', labelAr: 'المرافق', labelEn: 'Utilities' },
  { value: 'REAL_ESTATE', labelAr: 'العقارات', labelEn: 'Real Estate' },
  { value: 'COMMUNICATION_SERVICES', labelAr: 'خدمات الاتصالات', labelEn: 'Communication Services' },
] as const;

export const GICS_SECTOR_LABELS: Record<string, { ar: string; en: string }> = {
  INFORMATION_TECHNOLOGY: { ar: 'تكنولوجيا المعلومات', en: 'Information Technology' },
  HEALTH_CARE: { ar: 'الرعاية الصحية', en: 'Health Care' },
  FINANCIALS: { ar: 'المالية', en: 'Financials' },
  CONSUMER_DISCRETIONARY: { ar: 'الاستهلاك التقديري', en: 'Consumer Discretionary' },
  CONSUMER_STAPLES: { ar: 'السلع الأساسية', en: 'Consumer Staples' },
  ENERGY: { ar: 'الطاقة', en: 'Energy' },
  INDUSTRIALS: { ar: 'الصناعة', en: 'Industrials' },
  MATERIALS: { ar: 'المواد الخام', en: 'Materials' },
  UTILITIES: { ar: 'المرافق', en: 'Utilities' },
  REAL_ESTATE: { ar: 'العقارات', en: 'Real Estate' },
  COMMUNICATION_SERVICES: { ar: 'خدمات الاتصالات', en: 'Communication Services' },
};

export interface StockWithMeta extends Stock {
  gicsSector?: string | null;
}

export type FilterId =
  | 'all'
  | 'egx30'
  | 'egx70'
  | 'egx100'
  | 'egx35lv'
  | 'egx33'
  | 'topGainers'
  | 'topLosers';
export type SortId = 'ticker' | 'price' | 'change' | 'volume';

export const FILTERS: { id: FilterId; labelKey: string }[] = [
  { id: 'all',        labelKey: 'stocks.filterAll' },
  { id: 'egx30',     labelKey: 'stocks.filterEGX30' },
  { id: 'egx70',     labelKey: 'stocks.filterEGX70EWI' },
  { id: 'egx100',    labelKey: 'stocks.filterEGX100EWI' },
  { id: 'egx35lv',   labelKey: 'stocks.filterEGX35LV' },
  { id: 'egx33',     labelKey: 'stocks.filterEGX33' },
  { id: 'topGainers', labelKey: 'stocks.filterTopGainers' },
  { id: 'topLosers',  labelKey: 'stocks.filterTopLosers' },
];

export function formatVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  return String(v);
}

// Default sort order per sort field (matches previous client-side behavior)
const SORT_ORDER: Record<SortId, 'asc' | 'desc'> = {
  ticker: 'asc',
  price:  'desc',
  change: 'desc',
  volume: 'desc',
};

const PAGE_SIZE = 25;

function mapRawStock(s: Record<string, unknown>, isAr: boolean, lang: 'ar' | 'en'): StockWithMeta {
  const ticker = String(s.ticker ?? '');
  const info = getStockInfo(ticker);
  const nameAr = info?.nameAr ?? '';
  const nameEn = info?.nameEn ?? '';
  const apiSector = typeof s.sector === 'string' ? s.sector : null;
  const fallbackSector = getSector(ticker, nameAr, nameEn, lang);
  return {
    ticker,
    name: isAr ? nameAr : nameEn || ticker,
    price: Number(s.price) || 0,
    change: Number(s.change) || 0,
    changePercent: Number(s.changePercent) || 0,
    volume: Number(s.volume) || 0,
    marketCap: Number(s.marketCap) || 0,
    sector: apiSector
      ? (GICS_SECTOR_LABELS[apiSector] ? (isAr ? GICS_SECTOR_LABELS[apiSector].ar : GICS_SECTOR_LABELS[apiSector].en) : apiSector)
      : fallbackSector,
    description: '',
    gicsSector: apiSector,
  };
}

export function useStockScreener() {
  const { t, i18n } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const isPro = user?.plan === 'pro' || user?.plan === 'yearly';
  const isPaid = isPro || user?.plan === 'ultra' || user?.plan === 'ultra_yearly';

  const isAr = i18n.language.startsWith('ar');
  const lang = isAr ? 'ar' : 'en';

  // Pagination state
  const [page,  setPage]  = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  // Filter/sort state
  const [filter, setFilterState] = useState<FilterId>('all');
  const [sector, setSectorState] = useState('');
  const [sort,   setSortState]   = useState<SortId>('ticker');

  // Search state — separate immediate value (for UI) and debounced value (for API)
  const [search,         setSearch]         = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input (350 ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Setters that reset page to 1
  const setFilter = useCallback((f: FilterId) => { setFilterState(f); setPage(1); }, []);
  const setSector = useCallback((s: string)   => { setSectorState(s); setPage(1); }, []);
  const setSort   = useCallback((s: SortId)   => { setSortState(s);   setPage(1); }, []);

  // Reset page when debounced search changes
  const prevDebouncedSearch = useRef(debouncedSearch);
  useEffect(() => {
    if (prevDebouncedSearch.current !== debouncedSearch) {
      prevDebouncedSearch.current = debouncedSearch;
      setPage(1);
    }
  }, [debouncedSearch]);

  // Stocks data
  const [stocks,   setStocks]   = useState<StockWithMeta[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  // Modal state
  const [showWatchlistLimitModal,  setShowWatchlistLimitModal]  = useState(false);
  const [showPriceAlertProModal,   setShowPriceAlertProModal]   = useState(false);
  const [addTargetModal,           setAddTargetModal]           = useState<{ ticker: string } | null>(null);
  const [addTargetPrice,           setAddTargetPrice]           = useState('');
  const [addTargetSubmitting,      setAddTargetSubmitting]      = useState(false);
  const [addTargetError,           setAddTargetError]           = useState<string | null>(null);

  // Live prices for current page stocks only
  const subscribedTickers = useMemo(
    () => (stocks.length > 0 ? stocks.map((s) => s.ticker) : undefined),
    [stocks],
  );
  const { prices: livePrices, isConnected, connectionError } = useLivePrices(subscribedTickers);

  // Fetch watchlist once on mount
  useEffect(() => {
    let cancelled = false;
    api.get('/watchlist').then((res) => {
      if (cancelled) return;
      const items = (res.data as { items?: { ticker: string }[] })?.items;
      setWatchlist(Array.isArray(items) ? items.map((w) => w.ticker) : []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Main data fetch — re-runs whenever any filter/sort/pagination param changes
  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number> = {
          page,
          limit: PAGE_SIZE,
          sort,
          order: SORT_ORDER[sort],
        };
        if (debouncedSearch) params.q = debouncedSearch;
        if (filter !== 'all')  params.filter = filter;
        if (sector)            params.sector = sector;

        const stocksRes = await api.get('/stocks/prices', { params, signal, timeout: 60_000 });
        if (signal?.aborted) return;

        // Support both new paginated format { stocks, total, page, pages }
        // and old flat-array format (for backward compat while server restarts)
        const rd = stocksRes.data as { stocks?: unknown[]; total?: number; page?: number; pages?: number } | unknown[];
        const raw: unknown[] = Array.isArray(rd)
          ? rd
          : Array.isArray((rd as { stocks?: unknown[] }).stocks)
            ? (rd as { stocks: unknown[] }).stocks
            : [];
        const meta = Array.isArray(rd) ? null : rd as { total?: number; page?: number; pages?: number };

        const withMeta: StockWithMeta[] = (raw as Record<string, unknown>[]).map((s) =>
          mapRawStock(s, isAr, lang),
        );

        setStocks(withMeta);
        setTotal(meta?.total ?? withMeta.length);
        setPages(meta?.pages ?? 1);
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
    [debouncedSearch, filter, sector, sort, page, isAr, lang, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  // Overlay live prices on current page stocks
  const merged = useMemo(() => {
    return stocks.map((s) =>
      livePrices[s.ticker]
        ? { ...s, ...livePrices[s.ticker], sector: s.sector, gicsSector: s.gicsSector }
        : s,
    );
  }, [stocks, livePrices]);

  const toggleWatchlist = useCallback(
    async (e: React.MouseEvent, ticker: string) => {
      e.stopPropagation();
      const isIn = watchlist.includes(ticker);
      if (isIn) {
        try {
          await api.delete(`/watchlist/${ticker}`);
          clearCache('/watchlist');
          setWatchlist((prev) => prev.filter((t) => t !== ticker));
        } catch {
          // ignore
        }
        return;
      }
      setAddTargetModal({ ticker });
      setAddTargetPrice('');
    },
    [watchlist],
  );

  const submitAddWithTarget = useCallback(async () => {
    if (!addTargetModal) return;
    setAddTargetSubmitting(true);
    setAddTargetError(null);
    const targetPriceNum = addTargetPrice.trim() ? parseFloat(addTargetPrice) : undefined;
    const hasTargetPrice = targetPriceNum != null && Number.isFinite(targetPriceNum) && targetPriceNum > 0;
    try {
      try {
        await api.post('/watchlist', {
          ticker: addTargetModal.ticker,
          ...(hasTargetPrice ? { targetPrice: targetPriceNum } : {}),
        });
      } catch (postErr: unknown) {
        const data =
          postErr && typeof postErr === 'object' && 'response' in postErr
            ? (postErr as { response?: { data?: { error?: string } } }).response?.data
            : undefined;
        if (data?.error === 'ALREADY_IN_WATCHLIST' && hasTargetPrice && isPaid) {
          await api.patch(`/watchlist/${encodeURIComponent(addTargetModal.ticker)}`, {
            targetPrice: targetPriceNum,
          });
        } else {
          throw postErr;
        }
      }
      clearCache('/watchlist');
      setWatchlist((prev) =>
        prev.includes(addTargetModal.ticker) ? prev : [...prev, addTargetModal.ticker],
      );
      setAddTargetModal(null);
      setAddTargetPrice('');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profile-completion-changed'));
        window.dispatchEvent(new CustomEvent('watchlist-changed'));
      }
    } catch (err: unknown) {
      const data =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
          : undefined;
      const code = data?.error;
      if (code === 'WATCHLIST_LIMIT_REACHED')   setShowWatchlistLimitModal(true);
      else if (code === 'PRICE_ALERTS_PRO') {
        setAddTargetModal(null);
        setAddTargetPrice('');
        setAddTargetError(null);
        setShowPriceAlertProModal(true);
      } else if (code === 'ALREADY_IN_WATCHLIST') setAddTargetError(t('stocks.alreadyInWatchlist'));
      else                                         setAddTargetError(t('stocks.watchlistError'));
    } finally {
      setAddTargetSubmitting(false);
    }
  }, [addTargetModal, addTargetPrice, isPaid, t]);

  return {
    isConnected,
    connectionError,
    stocks: merged,
    // pagination
    page,
    setPage,
    total,
    pages,
    // filters
    watchlist,
    search,
    setSearch,
    filter,
    setFilter,
    sector,
    setSector,
    sort,
    setSort,
    loading,
    error,
    fetchData,
    toggleWatchlist,
    showWatchlistLimitModal,
    setShowWatchlistLimitModal,
    showPriceAlertProModal,
    setShowPriceAlertProModal,
    addTargetError,
    setAddTargetError,
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
