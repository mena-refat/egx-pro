import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BrainCircuit, 
  TrendingUp, 
  TrendingDown,
  ShieldAlert, 
  Target, 
  BarChart3, 
  Newspaper,
  ChevronLeft,
  Star,
  Zap,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Info,
  Plus,
  X,
  Lock,
  Crown,
  Circle,
  Timer,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import api from '../lib/api';
import { getStockName, getStockInfo } from '../lib/egxStocks';
import { getSector, isShariaCompliant } from '../lib/egxIndicesSectors';
import { useAuthStore } from '../store/authStore';
import { Skeleton } from './ui/Skeleton';
import { Stock, AnalysisResult } from '../types';

interface NewsItem {
  title: string;
  summary?: string;
  source: string;
  publishedAt: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  url: string;
}

type TabId = 'details' | 'stats' | 'ai' | 'news';
type ChartRange = '1d' | '1w' | '1mo' | '6mo' | '1y' | '5y';

interface StockAnalysisProps {
  stock: Stock;
  onBack: () => void;
}

function formatNum(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function formatBig(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/** Pivot points: P = (H+L+C)/3, R1 = 2*P-L, R2 = P+(H-L), R3 = H+2*(P-L), S1 = 2*P-H, S2 = P-(H-L), S3 = L-2*(H-P) */
function pivotPoints(high: number, low: number, close: number) {
  const p = (high + low + close) / 3;
  return {
    pivot: p,
    r1: 2 * p - low,
    r2: p + (high - low),
    r3: high + 2 * (p - low),
    s1: 2 * p - high,
    s2: p - (high - low),
    s3: low - 2 * (high - p),
  };
}

/** Fibonacci from 52w high to low */
function fibonacciLevels(high: number, low: number) {
  const d = high - low;
  return {
    p100: high,
    p786: low + 0.786 * d,
    p618: low + 0.618 * d,
    p50: low + 0.5 * d,
    p382: low + 0.382 * d,
    p236: low + 0.236 * d,
    p0: low,
  };
}

export default function StockAnalysis({ stock, onBack }: StockAnalysisProps) {
  const { t, i18n } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const shariaMode = user?.shariaMode ?? false;
  const isRTL = i18n.language === 'ar';
  const lang = isRTL ? 'ar' : 'en';

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
  const isPro = user?.plan === 'pro' || user?.plan === 'yearly';

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
    let cancelled = false;
    (async () => {
      try {
        const [priceRes, statusRes, histRes, finRes, depthRes, invRes, statsRes, newsRes, watchRes] = await Promise.all([
          api.get(`/stocks/${stock.ticker}/price`),
          api.get<{ egx: { status: string; label?: { ar: string; en: string } } }>('/stocks/market/status').catch(() => ({ data: null })),
          api.get(`/stocks/${stock.ticker}/history`, { params: { range: chartRange } }),
          api.get(`/stocks/${stock.ticker}/financials`).catch(() => ({ data: null })),
          api.get(`/stocks/${stock.ticker}/order-depth`).catch(() => ({ data: { available: false } })),
          api.get(`/stocks/${stock.ticker}/investor-categories`).catch(() => ({ data: { available: false } })),
          api.get(`/stocks/${stock.ticker}/trading-stats`).catch(() => ({ data: { available: false } })),
          api.get(`/stocks/${stock.ticker}/news`),
          api.get('/watchlist').catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        setPriceDetail(priceRes.data as Record<string, unknown>);
        if (statusRes.data?.egx) setEgxStatus(statusRes.data.egx);
        setHistory(Array.isArray(histRes.data) ? histRes.data : []);
        setFinancials(finRes.data as Record<string, unknown> | null);
        setOrderDepthAvailable((depthRes.data as { available?: boolean })?.available ?? false);
        setInvestorCategoriesAvailable((invRes.data as { available?: boolean })?.available ?? false);
        setTradingStatsAvailable((statsRes.data as { available?: boolean })?.available ?? false);
        setNews(Array.isArray(newsRes.data) ? newsRes.data : []);
        setWatchlist(Array.isArray(watchRes.data) ? (watchRes.data as { ticker: string }[]).map((w) => w.ticker) : []);
      } catch {
        if (!cancelled) setPriceDetail(null);
      }
    })();
    return () => { cancelled = true; };
  }, [stock.ticker, chartRange]);

  useEffect(() => {
    if (activeTab !== 'ai') return;
    api.get<{ analysis: { used: number; quota: number } }>('/billing/plan').then((res) => {
      const a = res.data?.analysis;
      if (a && Number.isFinite(a.quota)) setAnalysisPlan({ used: a.used, quota: a.quota });
    }).catch(() => setAnalysisPlan(null));
  }, [activeTab]);

  const getAnalysis = async () => {
    const quota = analysisPlan?.quota ?? 3;
    const used = analysisPlan?.used ?? 0;
    if (!isPro && used >= quota) {
      setShowAnalysisLimitModal(true);
      return;
    }
    setLoadingAnalysis(true);
    setErrorAnalysis(null);
    try {
      const res = await api.post(`/analysis/${stock.ticker}`);
      if (res.data?.analysis) {
        setAnalysis(res.data.analysis);
        if (analysisPlan && Number.isFinite(analysisPlan.quota)) setAnalysisPlan((p) => p ? { ...p, used: p.used + 1 } : null);
      } else throw new Error('Invalid format');
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err ? (err as { response?: { data?: { code?: string } } }).response?.data : undefined;
      if (data?.code === 'ANALYSIS_LIMIT_REACHED') {
        setShowAnalysisLimitModal(true);
        setAnalysisPlan((p) => p ? { ...p, used: p.quota } : null);
      } else {
        const msg = err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
        setErrorAnalysis(msg || t('common.error'));
      }
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const toggleWatchlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const inList = watchlist.includes(stock.ticker);
    try {
      if (inList) {
        await api.delete(`/watchlist/${stock.ticker}`);
        setWatchlist((p) => p.filter((t) => t !== stock.ticker));
      } else {
        await api.post('/watchlist', { ticker: stock.ticker });
        setWatchlist((p) => [...p, stock.ticker]);
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('profile-completion-changed'));
      }
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err ? (err as { response?: { data?: { code?: string } } }).response?.data : undefined;
      if (data?.code === 'WATCHLIST_LIMIT') setShowWatchlistLimitModal(true);
    }
  };

  const tabs: { id: TabId; labelKey: string }[] = [
    { id: 'details', labelKey: 'stockDetail.tabDetails' },
    { id: 'stats', labelKey: 'stockDetail.tabStats' },
    { id: 'ai', labelKey: 'stockDetail.tabAI' },
    { id: 'news', labelKey: 'stockDetail.tabNews' },
  ];

  const chartRanges: { id: ChartRange; labelKey: string }[] = [
    { id: '1d', labelKey: 'stockDetail.chartRange1D' },
    { id: '1w', labelKey: 'stockDetail.chartRange1W' },
    { id: '1mo', labelKey: 'stockDetail.chartRange1M' },
    { id: '6mo', labelKey: 'stockDetail.chartRange6M' },
    { id: '1y', labelKey: 'stockDetail.chartRange1Y' },
    { id: '5y', labelKey: 'stockDetail.chartRange5Y' },
  ];

  const info = getStockInfo(stock.ticker);
  const sector = stock.sector || (info ? getSector(stock.ticker, info.nameAr, info.nameEn, lang) : '');

  return (
    <div className="space-y-0 pb-20" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-slate-50 dark:bg-[var(--bg-card)] border-b border-slate-200 dark:border-slate-700 px-4 py-4 -mx-4 mb-6">
        <div className="flex items-center justify-between gap-2 mb-2">
        <button 
            type="button"
          onClick={onBack}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <ChevronLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
            {t('stockDetail.back')}
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-slate-100">{stock.ticker}</span>
            <button
              type="button"
              onClick={toggleWatchlist}
              className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg ${watchlist.includes(stock.ticker) ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'text-[var(--text-muted)] hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            >
              {watchlist.includes(stock.ticker) ? <Star className="w-3.5 h-3.5 fill-amber-500" /> : <Plus className="w-3.5 h-3.5" />}
              {watchlist.includes(stock.ticker) ? t('stockDetail.watchlistRemove') : t('stockDetail.watchlistAdd')}
        </button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{getStockName(stock.ticker, lang)}</h1>
          {isSharia && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              {t('stockDetail.shariaBadge')}
            </span>
                )}
              </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatNum(price)} ج.م</span>
          <span className={`text-sm font-semibold flex items-center gap-0.5 ${(stock.changePercent ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {(stock.changePercent ?? 0) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {(stock.changePercent ?? 0) >= 0 ? '+' : ''}{(stock.changePercent ?? 0).toFixed(2)}% {(stock.change ?? 0) >= 0 ? '+' : ''}{formatNum(stock.change)} ج
          </span>
                </div>
        {/* Price status: Live / delayed 10 min / market closed / pre-market */}
        <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)] dark:text-slate-400 flex-wrap">
          {egxStatus?.status === 'closed' && (
            <>
              <span className="inline-flex items-center gap-1">
                <Circle className="w-3 h-3 text-[var(--text-muted)] fill-slate-500" aria-hidden />
                {t('delay.marketClosed')}
              </span>
              <span>{t('delay.lastCloseAt', { time: '14:30' })}</span>
            </>
          )}
          {egxStatus?.status === 'pre' && (
            <span className="inline-flex items-center gap-1">
              <Circle className="w-3 h-3 text-amber-500 fill-amber-500" aria-hidden />
              {t('delay.preSession')}
            </span>
          )}
          {egxStatus && egxStatus.status !== 'closed' && egxStatus.status !== 'pre' && (
            <>
              {priceDetail?.isDelayed ? (
                <>
                  <span className="inline-flex items-center gap-1 text-[var(--text-muted)] dark:text-slate-400">
                    <Timer className="w-3 h-3" aria-hidden />
                    {t('delay.delayedBadge')}
                  </span>
                  {priceDetail?.priceTime && (
                    <span>{t('delay.priceAsAt', { time: String(priceDetail.priceTime) })}</span>
                  )}
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Circle className="w-3 h-3 fill-emerald-500" aria-hidden />
                    {t('delay.liveBadge')}
                  </span>
                  <span>{t('delay.lastUpdateAt', { time: (priceDetail?.priceTime as string) || new Date().toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) })}</span>
                </>
              )}
            </>
          )}
          {!egxStatus && (
            <span>{t('stockDetail.lastUpdate')}: {new Date().toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}</span>
          )}
            </div>
            
        {showShariaBanner && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-700 dark:text-amber-200 text-sm">
            <span>{t('stockDetail.shariaWarning')}</span>
            <button type="button" onClick={() => setShariaDismissed(true)} className="font-medium underline">
              {t('stockDetail.shariaIgnore')}
                </button>
              </div>
            )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-violet-600 text-violet-600 dark:text-violet-400' : 'border-transparent text-[var(--text-muted)] dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
              </div>

      {/* Tab: Details */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          {/* Chart */}
          <section>
            <div className="flex gap-2 mb-2 overflow-x-auto">
              {chartRanges.map((r) => (
                <button 
                  key={r.id}
                  type="button"
                  onClick={() => setChartRange(r.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium ${chartRange === r.id ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                >
                  {t(r.labelKey)}
                </button>
              ))}
              </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden" style={{ height: 220 }}>
              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(139 92 246)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="rgb(139 92 246)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#64748b" />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} stroke="#64748b" />
                    <Tooltip formatter={(v: number) => [formatNum(v), '']} labelFormatter={(l) => l} contentStyle={{ backgroundColor: 'var(--tw-bg-slate-800)', border: '1px solid var(--tw-border-slate-700)', borderRadius: 8 }} />
                    <Area type="monotone" dataKey="price" stroke="#8b5cf6" fill="url(#chartGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] dark:text-slate-400 text-sm">—</div>
              )}
            </div>
          </section>

          {/* Today stats 2x3 */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">{t('stockDetail.todayStats')}</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                [t('stockDetail.open'), formatNum(open)],
                [t('stockDetail.previousClose'), formatNum(previousClose)],
                [t('stockDetail.dayHigh'), formatNum(high)],
                [t('stockDetail.dayLow'), formatNum(low)],
                [t('stockDetail.volume'), formatBig(volume)],
                [t('stockDetail.turnover'), volume && price ? formatBig(volume * price) + ' EGP' : '—'],
              ].map(([label, val], i) => (
                <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-3">
                  <p className="text-xs text-[var(--text-muted)] dark:text-slate-400">{label}</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{val}</p>
                </div>
              ))}
                    </div>
          </section>

          {/* Extended stats + info modal */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('stockDetail.extendedStats')}</h3>
              <button type="button" onClick={() => setStatsInfoOpen(true)} className="p-1 rounded text-[var(--text-muted)] hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Info">
                <Info className="w-4 h-4" />
              </button>
                    </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[var(--text-muted)] dark:text-slate-400">{t('stockDetail.high52w')}</span><span>{formatNum(high52w)} ج</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-muted)] dark:text-slate-400">{t('stockDetail.low52w')}</span><span>{formatNum(low52w)} ج</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-muted)] dark:text-slate-400">{t('stockDetail.marketCap')}</span><span>{formatBig(stock.marketCap)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-muted)] dark:text-slate-400">{t('stockDetail.dividendYield')}</span><span>{(financials as { dividendYield?: number })?.dividendYield != null ? `${((financials as { dividendYield?: number }).dividendYield * 100).toFixed(2)}%` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-muted)] dark:text-slate-400">{t('stockDetail.eps')}</span><span>{formatNum((financials as { eps?: number })?.eps)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-muted)] dark:text-slate-400">{t('stockDetail.pe')}</span><span>{(financials as { pe?: number })?.pe != null ? `${Number((financials as { pe?: number }).pe).toFixed(1)}x` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-muted)] dark:text-slate-400">{t('stockDetail.avgDailyVolume')}</span><span>{formatBig(volume)} ج</span></div>
                  </div>
          </section>

          {/* Order depth — Pro for full data */}
          <section className="relative">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">{t('stockDetail.orderDepth')} {!isPro && <Lock className="w-4 h-4 text-slate-400" />}</h3>
            {orderDepthAvailable ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-[var(--text-muted)] dark:text-slate-400 text-sm">—</div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 text-[var(--text-muted)] dark:text-slate-400 text-sm">{t('stockDetail.orderDepthUnavailable')}</div>
            )}
            {!isPro && (
              <div className="absolute inset-0 top-8 rounded-xl bg-[var(--bg-card)]/70 dark:bg-[var(--bg-primary)]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-4">
                <Crown className="w-8 h-8 text-violet-400" />
                <p className="text-sm font-medium text-slate-200">{t('plan.availableInPro')}</p>
                <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-subscription'))} className="text-xs text-violet-400 hover:text-violet-300 font-medium">{t('plan.subscribeToAccess')}</button>
                </div>
            )}
          </section>

          {/* Support & Resistance */}
          {pivots && (
            <section>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">{t('stockDetail.supportResistance')}</h3>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 space-y-2 text-sm">
                <p className="text-[var(--text-muted)] dark:text-slate-400">{t('stockDetail.resistance')}: R3: {formatNum(pivots.r3)} &nbsp; R2: {formatNum(pivots.r2)} &nbsp; R1: {formatNum(pivots.r1)}</p>
                <p className="font-medium text-slate-900 dark:text-slate-100 border-t border-b border-slate-200 dark:border-slate-700 py-2 my-2">{t('stockDetail.currentPrice')}: {formatNum(price)}</p>
                <p className="text-[var(--text-muted)] dark:text-slate-400">{t('stockDetail.support')}: S1: {formatNum(pivots.s1)} &nbsp; S2: {formatNum(pivots.s2)} &nbsp; S3: {formatNum(pivots.s3)}</p>
              </div>
            </section>
          )}

          {/* Fibonacci */}
          {fibLevels && (
            <section>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">{t('stockDetail.fibonacci')}</h3>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 space-y-1 text-sm font-mono">
                <p>100%: {formatNum(fibLevels.p100)}</p>
                <p>78.6%: {formatNum(fibLevels.p786)}</p>
                <p>61.8%: {formatNum(fibLevels.p618)}</p>
                <p>50%: {formatNum(fibLevels.p50)}</p>
                <p>38.2%: {formatNum(fibLevels.p382)}</p>
                <p>23.6%: {formatNum(fibLevels.p236)}</p>
                <p>0%: {formatNum(fibLevels.p0)}</p>
              </div>
            </section>
          )}

          {/* About company */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">{t('stockDetail.aboutCompany')}</h3>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4">
              <p className="font-medium text-slate-900 dark:text-slate-100">{getStockName(stock.ticker, lang)}</p>
              <p className="text-sm text-[var(--text-muted)] dark:text-slate-400 mt-1">{info?.nameEn}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{stock.description || t('stockDetail.defaultDescription')}</p>
              <p className="text-xs text-[var(--text-muted)] dark:text-slate-400 mt-2">{t('stockDetail.listedIn')}: EGX30 | {sector}</p>
            </div>
          </section>

          {/* Similar sector - placeholder scroll */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">{t('stockDetail.similarSector')}</h3>
            <p className="text-sm text-[var(--text-muted)] dark:text-slate-400">{sector || '—'}</p>
          </section>
        </div>
      )}

      {/* Tab: Statistics — advanced stats Pro */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <section className="relative">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">{t('stockDetail.investorCategories')} {!isPro && <Lock className="w-4 h-4 text-slate-400" />}</h3>
            <p className="text-xs text-[var(--text-muted)] dark:text-slate-400 mb-3">{t('stockDetail.investorCategoriesDesc')}</p>
            {investorCategoriesAvailable ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-sm">—</div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-700 p-4">{t('stockDetail.investorCategoriesUnavailable')}</p>
            )}
            {!isPro && (
              <div className="absolute inset-0 top-14 rounded-xl bg-[var(--bg-card)]/70 dark:bg-[var(--bg-primary)]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-4">
                <Crown className="w-8 h-8 text-violet-400" />
                <p className="text-sm font-medium text-slate-200">{t('plan.availableInPro')}</p>
                <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-subscription'))} className="text-xs text-violet-400 hover:text-violet-300 font-medium">{t('plan.subscribeToAccess')}</button>
                  </div>
            )}
          </section>
          <section className="relative">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">{t('stockDetail.tradingStats')} {!isPro && <Lock className="w-4 h-4 text-slate-400" />}</h3>
            {tradingStatsAvailable ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-sm">—</div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-700 p-4">{t('stockDetail.tradingStatsUnavailable')}</p>
            )}
            {!isPro && (
              <div className="absolute inset-0 top-12 rounded-xl bg-[var(--bg-card)]/70 dark:bg-[var(--bg-primary)]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-4">
                <Crown className="w-8 h-8 text-violet-400" />
                <p className="text-sm font-medium text-slate-200">{t('plan.availableInPro')}</p>
                <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-subscription'))} className="text-xs text-violet-400 hover:text-violet-300 font-medium">{t('plan.subscribeToAccess')}</button>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Tab: AI - keep existing content */}
      {activeTab === 'ai' && (
        <div className="space-y-8">
          {!isPro && analysisPlan != null && Number.isFinite(analysisPlan.quota) && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{t('plan.usedAnalysisThisMonth', { used: analysisPlan.used, quota: analysisPlan.quota })}</p>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-[width] ${analysisPlan.used >= analysisPlan.quota ? 'bg-red-500' : analysisPlan.used >= 2 ? 'bg-amber-500' : 'bg-violet-500'}`}
                  style={{ width: `${Math.min((analysisPlan.used / analysisPlan.quota) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
          {!analysis && !loadingAnalysis && !errorAnalysis && (
            <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
              <BrainCircuit className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">{t('stockDetail.aiAnalysis')}</h3>
              <p className="text-[var(--text-muted)] dark:text-slate-400 mb-6 max-w-md mx-auto">{t('stockDetail.aiAnalysisDesc')}</p>
              <button type="button" onClick={getAnalysis} className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold flex items-center gap-2 mx-auto">
                <Zap className="w-4 h-4" /> {t('stockDetail.generateAnalysis')}
              </button>
            </div>
          )}
          {loadingAnalysis && (
            <div className="flex flex-col py-12 space-y-4 max-w-md mx-auto">
              <Skeleton height={32} className="w-full" />
              <Skeleton height={20} className="w-4/5" />
              <Skeleton height={20} className="w-3/4" />
              <Skeleton height={20} className="w-5/6" />
              <Skeleton height={80} className="w-full rounded-xl mt-4" />
            </div>
          )}
          {errorAnalysis && (
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
              <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-500 mb-4">{errorAnalysis}</p>
              <button type="button" onClick={getAnalysis} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-bold flex items-center gap-2 mx-auto">
                <RefreshCw className="w-4 h-4" /> {t('stockDetail.retry')}
              </button>
            </div>
          )}
          {analysis && !loadingAnalysis && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed italic">"{analysis.summary}"</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-violet-500 font-bold"><BarChart3 className="w-5 h-5" /> {t('stockDetail.fundamental')}</div>
                  <div className="text-sm text-[var(--text-muted)] dark:text-slate-400 space-y-2">
                    <p><span className="text-slate-900 dark:text-slate-200 font-medium">Outlook:</span> {analysis.fundamental?.outlook}</p>
                    <p><span className="text-slate-900 dark:text-slate-200 font-medium">Ratios:</span> {analysis.fundamental?.ratios}</p>
                    <p className="text-emerald-500 font-bold">Verdict: {analysis.fundamental?.verdict}</p>
                </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-500 font-bold"><TrendingUp className="w-5 h-5" /> {t('stockDetail.technical')}</div>
                  <div className="text-sm text-[var(--text-muted)] dark:text-slate-400 space-y-2">
                    <p><span className="text-slate-900 dark:text-slate-200 font-medium">Signal:</span> {analysis.technical?.signal}</p>
                    <p><span className="text-slate-900 dark:text-slate-200 font-medium">Levels:</span> {analysis.technical?.levels}</p>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <p className="text-slate-600 dark:text-slate-300 mb-4">{analysis.sentiment}</p>
                <div className={`text-2xl font-black ${analysis.verdict?.includes('Buy') ? 'text-emerald-500' : analysis.verdict?.includes('Sell') ? 'text-red-500' : 'text-amber-500'}`}>{analysis.verdict}</div>
                <div className="flex justify-between mt-4 text-sm">
                  <span className="text-red-500 font-bold">{analysis.priceTarget?.low}</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{analysis.priceTarget?.base}</span>
                  <span className="text-emerald-500 font-bold">{analysis.priceTarget?.high}</span>
                </div>
              </div>
              <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl">
                <div className="flex items-center gap-2 text-red-400 font-bold mb-2"><ShieldAlert className="w-4 h-4" /> {t('stockDetail.disclaimer')}</div>
                <p className="text-xs text-[var(--text-muted)]">{analysis.disclaimer}</p>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Tab: News */}
      {activeTab === 'news' && (
        <div className="space-y-4">
          {news.length === 0 ? (
            <p className="text-center py-12 text-[var(--text-muted)] dark:text-slate-400">{t('stockDetail.noNews')}</p>
          ) : (
            news.map((item, idx) => (
              <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 hover:border-violet-400 dark:hover:border-violet-500/50 transition-colors">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] dark:text-slate-400 mb-2">
                  <span>{item.source}</span>
                  <span>{new Date(item.publishedAt).toLocaleString(i18n.language)}</span>
            </div>
                <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">{item.title}</h4>
                <span className="text-sm text-violet-600 dark:text-violet-400 font-medium inline-flex items-center gap-1">{t('stockDetail.readMore')} <ExternalLink className="w-4 h-4" /></span>
              </a>
            ))
          )}
        </div>
      )}

      {/* Analysis limit reached — Pro upsell modal */}
      {showAnalysisLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAnalysisLimitModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <BrainCircuit className="w-12 h-12 text-violet-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{t('plan.analysisLimitTitle')}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">{t('plan.analysisLimitBody')}</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button type="button" onClick={() => { setShowAnalysisLimitModal(false); window.dispatchEvent(new CustomEvent('navigate-to-subscription')); }} className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-sm">
                {t('plan.subscribeNow')}
              </button>
              <button type="button" onClick={() => setShowAnalysisLimitModal(false)} className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-sm hover:bg-slate-100 dark:hover:bg-slate-700">
                {t('plan.waitNextMonth')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWatchlistLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowWatchlistLimitModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">{t('plan.watchlistLimitMessage')}</p>
            <div className="flex gap-2 justify-center">
              <button type="button" onClick={() => { setShowWatchlistLimitModal(false); window.dispatchEvent(new CustomEvent('navigate-to-subscription')); }} className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-sm">{t('plan.subscribeNow')}</button>
              <button type="button" onClick={() => setShowWatchlistLimitModal(false)} className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl font-medium text-sm">{t('plan.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats glossary modal */}
      {statsInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setStatsInfoOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('stockDetail.statsInfo')}</h3>
              <button type="button" onClick={() => setStatsInfoOpen(false)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <li><strong>{t('stockDetail.open')}:</strong> {t('stockDetail.openDesc')}</li>
              <li><strong>P/E:</strong> {t('stockDetail.peDesc')}</li>
              <li><strong>EPS:</strong> {t('stockDetail.epsDesc')}</li>
            </ul>
        </div>
      </div>
      )}
    </div>
  );
}
