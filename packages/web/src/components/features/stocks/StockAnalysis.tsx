import { lazy, Suspense, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  Star,
  Plus,
  Info,
  X,
  Lock,
  Crown,
  Circle,
  Timer,
  Target,
  Bell,
  Newspaper,
  Clock,
} from 'lucide-react';
import { Skeleton } from '../../ui/Skeleton';
const TradingViewChart = lazy(() => import('./TradingViewChart').then((m) => ({ default: m.TradingViewChart })));
import { getStockName, getStockInfo } from '../../../lib/egxStocks';
import { getSector } from '../../../lib/egxIndicesSectors';
import { Stock } from '../../../types';
import { useStockAnalysis } from '../../../hooks/useStockAnalysis';
import { AnalysisForm } from '../analysis/AnalysisForm';
import { AnalysisResult } from '../analysis/AnalysisResult';
import { formatNum, formatBig } from '../analysis/analysisUtils';
import type { TabId, ChartRange, NewsItem } from '../../../hooks/useStockAnalysis';
import styles from './StockAnalysis.module.scss';
import { PriceAlertDialog } from './PriceAlertDialog';

export interface StockAnalysisProps {
  stock: Stock;
  onBack: () => void;
}

const TABS: { id: TabId; labelKey: string }[] = [
  { id: 'details', labelKey: 'stockDetail.tabDetails' },
  { id: 'stats', labelKey: 'stockDetail.tabStats' },
  { id: 'ai', labelKey: 'stockDetail.tabAI' },
  { id: 'news', labelKey: 'stockDetail.tabNews' },
];

const CHART_RANGES: { id: ChartRange; labelKey: string }[] = [
    { id: '1d', labelKey: 'stockDetail.chartRange1D' },
    { id: '1w', labelKey: 'stockDetail.chartRange1W' },
    { id: '1mo', labelKey: 'stockDetail.chartRange1M' },
    { id: '6mo', labelKey: 'stockDetail.chartRange6M' },
    { id: '1y', labelKey: 'stockDetail.chartRange1Y' },
    { id: '5y', labelKey: 'stockDetail.chartRange5Y' },
];

// ── Stock News Tab ────────────────────────────────────────────────────────────
function newsAccent(sentiment?: string) {
  const s = sentiment?.toLowerCase();
  if (s === 'positive') return { bar: 'bg-emerald-500', badge: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
  if (s === 'negative') return { bar: 'bg-red-500', badge: 'text-red-500 bg-red-500/10 border-red-500/20' };
  return { bar: 'bg-[var(--border)]', badge: 'text-[var(--text-muted)] bg-[var(--bg-secondary)] border-[var(--border)]' };
}

function relTime(dateStr: string, locale: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 60) return locale.startsWith('ar') ? `منذ ${Math.max(1, m)} د` : `${Math.max(1, m)}m ago`;
  if (h < 24) return locale.startsWith('ar') ? `منذ ${h} س` : `${h}h ago`;
  return locale.startsWith('ar') ? `منذ ${d} ي` : `${d}d ago`;
}

function StockNewsModal({ item, isRtl, onClose }: { item: NewsItem; isRtl: boolean; onClose: () => void }) {
  const accent = newsAccent(item.sentiment);
  const s = item.sentiment?.toLowerCase();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="relative w-full sm:max-w-lg bg-[var(--bg-card)] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>
        <div className={`h-1 w-full ${accent.bar}`} />
        <div className="px-5 pt-5 pb-8">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${accent.badge}`}>
                {s === 'positive' && <TrendingUp className="w-3 h-3" />}
                {s === 'negative' && <TrendingDown className="w-3 h-3" />}
                {s === 'positive' ? (isRtl ? 'إيجابي' : 'Positive') : s === 'negative' ? (isRtl ? 'سلبي' : 'Negative') : (isRtl ? 'محايد' : 'Neutral')}
              </span>
              {item.publishedAt && (
                <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                  <Clock className="w-3 h-3" />
                  {relTime(item.publishedAt, isRtl ? 'ar' : 'en')}
                </span>
              )}
            </div>
            <button onClick={onClose} className="shrink-0 w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center hover:bg-[var(--bg-card-hover)] transition-colors">
              <X className="w-4 h-4 text-[var(--text-muted)]" />
            </button>
          </div>
          <h2 className="text-base font-bold text-[var(--text-primary)] leading-snug mb-3">{item.title}</h2>
          {item.summary && (
            <p className="text-sm text-[var(--text-secondary)] leading-7 mb-5">{item.summary}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StockNewsTab({ news, locale, t }: { news: NewsItem[]; locale: string; t: (k: string, o?: object) => string }) {
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const isRtl = locale.startsWith('ar');

  if (news.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
        <div className="w-14 h-14 rounded-2xl bg-[var(--brand)]/10 flex items-center justify-center">
          <Newspaper className="w-7 h-7 text-[var(--brand)]" />
        </div>
        <p className="text-sm text-[var(--text-muted)]">{t('stockDetail.noNews')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border)]">
        {news.map((item, idx) => {
          const accent = newsAccent(item.sentiment);
          const s = item.sentiment?.toLowerCase();
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setSelected(item)}
              className="group w-full text-start flex gap-0 hover:bg-[var(--bg-card-hover)] transition-colors duration-150"
            >
              <div className={`w-1 shrink-0 ${accent.bar} opacity-70 group-hover:opacity-100 transition-opacity`} />
              <div className="flex-1 min-w-0 px-4 py-3.5">
                {/* Top row */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${accent.badge}`}>
                    {s === 'positive' && <TrendingUp className="w-3 h-3" />}
                    {s === 'negative' && <TrendingDown className="w-3 h-3" />}
                    {s === 'positive' ? (isRtl ? 'إيجابي' : 'Positive') : s === 'negative' ? (isRtl ? 'سلبي' : 'Negative') : (isRtl ? 'محايد' : 'Neutral')}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                    <Clock className="w-3 h-3 shrink-0" />
                    {relTime(item.publishedAt, locale)}
                  </span>
                </div>
                {/* Title */}
                <h4 className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--brand)] transition-colors mb-1.5">
                  {item.title}
                </h4>
                {/* Summary */}
                {item.summary && (
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {selected && (
        <StockNewsModal item={selected} isRtl={isRtl} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

export default function StockAnalysis({ stock, onBack }: StockAnalysisProps) {
  const navigate = useNavigate();
  const api = useStockAnalysis(stock);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  const {
    activeTab,
    setActiveTab,
    chartRange,
    setChartRange,
    priceDetail,
    watchlist,
    watchlistAlert,
    updateAlert,
    price,
    open,
    previousClose,
    high,
    low,
    high52w,
    low52w,
    volume,
    financials,
    orderDepthAvailable,
    investorCategoriesAvailable,
    tradingStatsAvailable,
    news,
    analysis,
    loadingAnalysis,
    errorAnalysis,
    isSharia,
    showShariaBanner,
    setShariaDismissed,
    statsInfoOpen,
    setStatsInfoOpen,
    analysisPlan,
    showAnalysisLimitModal,
    setShowAnalysisLimitModal,
    showWatchlistLimitModal,
    setShowWatchlistLimitModal,
    egxStatus,
    sameSectorStocks,
    effectiveSectorLabel,
    pivots,
    fibLevels,
    isRTL,
    lang,
    isPro,
    t,
    i18n,
    getAnalysis,
    toggleWatchlist,
  } = api;

  const info = getStockInfo(stock.ticker);
  const sector = stock.sector || (info ? getSector(stock.ticker, info.nameAr ?? '', info.nameEn ?? '', lang as 'ar' | 'en') : '');

  const isUp = (stock.changePercent ?? 0) >= 0;
  const accentGrad = isUp ? 'from-emerald-500/20 via-emerald-400/5 to-transparent' : 'from-red-500/20 via-red-400/5 to-transparent';

  const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
  const stagger = { show: { transition: { staggerChildren: 0.06 } } };

  return (
    <div className="pb-20" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── Hero Header ────────────────────────────────────────────── */}
      <div className={`relative -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 pt-5 pb-4 bg-gradient-to-b ${accentGrad} border-b border-[var(--border)]`}>
        {/* Back + actions row */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            {t('stockDetail.back')}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] tracking-widest">
              {stock.ticker}
            </span>
            <button
              type="button"
              onClick={toggleWatchlist}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all ${
                watchlist.includes(stock.ticker)
                  ? 'bg-amber-400/10 border-amber-400/30 text-amber-400'
                  : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--brand)]/40 hover:text-[var(--brand)]'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${watchlist.includes(stock.ticker) ? 'fill-amber-400' : ''}`} />
              {watchlist.includes(stock.ticker) ? t('stockDetail.watchlistRemove') : t('stockDetail.watchlistAdd')}
            </button>
            {watchlist.includes(stock.ticker) && (
              <button
                type="button"
                onClick={() => setAlertDialogOpen(true)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all ${
                  watchlistAlert?.targetPrice != null
                    ? 'bg-[var(--brand)]/10 border-[var(--brand)]/30 text-[var(--brand)]'
                    : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--brand)]/40'
                }`}
              >
                <Bell className={`w-3.5 h-3.5 ${watchlistAlert?.targetPrice != null ? 'fill-[var(--brand)]' : ''}`} />
                {watchlistAlert?.targetPrice != null
                  ? t(watchlistAlert.targetDirection === 'DOWN' ? 'stockDetail.priceAlertDownBadge' : 'stockDetail.priceAlertUpBadge', { price: watchlistAlert.targetPrice.toFixed(2) })
                  : t('stockDetail.priceAlertSet')}
              </button>
            )}
          </div>
        </div>

        {/* Stock name + badges */}
        <div className="flex items-start gap-2 flex-wrap mb-3">
          <h1 className="text-xl font-bold text-[var(--text-primary)] leading-tight">
            {getStockName(stock.ticker, lang as 'ar' | 'en')}
          </h1>
          {isSharia && (
            <span className="mt-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-400">
              {t('stockDetail.shariaBadge')}
            </span>
          )}
        </div>

        {/* Price row */}
        <div className="flex items-end gap-3 flex-wrap">
          <span className="text-3xl font-bold tabular-nums text-[var(--text-primary)] tracking-tight">
            {formatNum(price)}
            <span className="text-base font-medium text-[var(--text-muted)] ms-1">{t('common.egp')}</span>
          </span>
          <span className={`flex items-center gap-1 text-sm font-bold px-2.5 py-1 rounded-xl tabular-nums ${isUp ? 'bg-emerald-400/12 text-emerald-400' : 'bg-red-400/12 text-red-400'}`}>
            {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {isUp ? '+' : ''}{(stock.changePercent ?? 0).toFixed(2)}%
            <span className="opacity-70 text-xs">&nbsp;({isUp ? '+' : ''}{formatNum(stock.change)})</span>
          </span>
        </div>

        {/* Price status */}
        <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-muted)] flex-wrap">
          {egxStatus?.status === 'closed' && (
            <>
              <span className="inline-flex items-center gap-1">
                <Circle className="w-2.5 h-2.5 fill-[var(--text-muted)] text-[var(--text-muted)]" aria-hidden />
                {t('delay.marketClosed')}
              </span>
              <span className="opacity-60">·</span>
              <span>{t('delay.lastCloseAt', { time: '14:30' })}</span>
            </>
          )}
          {egxStatus?.status === 'pre' && (
            <span className="inline-flex items-center gap-1 text-amber-400">
              <Circle className="w-2.5 h-2.5 fill-amber-400" aria-hidden />
              {t('delay.preSession')}
            </span>
          )}
          {egxStatus && egxStatus.status !== 'closed' && egxStatus.status !== 'pre' && (
            priceDetail?.isDelayed ? (
              <>
                <span className="inline-flex items-center gap-1">
                  <Timer className="w-3 h-3" aria-hidden />
                  {t('delay.delayedBadge')}
                </span>
                {priceDetail?.priceTime && <span className="opacity-60">· {t('delay.priceAsAt', { time: String(priceDetail.priceTime) })}</span>}
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <span className="relative flex w-2 h-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
                  </span>
                  {t('delay.liveBadge')}
                </span>
                <span className="opacity-60">· {t('delay.lastUpdateAt', { time: (priceDetail?.priceTime as string) || new Date().toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }) })}</span>
              </>
            )
          )}
          {!egxStatus && (
            <span>{t('stockDetail.lastUpdate')}: {new Date().toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}</span>
          )}
        </div>

        {showShariaBanner && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-amber-400/30 bg-amber-400/8 px-3 py-2.5 text-amber-400 text-sm">
            <span>{t('stockDetail.shariaWarning')}</span>
            <button type="button" onClick={() => setShariaDismissed(true)} className="text-xs font-semibold underline opacity-80 hover:opacity-100 shrink-0">
              {t('stockDetail.shariaIgnore')}
            </button>
          </div>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="-mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 pt-1 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="flex gap-0 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative shrink-0 px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-[var(--brand)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {t(tab.labelKey)}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand)] rounded-full"
                  transition={{ duration: 0.2 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ────────────────────────────────────────────── */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="mt-6"
      >

      {/* Tab: Details */}
      {activeTab === 'details' && (
        <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">

          {/* Chart */}
          <motion.section variants={fadeUp} className={styles.chartSection}>
            <div className={styles.chartSectionHeader}>
              <span className={styles.chartSectionTitle}>{t('stockDetail.chartTitle', { defaultValue: 'الرسم البياني' })}</span>
              <div className={styles.chartSectionRanges}>
                {CHART_RANGES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setChartRange(r.id)}
                    className={`${styles.chartRangeBtn} ${chartRange === r.id ? styles.chartRangeBtnActive : ''}`}
                  >
                    {t(r.labelKey)}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.chartSectionBox}>
              <Suspense fallback={<Skeleton height={440} className={styles.chartSkeleton} />}>
                <TradingViewChart
                  symbol={stock.ticker}
                  height={440}
                  theme={isDark ? 'dark' : 'light'}
                  locale={lang}
                  interval={chartRange === '1d' ? '60' : chartRange === '1w' ? 'W' : 'D'}
                />
              </Suspense>
            </div>
          </motion.section>

          {/* Today stats 2×3 */}
          <motion.section variants={fadeUp}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">{t('stockDetail.todayStats')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {([
                [t('stockDetail.open'),          formatNum(open),                                           ''],
                [t('stockDetail.previousClose'), formatNum(previousClose),                                  ''],
                [t('stockDetail.dayHigh'),        formatNum(high),                                          'text-emerald-400'],
                [t('stockDetail.dayLow'),         formatNum(low),                                           'text-red-400'],
                [t('stockDetail.volume'),         formatBig(volume),                                        ''],
                [t('stockDetail.turnover'),       volume && price ? formatBig(volume * price) + ' EGP' : '-', ''],
              ] as [string, string, string][]).map(([label, val, valColor], i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3.5 hover:border-[var(--brand)]/30 transition-colors"
                >
                  <p className="text-[11px] text-[var(--text-muted)] mb-1 uppercase tracking-wide">{label}</p>
                  <p className={`text-sm font-bold tabular-nums text-[var(--text-primary)] ${valColor}`}>{val}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Extended stats */}
          <motion.section variants={fadeUp}>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">{t('stockDetail.extendedStats')}</h3>
              <button type="button" onClick={() => setStatsInfoOpen(true)} className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] transition-colors" aria-label="Info">
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
              {([
                [t('stockDetail.high52w'),       `${formatNum(high52w)} ج`,   'text-emerald-400'],
                [t('stockDetail.low52w'),        `${formatNum(low52w)} ج`,    'text-red-400'],
                [t('stockDetail.marketCap'),     formatBig(stock.marketCap),   ''],
                [t('stockDetail.dividendYield'), (financials as { dividendYield?: number })?.dividendYield != null ? `${((financials as { dividendYield?: number }).dividendYield * 100).toFixed(2)}%` : '-', ''],
                [t('stockDetail.eps'),           formatNum((financials as { eps?: number })?.eps),  ''],
                [t('stockDetail.pe'),            (financials as { pe?: number })?.pe != null ? `${Number((financials as { pe?: number }).pe).toFixed(1)}x` : '-', ''],
                [t('stockDetail.avgDailyVolume'), formatBig(volume), ''],
              ] as [string, string, string][]).map(([label, val, valColor], i, arr) => (
                <div key={i} className={`flex items-center justify-between px-4 py-3 text-sm ${i < arr.length - 1 ? 'border-b border-[var(--border)]' : ''} ${i % 2 === 0 ? '' : 'bg-[var(--bg-secondary)]/40'}`}>
                  <span className="text-[var(--text-muted)]">{label}</span>
                  <span className={`font-semibold tabular-nums ${valColor || 'text-[var(--text-primary)]'}`}>{val}</span>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Analyst predictions */}
          <motion.section variants={fadeUp}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3 flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-[var(--brand)]" />
              {t('predictions.analystPredictions')}
            </h3>
            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => navigate(`/predictions?ticker=${encodeURIComponent(stock.ticker)}`)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--brand)]/40 hover:bg-[var(--bg-card-hover)] transition-all p-4 text-start flex items-center justify-between gap-2"
            >
              <span className="text-sm font-medium text-[var(--text-secondary)]">{t('predictions.viewAllPredictions')}</span>
              <ChevronLeft className={`w-4 h-4 text-[var(--text-muted)] ${isRTL ? 'rotate-180' : ''}`} />
            </motion.button>
          </motion.section>

          {/* Order depth */}
          <motion.section variants={fadeUp}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3 flex items-center gap-2">
              {t('stockDetail.orderDepth')}
              {!isPro && <Lock className="w-3.5 h-3.5" />}
            </h3>
            <div className="relative rounded-2xl border border-[var(--border)] overflow-hidden min-h-[120px]">
              <div className={`p-4 text-sm text-[var(--text-muted)] ${!isPro ? 'blur-sm select-none' : ''}`}>
                {orderDepthAvailable ? '-' : t('stockDetail.orderDepthUnavailable')}
              </div>
              {!isPro && (
                <div className="absolute inset-0 bg-[var(--bg-card)]/80 backdrop-blur-md flex flex-col items-center justify-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[var(--brand)]/12 border border-[var(--brand)]/20 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-[var(--brand)]" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{t('plan.availableInPro')}</p>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-subscription'))}
                    className="text-xs text-[var(--brand)] font-semibold px-4 py-1.5 rounded-xl bg-[var(--brand)]/10 hover:bg-[var(--brand)]/20 border border-[var(--brand)]/20 transition-colors"
                  >
                    {t('plan.subscribeToAccess')}
                  </button>
                </div>
              )}
            </div>
          </motion.section>

          {/* Support & Resistance */}
          {pivots && (
            <motion.section variants={fadeUp}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">{t('stockDetail.supportResistance')}</h3>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
                {/* Resistance levels */}
                {[{ label: 'R3', val: pivots.r3 }, { label: 'R2', val: pivots.r2 }, { label: 'R1', val: pivots.r1 }].map((r) => (
                  <div key={r.label} className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] text-sm">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-red-400/10 text-red-400">{r.label}</span>
                    <span className="tabular-nums font-medium text-red-400">{formatNum(r.val)}</span>
                  </div>
                ))}
                {/* Current price */}
                <div className="flex items-center justify-between px-4 py-3 bg-[var(--brand)]/6 border-b border-[var(--border)]">
                  <span className="text-xs font-bold text-[var(--brand)]">{t('stockDetail.currentPrice')}</span>
                  <span className="tabular-nums font-bold text-[var(--brand)]">{formatNum(price)}</span>
                </div>
                {/* Support levels */}
                {[{ label: 'S1', val: pivots.s1 }, { label: 'S2', val: pivots.s2 }, { label: 'S3', val: pivots.s3 }].map((s, i, arr) => (
                  <div key={s.label} className={`flex items-center justify-between px-4 py-2.5 text-sm ${i < arr.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-400/10 text-emerald-400">{s.label}</span>
                    <span className="tabular-nums font-medium text-emerald-400">{formatNum(s.val)}</span>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Fibonacci */}
          {fibLevels && (
            <motion.section variants={fadeUp}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">{t('stockDetail.fibonacci')}</h3>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
                {([
                  ['100%', fibLevels.p100,  'bg-red-400/15 text-red-400'],
                  ['78.6%', fibLevels.p786, 'bg-orange-400/15 text-orange-400'],
                  ['61.8%', fibLevels.p618, 'bg-amber-400/15 text-amber-400'],
                  ['50%',   fibLevels.p50,  'bg-[var(--brand)]/15 text-[var(--brand)]'],
                  ['38.2%', fibLevels.p382, 'bg-sky-400/15 text-sky-400'],
                  ['23.6%', fibLevels.p236, 'bg-emerald-400/15 text-emerald-400'],
                  ['0%',    fibLevels.p0,   'bg-emerald-500/15 text-emerald-500'],
                ] as [string, number, string][]).map(([pct, val, cls], i, arr) => (
                  <div key={pct} className={`flex items-center justify-between px-4 py-2.5 text-sm ${i < arr.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md font-mono ${cls}`}>{pct}</span>
                    <span className="tabular-nums font-medium text-[var(--text-primary)] font-mono">{formatNum(val)}</span>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {/* About company */}
          <motion.section variants={fadeUp}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">{t('stockDetail.aboutCompany')}</h3>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3">
              <div>
                <p className="font-bold text-[var(--text-primary)]">{getStockName(stock.ticker, lang as 'ar' | 'en')}</p>
                {info?.nameEn && <p className="text-xs text-[var(--text-muted)] mt-0.5">{info.nameEn}</p>}
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {((lang === 'ar' ? info?.descriptionAr : info?.descriptionEn)
                  ?? info?.descriptionAr ?? info?.descriptionEn ?? stock.description)
                  || t('stockDetail.defaultDescription')}
              </p>
              <div className="pt-2 border-t border-[var(--border)] flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-muted)] font-medium">EGX</span>
                {sector && <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--brand)]/8 text-[var(--brand)] font-medium">{sector}</span>}
              </div>
            </div>
          </motion.section>

          {/* Similar sector */}
          <motion.section variants={fadeUp}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">{t('stockDetail.similarSector')}</h3>
            {effectiveSectorLabel && (
              <p className="text-xs text-[var(--text-muted)] mb-3">{t('stockDetail.sameSectorDesc', { sector: effectiveSectorLabel, defaultValue: effectiveSectorLabel })}</p>
            )}
            {sameSectorStocks.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {sameSectorStocks.map((s) => {
                  const ch = s.changePercent ?? 0;
                  const isStockUp = ch >= 0;
                  return (
                    <motion.button
                      key={s.ticker}
                      type="button"
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate(`/stocks/${s.ticker}`)}
                      className="flex-shrink-0 w-[148px] rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-3.5 text-start hover:border-[var(--brand)]/40 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-xl mb-2.5 flex items-center justify-center text-xs font-bold text-white ${isStockUp ? 'bg-emerald-500' : 'bg-red-500'}`}>
                        {s.ticker.slice(0, 2)}
                      </div>
                      <p className="text-sm font-bold text-[var(--text-primary)] truncate">{s.ticker}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{getStockName(s.ticker, lang as 'ar' | 'en')}</p>
                      <p className="text-sm font-bold tabular-nums text-[var(--text-primary)] mt-2">{(s.price ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                      <span className={`inline-block text-xs font-bold tabular-nums mt-0.5 px-1.5 py-0.5 rounded-md ${isStockUp ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                        {isStockUp ? '+' : ''}{ch.toFixed(2)}%
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">{t('stockDetail.noSameSector', { defaultValue: 'لا توجد أسهم أخرى من نفس القطاع.' })}</p>
            )}
          </motion.section>
        </motion.div>
      )}

      {/* Tab: Statistics */}
      {activeTab === 'stats' && (
        <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
          {/* Investor Categories */}
          <motion.section variants={fadeUp}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 flex items-center gap-2">
              {t('stockDetail.investorCategories')}
              {!isPro && <Lock className="w-3.5 h-3.5" />}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mb-3">{t('stockDetail.investorCategoriesDesc')}</p>
            <div className="relative rounded-2xl border border-[var(--border)] overflow-hidden min-h-[120px]">
              <div className="p-4 text-sm text-[var(--text-muted)] blur-sm select-none">
                {investorCategoriesAvailable ? '-' : t('stockDetail.investorCategoriesUnavailable')}
              </div>
              {!isPro && (
                <div className="absolute inset-0 bg-[var(--bg-card)]/80 backdrop-blur-md flex flex-col items-center justify-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[var(--brand)]/12 border border-[var(--brand)]/20 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-[var(--brand)]" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{t('plan.availableInPro')}</p>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-subscription'))}
                    className="text-xs text-[var(--brand)] font-semibold px-4 py-1.5 rounded-xl bg-[var(--brand)]/10 hover:bg-[var(--brand)]/20 border border-[var(--brand)]/20 transition-colors"
                  >
                    {t('plan.subscribeToAccess')}
                  </button>
                </div>
              )}
            </div>
          </motion.section>

          {/* Trading Stats */}
          <motion.section variants={fadeUp}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3 flex items-center gap-2">
              {t('stockDetail.tradingStats')}
              {!isPro && <Lock className="w-3.5 h-3.5" />}
            </h3>
            <div className="relative rounded-2xl border border-[var(--border)] overflow-hidden min-h-[120px]">
              <div className="p-4 text-sm text-[var(--text-muted)] blur-sm select-none">
                {tradingStatsAvailable ? '-' : t('stockDetail.tradingStatsUnavailable')}
              </div>
              {!isPro && (
                <div className="absolute inset-0 bg-[var(--bg-card)]/80 backdrop-blur-md flex flex-col items-center justify-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[var(--brand)]/12 border border-[var(--brand)]/20 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-[var(--brand)]" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{t('plan.availableInPro')}</p>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-subscription'))}
                    className="text-xs text-[var(--brand)] font-semibold px-4 py-1.5 rounded-xl bg-[var(--brand)]/10 hover:bg-[var(--brand)]/20 border border-[var(--brand)]/20 transition-colors"
                  >
                    {t('plan.subscribeToAccess')}
                  </button>
                </div>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}

      {/* Tab: AI */}
      {activeTab === 'ai' && (
        <div className="space-y-8">
          <AnalysisForm
            analysis={analysis}
            loading={loadingAnalysis}
            error={errorAnalysis}
            onGetAnalysis={getAnalysis}
            analysisPlan={analysisPlan}
            isPro={isPro}
            t={t as (key: string, opts?: object) => string}
          />
          {analysis && !loadingAnalysis && (
            <AnalysisResult analysis={analysis} t={t as (key: string, opts?: object) => string} />
          )}
        </div>
      )}

      {/* Tab: News */}
      {activeTab === 'news' && (
        <StockNewsTab news={news} locale={i18n.language} t={t as (k: string, o?: object) => string} />
      )}

      </motion.div>{/* end tab content */}

      {/* Analysis limit modal */}
      {showAnalysisLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowAnalysisLimitModal(false)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-[var(--bg-card)] rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-[var(--border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-[var(--brand)]/10 flex items-center justify-center mx-auto mb-4">
              <BrainCircuit className="w-7 h-7 text-[var(--brand)]" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{t('plan.analysisLimitTitle')}</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">{t('plan.analysisLimitBody')}</p>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => { setShowAnalysisLimitModal(false); window.dispatchEvent(new CustomEvent('navigate-to-subscription')); }} className="px-4 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white rounded-xl font-bold text-sm transition-colors">
                {t('plan.subscribeNow')}
              </button>
              <button type="button" onClick={() => setShowAnalysisLimitModal(false)} className="px-4 py-2.5 border border-[var(--border)] text-[var(--text-secondary)] rounded-xl font-medium text-sm hover:bg-[var(--bg-card-hover)] transition-colors">
                {t('plan.waitNextMonth')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showWatchlistLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowWatchlistLimitModal(false)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-[var(--bg-card)] rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-[var(--border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-[var(--text-secondary)] mb-6">{t('plan.watchlistLimitMessage')}</p>
            <div className="flex gap-2 justify-center">
              <button type="button" onClick={() => { setShowWatchlistLimitModal(false); window.dispatchEvent(new CustomEvent('navigate-to-subscription')); }} className="px-4 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white rounded-xl font-bold text-sm transition-colors">{t('plan.subscribeNow')}</button>
              <button type="button" onClick={() => setShowWatchlistLimitModal(false)} className="px-4 py-2.5 border border-[var(--border)] rounded-xl font-medium text-sm hover:bg-[var(--bg-card-hover)] transition-colors">{t('plan.cancel')}</button>
            </div>
          </motion.div>
        </div>
      )}

      <PriceAlertDialog
        isOpen={alertDialogOpen}
        onClose={() => setAlertDialogOpen(false)}
        ticker={stock.ticker}
        currentPrice={price}
        currentAlert={watchlistAlert}
        isPro={isPro}
        onSave={updateAlert}
        isRTL={isRTL}
      />

      {statsInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setStatsInfoOpen(false)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-[var(--bg-card)] rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto p-6 border border-[var(--border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[var(--text-primary)]">{t('stockDetail.statsInfo')}</h3>
              <button type="button" onClick={() => setStatsInfoOpen(false)} className="p-1.5 rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors" aria-label={t('common.close')}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="text-sm text-[var(--text-secondary)] space-y-3">
              <li><strong className="text-[var(--text-primary)]">{t('stockDetail.open')}:</strong> {t('stockDetail.openDesc')}</li>
              <li><strong className="text-[var(--text-primary)]">P/E:</strong> {t('stockDetail.peDesc')}</li>
              <li><strong className="text-[var(--text-primary)]">EPS:</strong> {t('stockDetail.epsDesc')}</li>
            </ul>
          </motion.div>
        </div>
      )}
    </div>
  );
}
