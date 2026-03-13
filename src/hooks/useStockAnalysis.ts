import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api, { ANALYSIS_TIMEOUT_MS } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { getSector, isShariaCompliant } from '../lib/egxIndicesSectors';
import { Stock, AnalysisResult } from '../types';
import { pivotPoints, fibonacciLevels } from '../components/analysis/analysisUtils';

export interface NewsItem {
  title: string;
  summary?: string;
  source: string;
  publishedAt: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  url: string;
}

export type TabId = 'details' | 'stats' | 'ai' | 'news';
export type ChartRange = '1d' | '1w' | '1mo' | '6mo' | '1y' | '5y';

export function useStockAnalysis(stock: Stock) {
  const { t, i18n } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const shariaMode = user?.shariaMode ?? false;
  const isRTL = i18n.language.startsWith('ar');
  const lang = isRTL ? 'ar' : 'en';
  const isPro = user?.plan === 'pro' || user?.plan === 'yearly';

  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [priceDetail, setPriceDetail] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<{ date: string; price: number }[]>([]);
  const [chartRange, setChartRange] = useState<ChartRange>('1mo');
  const [financials, setFinancials] = useState<Record<string, unknown> | null>(null);
  const [orderDepthAvailable, setOrderDepthAvailable] = useState<boolean | null>(null);
  const [investorCategoriesAvailable, setInvestorCategoriesAvailable] = useState<boolean | null>(null);
  const [tradingStatsAvailable, setTradingStatsAvailable] = useState<boolean | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [errorAnalysis, setErrorAnalysis] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [shariaDismissed, setShariaDismissed] = useState(false);
  const [statsInfoOpen, setStatsInfoOpen] = useState(false);
  const [analysisPlan, setAnalysisPlan] = useState<{ used: number; quota: number } | null>(null);
  const [showAnalysisLimitModal, setShowAnalysisLimitModal] = useState(false);
  const [showWatchlistLimitModal, setShowWatchlistLimitModal] = useState(false);
  const [egxStatus, setEgxStatus] = useState<{ status: string; label?: { ar: string; en: string } } | null>(null);

  const open = (priceDetail?.open as number) ?? stock.open ?? 0;
  const previousClose = (priceDetail?.previousClose as number) ?? stock.previousClose ?? 0;
  const high = (priceDetail?.high as number) ?? stock.high ?? 0;
  const low = (priceDetail?.low as number) ?? stock.low ?? 0;
  const high52w = (priceDetail?.high52w as number) ?? stock.high52w ?? 0;
  const low52w = (priceDetail?.low52w as number) ?? stock.low52w ?? 0;
  const volume = (priceDetail?.volume as number) ?? stock.volume ?? 0;
  const price = stock.price ?? 0;

  const pivots = useMemo(() => {
    if (high && low && price) return pivotPoints(high, low, price);
    return null;
  }, [high, low, price]);

  const fibLevels = useMemo(() => {
    if (high52w && low52w) return fibonacciLevels(high52w, low52w);
    return null;
  }, [high52w, low52w]);

  const isSharia = isShariaCompliant(stock.ticker);
  const showShariaBanner = shariaMode && !isSharia && !shariaDismissed;

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    (async () => {
      try {
        const [priceRes, statusRes, histRes, finRes, depthRes, invRes, statsRes, newsRes, watchRes] =
          await Promise.all([
            api.get(`/stocks/${stock.ticker}/price`, { signal }).catch(() => ({ data: null })),
            api
              .get<{ egx: { status: string; label?: { ar: string; en: string } } }>(
                '/stocks/market/status',
                { signal }
              )
              .catch(() => ({ data: null })),
            api.get(`/stocks/${stock.ticker}/history`, {
              params: { range: chartRange },
              signal,
            }),
            api.get(`/stocks/${stock.ticker}/financials`, { signal }).catch(() => ({ data: null })),
            api
              .get(`/stocks/${stock.ticker}/order-depth`, { signal })
              .catch(() => ({ data: { available: false } })),
            api
              .get(`/stocks/${stock.ticker}/investor-categories`, { signal })
              .catch(() => ({ data: { available: false } })),
            api
              .get(`/stocks/${stock.ticker}/trading-stats`, { signal })
              .catch(() => ({ data: { available: false } })),
            api.get(`/stocks/${stock.ticker}/news`, { signal }),
            api.get('/watchlist', { signal }).catch(() => ({ data: { items: [] } })),
          ]);
        if (signal.aborted) return;
        const priceData = (priceRes.data as { data?: Record<string, unknown> })?.data ?? priceRes.data;
        setPriceDetail(priceData as Record<string, unknown>);
        const statusData = (statusRes.data as { data?: { egx?: unknown } })?.data ?? statusRes.data;
        if (statusData?.egx) setEgxStatus(statusData.egx);
        const histData = (histRes.data as { data?: unknown[] })?.data ?? histRes.data;
        setHistory(Array.isArray(histData) ? histData : []);
        const finData = (finRes.data as { data?: Record<string, unknown> | null })?.data ?? finRes.data;
        setFinancials(finData as Record<string, unknown> | null);
        const depthData = (depthRes.data as { data?: { available?: boolean } })?.data ?? depthRes.data;
        setOrderDepthAvailable(depthData?.available ?? false);
        const invData = (invRes.data as { data?: { available?: boolean } })?.data ?? invRes.data;
        setInvestorCategoriesAvailable(invData?.available ?? false);
        const statsData = (statsRes.data as { data?: { available?: boolean } })?.data ?? statsRes.data;
        setTradingStatsAvailable(statsData?.available ?? false);
        const newsData = (newsRes.data as { data?: unknown[] })?.data ?? newsRes.data;
        setNews(Array.isArray(newsData) ? newsData : []);
        const rawList = (watchRes.data as { items?: { ticker: string }[] })?.items;
        setWatchlist(Array.isArray(rawList) ? rawList.map((w) => w.ticker) : []);
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          (err.name === 'AbortError' || (err as { code?: string }).code === 'ERR_CANCELED')
        )
          return;
        setPriceDetail(null);
      }
    })();
    return () => controller.abort();
  }, [stock.ticker, chartRange]);

  useEffect(() => {
    if (activeTab !== 'ai') return;
    const controller = new AbortController();
    api
      .get<{ analysis: { used: number; quota: number } }>('/billing/plan', {
        signal: controller.signal,
      })
      .then((res) => {
        if (controller.signal.aborted) return;
        const payload = (res.data as { data?: { analysis?: { used: number; quota: number } } })?.data ?? res.data;
        const a = payload?.analysis ?? (res.data as { analysis?: { used: number; quota: number } })?.analysis;
        if (a && Number.isFinite(a.quota)) setAnalysisPlan({ used: a.used, quota: a.quota });
      })
      .catch((err: unknown) => {
        if (
          err instanceof Error &&
          (err.name === 'AbortError' || (err as { code?: string }).code === 'ERR_CANCELED')
        )
          return;
        setAnalysisPlan(null);
      });
    return () => controller.abort();
  }, [activeTab]);

  const getAnalysis = useCallback(async () => {
    const quota = analysisPlan?.quota ?? 3;
    const used = analysisPlan?.used ?? 0;
    if (!isPro && used >= quota) {
      setShowAnalysisLimitModal(true);
      return;
    }
    setLoadingAnalysis(true);
    setErrorAnalysis(null);
    try {
      const res = await api.post(`/analysis/${stock.ticker}`, undefined, { timeout: ANALYSIS_TIMEOUT_MS });
      const payload = (res.data as { data?: { analysis?: unknown } })?.data ?? res.data;
      const analysisContent = payload?.analysis ?? (res.data as { analysis?: unknown })?.analysis;
      if (analysisContent) {
        setAnalysis(analysisContent);
        if (analysisPlan && Number.isFinite(analysisPlan.quota))
          setAnalysisPlan((p) => (p ? { ...p, used: p.used + 1 } : null));
      } else throw new Error('Invalid format');
    } catch (err: unknown) {
      const data =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string; code?: string } } }).response?.data
          : undefined;
      if (data?.error === 'ANALYSIS_LIMIT_REACHED' || data?.code === 'ANALYSIS_LIMIT_REACHED') {
        setShowAnalysisLimitModal(true);
        setAnalysisPlan((p) => (p ? { ...p, used: p.quota } : null));
      } else {
        const axiosErr = err as { code?: string; response?: { status?: number; data?: { error?: string } } };
        const status = axiosErr?.response?.status;
        const errCode = axiosErr?.response?.data?.error;
        if (status === 503 || errCode === 'SERVICE_UNAVAILABLE') {
          setErrorAnalysis(t('ai.serviceUnavailable'));
        } else if (status === 401) {
          setErrorAnalysis(t('ai.sessionExpired'));
        } else if (status === 404 || errCode === 'NOT_FOUND' || errCode === 'not_found') {
          setErrorAnalysis(t('ai.error404Route'));
        } else if (axiosErr?.code === 'ECONNABORTED') {
          setErrorAnalysis(t('ai.analysisTimeout'));
        } else {
          setErrorAnalysis(t('common.error'));
        }
      }
    } finally {
      setLoadingAnalysis(false);
    }
  }, [stock.ticker, isPro, analysisPlan, t]);

  const toggleWatchlist = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const inList = watchlist.includes(stock.ticker);
    try {
      if (inList) {
        await api.delete(`/watchlist/${stock.ticker}`);
        setWatchlist((p) => p.filter((t) => t !== stock.ticker));
      } else {
        await api.post('/watchlist', { ticker: stock.ticker });
        setWatchlist((p) => [...p, stock.ticker]);
        if (typeof window !== 'undefined')
          window.dispatchEvent(new CustomEvent('profile-completion-changed'));
      }
    } catch (err: unknown) {
      const data =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { code?: string } } }).response?.data
          : undefined;
      if (data?.code === 'WATCHLIST_LIMIT') setShowWatchlistLimitModal(true);
    }
  }, [stock.ticker, watchlist]);

  return {
    stock,
    activeTab,
    setActiveTab,
    chartRange,
    setChartRange,
    priceDetail,
    history,
    financials,
    orderDepthAvailable,
    investorCategoriesAvailable,
    tradingStatsAvailable,
    news,
    analysis,
    loadingAnalysis,
    errorAnalysis,
    watchlist,
    shariaDismissed,
    setShariaDismissed,
    statsInfoOpen,
    setStatsInfoOpen,
    analysisPlan,
    showAnalysisLimitModal,
    setShowAnalysisLimitModal,
    showWatchlistLimitModal,
    setShowWatchlistLimitModal,
    egxStatus,
    open,
    previousClose,
    high,
    low,
    high52w,
    low52w,
    volume,
    price,
    pivots,
    fibLevels,
    isSharia,
    showShariaBanner,
    isRTL,
    lang,
    isPro,
    t,
    i18n,
    getAnalysis,
    toggleWatchlist,
  };
}
