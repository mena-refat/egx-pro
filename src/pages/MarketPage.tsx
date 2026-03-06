import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Newspaper,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Moon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';
import { getStockName } from '../lib/egxStocks';
import { Stock } from '../types';

type DataPoint = { value: number; change: number; changePercent: number };

interface MarketOverview {
  usdEgp: DataPoint;
  egx30: DataPoint;
  egx70: DataPoint;
  egx100: DataPoint;
  egx33?: DataPoint;
  egx35?: DataPoint;
  gold: DataPoint & { valueEgxPerGram?: number };
  silver: DataPoint & { valueEgxPerGram?: number };
  lastUpdated: number;
}

interface NewsItem {
  title: string;
  summary?: string;
  source: string;
  publishedAt: string;
  url: string;
}

function formatValue(n: number, decimals = 2): string {
  if (!Number.isFinite(n) || n === 0) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
}

function formatChange(changePercent: number): string {
  if (!Number.isFinite(changePercent)) return '—';
  const sign = changePercent > 0 ? '+' : '';
  return `${sign}${changePercent.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

function minutesAgo(ts: number): number {
  return Math.max(0, Math.floor((Date.now() - ts) / 60000));
}

function MiniSparkline({ changePercent }: { changePercent: number }) {
  const up = changePercent >= 0;
  const points = 8;
  const w = 48;
  const h = 24;
  const pad = 2;
  const ys = Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const trend = up ? 1 - t : t;
    const jitter = (Math.sin(i * 1.3) * 0.3 + 0.7);
    return pad + (h - pad * 2) * (1 - trend * jitter);
  });
  const path = ys.map((y, i) => `${i === 0 ? 'M' : 'L'} ${(i / (points - 1)) * (w - pad * 2) + pad} ${y}`).join(' ');
  return (
    <svg width={w} height={h} className="shrink-0 opacity-70" aria-hidden>
      <path d={path} fill="none" stroke={up ? 'currentColor' : 'currentColor'} strokeWidth={1.5} className={up ? 'text-emerald-500' : 'text-red-500'} />
    </svg>
  );
}

export default function MarketPage({ onSelectStock }: { onSelectStock?: (s: Stock) => void }) {
  const { t, i18n } = useTranslation('common');
  const isAr = i18n.language === 'ar';
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [goldExpanded, setGoldExpanded] = useState(false);
  const [silverExpanded, setSilverExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoadingOverview(true);
    setError(null);
    try {
      const res = await api.get<MarketOverview>('/stocks/market/overview');
      setOverview(res.data);
    } catch {
      setError(isAr ? 'فشل تحميل بيانات السوق' : 'Failed to load market data');
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchStocks = async () => {
    setLoadingStocks(true);
    try {
      const res = await api.get<Stock[]>('/stocks/prices');
      setStocks(Array.isArray(res.data) ? res.data : []);
    } catch {
      setStocks([]);
    } finally {
      setLoadingStocks(false);
    }
  };

  const fetchNews = async () => {
    setLoadingNews(true);
    try {
      const res = await api.get<NewsItem[]>('/news/market');
      setNews(Array.isArray(res.data) ? res.data : []);
    } catch {
      setNews([]);
    } finally {
      setLoadingNews(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchStocks();
    fetchNews();
  }, []);

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([fetchOverview(), fetchStocks(), fetchNews()]);
    setRefreshing(false);
  };

  const lastUpdateTs = overview?.lastUpdated ?? 0;
  const updatedMinutes = lastUpdateTs ? minutesAgo(lastUpdateTs) : 0;
  const updatedLabel = updatedMinutes === 0 ? t('market.updatedNow') : t('market.updatedAgo', { m: updatedMinutes });

  const topGainers = useMemo(() => {
    return [...stocks]
      .filter((s) => s.changePercent != null && Number.isFinite(s.changePercent))
      .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
      .slice(0, 6);
  }, [stocks]);

  const topLosers = useMemo(() => {
    return [...stocks]
      .filter((s) => s.changePercent != null && Number.isFinite(s.changePercent))
      .sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0))
      .slice(0, 6);
  }, [stocks]);

  const gold24 = overview?.gold?.valueEgxPerGram ?? 0;
  const goldRates = useMemo(() => ({
    '24': gold24,
    '21': gold24 * (21 / 24),
    '18': gold24 * (18 / 24),
    '14': gold24 * (14 / 24),
  }), [gold24]);

  const silver999 = overview?.silver?.valueEgxPerGram ?? 0;
  const silverRates = useMemo(() => ({
    '999': silver999,
    '925': silver999 * (925 / 999),
    '800': silver999 * (800 / 999),
  }), [silver999]);

  const usdVal = overview?.usdEgp?.value ?? 0;
  const buyRate = usdVal * 0.995;
  const sellRate = usdVal * 1.005;

  const indices = useMemo(() => [
    { key: 'egx30', label: t('market.egx30'), data: overview?.egx30, icon: null },
    { key: 'egx70', label: t('market.egx70'), data: overview?.egx70, icon: null },
    { key: 'egx100', label: t('market.egx100'), data: overview?.egx100, icon: null },
    { key: 'egx33', label: t('market.egx33Sharia'), data: overview?.egx33, icon: Moon },
    { key: 'egx35', label: t('market.egx35lv'), data: overview?.egx35, icon: null },
  ], [overview, t]);

  const dir = isAr ? 'rtl' : 'ltr';

  return (
    <div className="space-y-8" dir={dir}>
      {/* Top: title + refresh icon */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {isAr ? 'السوق' : 'Market'}
        </h1>
        <button
          type="button"
          onClick={refreshAll}
          disabled={refreshing}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          aria-label={isAr ? 'تحديث' : 'Refresh'}
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-red-700 dark:text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={fetchOverview} className="text-red-600 dark:text-red-300 hover:underline">
            {isAr ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      )}

      {/* Quick Stats Bar — 3 cards only */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loadingOverview ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 h-24 animate-pulse" />
          ))
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">USD/EGP</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatValue(usdVal, 2)}</p>
              <span className={`text-xs font-semibold ${(overview?.usdEgp?.changePercent ?? 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : (overview?.usdEgp?.changePercent ?? 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {formatChange(overview?.usdEgp?.changePercent ?? 0)}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('market.gold24k')}</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatValue(gold24, 0)} {t('market.perGram')}</p>
              <span className={`text-xs font-semibold ${(overview?.gold?.changePercent ?? 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : (overview?.gold?.changePercent ?? 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {formatChange(overview?.gold?.changePercent ?? 0)}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('market.silver999')}</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatValue(silver999, 2)} {t('market.perGram')}</p>
              <span className={`text-xs font-semibold ${(overview?.silver?.changePercent ?? 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : (overview?.silver?.changePercent ?? 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {formatChange(overview?.silver?.changePercent ?? 0)}
              </span>
            </div>
          </>
        )}
      </section>

      {/* [1] المؤشرات المصرية */}
      <section>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {t('market.egyptIndices')}
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t('market.lastUpdated')}: {updatedLabel}
          </span>
        </div>
        {loadingOverview ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 h-28 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {indices.map(({ key, label, data, icon: Icon }) => {
              const val = data?.value ?? 0;
              const changeP = data?.changePercent ?? 0;
              const isUp = changeP > 0;
              const isDown = changeP < 0;
              return (
                <div
                  key={key}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {Icon && <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
                    <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatValue(val, 0)}</span>
                    <span className={`text-xs font-semibold flex items-center gap-0.5 ${isUp ? 'text-emerald-600 dark:text-emerald-400' : isDown ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {formatChange(changeP)}
                      {isUp && <TrendingUp className="w-3.5 h-3.5" />}
                      {isDown && <TrendingDown className="w-3.5 h-3.5" />}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <MiniSparkline changePercent={changeP} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* [2] العملات والسلع — تفاصيل فقط (بدون تكرار الأرقام الكبيرة) */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
          {t('market.forexCommodities')}
        </h2>
        {loadingOverview ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 h-24 animate-pulse" />
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 h-20 animate-pulse" />
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 h-20 animate-pulse" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Dollar — تفاصيل شراء/بيع فقط (القيمة في Quick Bar فقط) */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">$ USD / EGP</p>
              <p className={`text-sm font-semibold ${(overview?.usdEgp?.changePercent ?? 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : (overview?.usdEgp?.changePercent ?? 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {formatChange(overview?.usdEgp?.changePercent ?? 0)}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                {t('market.buy')}: {formatValue(buyRate, 2)} &nbsp; {t('market.sell')}: {formatValue(sellRate, 2)}
              </p>
            </div>

            {/* Gold expandable */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setGoldExpanded(!goldExpanded)}
                className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
              >
                <span className="font-medium text-slate-700 dark:text-slate-300">{t('market.gold24k')} <ChevronDown className={`w-4 h-4 inline-block align-middle transition-transform ${goldExpanded ? 'rotate-180' : ''}`} /></span>
                <span className="flex items-center gap-3">
                  <span className={`text-xs font-semibold ${(overview?.gold?.changePercent ?? 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : (overview?.gold?.changePercent ?? 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {formatChange(overview?.gold?.changePercent ?? 0)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t('market.usdPerOz')}: {formatValue(overview?.gold?.value ?? 0, 2)}</span>
                </span>
              </button>
              <AnimatePresence>
                {goldExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-slate-200 dark:border-slate-700 overflow-hidden"
                  >
                    <ul className="p-4 space-y-2">
                      {(['24', '21', '18', '14'] as const).map((k, i) => (
                        <li key={k} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            {i === 0 && <span className="text-emerald-500">✓</span>}
                            <span className={i === 0 ? 'font-medium text-slate-700 dark:text-slate-300' : 'text-slate-600 dark:text-slate-400'}>
                              {t(`market.karat${k}` as 'market.karat24')}
                            </span>
                          </span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{formatValue(goldRates[k], 0)} {t('market.perGram')}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Silver expandable */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setSilverExpanded(!silverExpanded)}
                className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
              >
                <span className="font-medium text-slate-700 dark:text-slate-300">{t('market.silver999')} <ChevronDown className={`w-4 h-4 inline-block align-middle transition-transform ${silverExpanded ? 'rotate-180' : ''}`} /></span>
                <span className="flex items-center gap-3">
                  <span className={`text-xs font-semibold ${(overview?.silver?.changePercent ?? 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : (overview?.silver?.changePercent ?? 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {formatChange(overview?.silver?.changePercent ?? 0)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t('market.usdPerOz')}: {formatValue(overview?.silver?.value ?? 0, 2)}</span>
                </span>
              </button>
              <AnimatePresence>
                {silverExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-slate-200 dark:border-slate-700 overflow-hidden"
                  >
                    <ul className="p-4 space-y-2">
                      {(['999', '925', '800'] as const).map((k, i) => (
                        <li key={k} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            {i === 0 && <span className="text-emerald-500">✓</span>}
                            <span className={i === 0 ? 'font-medium text-slate-700 dark:text-slate-300' : 'text-slate-600 dark:text-slate-400'}>
                              {t(`market.purity${k}` as 'market.purity999')}
                            </span>
                          </span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{formatValue(silverRates[k], 2)} {t('market.perGram')}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </section>

      {/* [3] أكثر الأسهم ارتفاعاً وانخفاضاً */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
          {isAr ? 'أكثر الأسهم ارتفاعاً وانخفاضاً' : 'Top Gainers & Losers'}
        </h2>
        {loadingStocks ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 h-72 animate-pulse" />
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 h-72 animate-pulse" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                <span className="font-semibold text-sm">{t('market.topGainers')}</span>
              </div>
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {topGainers.length === 0 ? (
                  <li className="px-4 py-6 text-center text-slate-500 dark:text-slate-400 text-sm">{isAr ? 'لا توجد بيانات' : 'No data'}</li>
                ) : (
                  topGainers.map((s) => (
                    <li key={s.ticker}>
                      <button
                        type="button"
                        onClick={() => onSelectStock?.(s)}
                        className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{getStockName(s.ticker, isAr ? 'ar' : 'en')}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{s.ticker}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{formatValue(s.price ?? 0, 2)}</span>
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                            {formatChange(s.changePercent ?? 0)}
                            <TrendingUp className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 text-red-600 dark:text-red-400">
                <TrendingDown className="w-4 h-4" />
                <span className="font-semibold text-sm">{t('market.topLosers')}</span>
              </div>
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {topLosers.length === 0 ? (
                  <li className="px-4 py-6 text-center text-slate-500 dark:text-slate-400 text-sm">{isAr ? 'لا توجد بيانات' : 'No data'}</li>
                ) : (
                  topLosers.map((s) => (
                    <li key={s.ticker}>
                      <button
                        type="button"
                        onClick={() => onSelectStock?.(s)}
                        className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{getStockName(s.ticker, isAr ? 'ar' : 'en')}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{s.ticker}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{formatValue(s.price ?? 0, 2)}</span>
                          <span className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-0.5">
                            {formatChange(s.changePercent ?? 0)}
                            <TrendingDown className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* [4] أخبار السوق */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
          {isAr ? 'أخبار السوق' : 'Market News'}
        </h2>
        {loadingNews ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 h-36 animate-pulse" />
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 p-12 text-center">
            <Newspaper className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
            <p className="font-medium text-slate-700 dark:text-slate-300">{t('market.newsEmptyTitle')}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('market.newsEmptyDesc')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {news.slice(0, 9).map((item, idx) => (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 shadow-sm hover:border-violet-400 dark:hover:border-violet-500/50 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span>{item.source}</span>
                  <span>{item.publishedAt ? new Date(item.publishedAt).toLocaleString(i18n.language, { dateStyle: 'short', timeStyle: 'short' }) : ''}</span>
                </div>
                <h3 className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2 mb-2">{item.title}</h3>
                <span className="text-sm text-violet-600 dark:text-violet-400 font-medium inline-flex items-center gap-1">
                  {t('market.readMore')}
                  <ChevronRight className="w-4 h-4" />
                </span>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
