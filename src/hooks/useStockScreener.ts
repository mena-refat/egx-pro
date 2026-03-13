import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useLivePrices } from './useLivePrices';
import { searchStocks, getStockName, getStockInfo } from '../lib/egxStocks';
import { getSector, isInEGX30, isInEGX70, isInEGX100, isInEGX35LV, isShariaCompliant } from '../lib/egxIndicesSectors';
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
  inEGX30?: boolean;
  inEGX70?: boolean;
  inEGX100?: boolean;
  inEGX35LV?: boolean;
  inEGX33?: boolean;
  /** GICS sector from API when available */
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
  { id: 'all', labelKey: 'stocks.filterAll' },
  { id: 'egx30', labelKey: 'stocks.filterEGX30' },
  { id: 'egx70', labelKey: 'stocks.filterEGX70EWI' },
  { id: 'egx100', labelKey: 'stocks.filterEGX100EWI' },
  { id: 'egx35lv', labelKey: 'stocks.filterEGX35LV' },
  { id: 'egx33', labelKey: 'stocks.filterEGX33' },
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
  const isPaid = isPro || user?.plan === 'ultra' || user?.plan === 'ultra_yearly';
  const [stocks, setStocks] = useState<StockWithMeta[]>([]);
  const isAr = i18n.language.startsWith('ar');
  const lang = isAr ? 'ar' : 'en';
  const subscribedTickers = useMemo(
    () => (stocks.length > 0 ? stocks.map((s) => s.ticker) : undefined),
    [stocks]
  );
  const { prices: livePrices } = useLivePrices(subscribedTickers);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [sector, setSector] = useState('');
  const [sort, setSort] = useState<SortId>('ticker');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWatchlistLimitModal, setShowWatchlistLimitModal] = useState(false);
  const [showPriceAlertProModal, setShowPriceAlertProModal] = useState(false);
  const [addTargetModal, setAddTargetModal] = useState<{ ticker: string } | null>(null);
  const [addTargetPrice, setAddTargetPrice] = useState('');
  const [addTargetSubmitting, setAddTargetSubmitting] = useState(false);
  const [addTargetError, setAddTargetError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const [stocksRes, watchlistRes] = await Promise.all([
          api.get('/stocks/prices', { params: sector ? { sector } : {}, signal, timeout: 60_000 }),
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
            sector: apiSector ? (GICS_SECTOR_LABELS[apiSector] ? (isAr ? GICS_SECTOR_LABELS[apiSector].ar : GICS_SECTOR_LABELS[apiSector].en) : apiSector) : fallbackSector,
            description: '',
            inEGX30: isInEGX30(ticker),
            inEGX70: isInEGX70(ticker),
            inEGX100: isInEGX100(ticker),
            inEGX35LV: isInEGX35LV(ticker),
            inEGX33: isShariaCompliant(ticker),
            gicsSector: apiSector,
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
    [lang, isAr, sector, t]
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
      setWatchlist((prev) => (prev.includes(addTargetModal.ticker) ? prev : [...prev, addTargetModal.ticker]));
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
      if (code === 'WATCHLIST_LIMIT_REACHED') setShowWatchlistLimitModal(true);
      else if (code === 'PRICE_ALERTS_PRO') {
        setAddTargetModal(null);
        setAddTargetPrice('');
        setAddTargetError(null);
        setShowPriceAlertProModal(true);
      } else if (code === 'ALREADY_IN_WATCHLIST') setAddTargetError(t('stocks.alreadyInWatchlist'));
      else setAddTargetError(t('stocks.watchlistError'));
    } finally {
      setAddTargetSubmitting(false);
    }
  }, [addTargetModal, addTargetPrice, isPaid, t]);

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
            inEGX35LV: s.inEGX35LV,
            inEGX33: s.inEGX33,
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
    if (filter === 'egx35lv') list = list.filter((s) => s.inEGX35LV);
    if (filter === 'egx33') list = list.filter((s) => s.inEGX33);
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
