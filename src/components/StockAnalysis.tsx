import React, { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  Star,
  Plus,
  ExternalLink,
  Info,
  X,
  Lock,
  Crown,
  Circle,
  Timer,
  Target,
} from 'lucide-react';
import { Skeleton } from './ui/Skeleton';
const TradingViewChart = lazy(() => import('./features/stocks/TradingViewChart').then((m) => ({ default: m.TradingViewChart })));
import { getStockName, getStockInfo } from '../lib/egxStocks';
import { getSector } from '../lib/egxIndicesSectors';
import { Button } from './ui/Button';
import { Stock } from '../types';
import { useStockAnalysis } from '../hooks/useStockAnalysis';
import { AnalysisForm } from './analysis/AnalysisForm';
import { AnalysisResult } from './analysis/AnalysisResult';
import { formatNum, formatBig } from './analysis/analysisUtils';
import type { TabId, ChartRange } from '../hooks/useStockAnalysis';
import styles from './StockAnalysis.module.scss';

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

export default function StockAnalysis({ stock, onBack }: StockAnalysisProps) {
  const navigate = useNavigate();
  const api = useStockAnalysis(stock);
  const {
    activeTab,
    setActiveTab,
    chartRange,
    setChartRange,
    priceDetail,
    watchlist,
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

  return (
    <div className="space-y-0 pb-20" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-[var(--bg-secondary)] border-b border-[var(--border)] px-4 py-4 -mx-4 mb-6">
        <div className="flex items-center justify-between gap-2 mb-2">
        <button 
            type="button"
          onClick={onBack}
            className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <ChevronLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
            {t('stockDetail.back')}
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--text-primary)]">{stock.ticker}</span>
            <button
              type="button"
              onClick={toggleWatchlist}
              className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg ${watchlist.includes(stock.ticker) ? 'bg-[var(--warning-bg)] text-[var(--warning)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)]'}`}
            >
              {watchlist.includes(stock.ticker) ? <Star className="w-3.5 h-3.5 fill-[var(--warning)]" /> : <Plus className="w-3.5 h-3.5" />}
              {watchlist.includes(stock.ticker) ? t('stockDetail.watchlistRemove') : t('stockDetail.watchlistAdd')}
        </button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{getStockName(stock.ticker, lang as 'ar' | 'en')}</h1>
          {isSharia && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--success-bg)] text-[var(--success)]">
              {t('stockDetail.shariaBadge')}
            </span>
                )}
              </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-2xl font-bold text-[var(--text-primary)]">{formatNum(price)} ج.م</span>
          <span className={`text-sm font-semibold flex items-center gap-0.5 ${(stock.changePercent ?? 0) >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {(stock.changePercent ?? 0) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {(stock.changePercent ?? 0) >= 0 ? '+' : ''}{(stock.changePercent ?? 0).toFixed(2)}% {(stock.change ?? 0) >= 0 ? '+' : ''}{formatNum(stock.change)} ج
          </span>
                </div>
        {/* Price status: Live / delayed 10 min / market closed / pre-market */}
        <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]  flex-wrap">
          {egxStatus?.status === 'closed' && (
            <>
              <span className="inline-flex items-center gap-1">
                <Circle className="w-3 h-3 text-[var(--text-muted)] fill-[var(--text-muted)]" aria-hidden />
                {t('delay.marketClosed')}
              </span>
              <span>{t('delay.lastCloseAt', { time: '14:30' })}</span>
            </>
          )}
          {egxStatus?.status === 'pre' && (
            <span className="inline-flex items-center gap-1">
              <Circle className="w-3 h-3 text-[var(--warning)] fill-[var(--warning)]" aria-hidden />
              {t('delay.preSession')}
            </span>
          )}
          {egxStatus && egxStatus.status !== 'closed' && egxStatus.status !== 'pre' && (
            <>
              {priceDetail?.isDelayed ? (
                <>
                  <span className="inline-flex items-center gap-1 text-[var(--text-muted)] ">
                    <Timer className="w-3 h-3" aria-hidden />
                    {t('delay.delayedBadge')}
                  </span>
                  {priceDetail?.priceTime && (
                    <span>{t('delay.priceAsAt', { time: String(priceDetail.priceTime) })}</span>
                  )}
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1 text-[var(--success)]">
                    <Circle className="w-3 h-3 fill-[var(--success)]" aria-hidden />
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
          <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-bg)] px-3 py-2 text-[var(--warning)] text-sm">
            <span>{t('stockDetail.shariaWarning')}</span>
            <button type="button" onClick={() => setShariaDismissed(true)} className="font-medium underline">
              {t('stockDetail.shariaIgnore')}
                </button>
              </div>
            )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)] mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-transparent text-[var(--text-muted)]  hover:text-[var(--text-secondary)]'}`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
              </div>

      {/* Tab: Details */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          {/* Chart — TradingView */}
          <section className={styles.chartSection}>
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
                  theme={typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                  locale={lang}
                  interval={chartRange === '1d' ? '60' : chartRange === '1w' ? 'W' : chartRange === '1mo' ? 'D' : chartRange === '6mo' || chartRange === '1y' || chartRange === '5y' ? 'D' : 'D'}
                />
              </Suspense>
            </div>
          </section>

          {/* Today stats 2x3 */}
          <section>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">{t('stockDetail.todayStats')}</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                [t('stockDetail.open'), formatNum(open)],
                [t('stockDetail.previousClose'), formatNum(previousClose)],
                [t('stockDetail.dayHigh'), formatNum(high)],
                [t('stockDetail.dayLow'), formatNum(low)],
                [t('stockDetail.volume'), formatBig(volume)],
                [t('stockDetail.turnover'), volume && price ? formatBig(volume * price) + ' EGP' : '—'],
              ].map(([label, val], i) => (
                <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3">
                  <p className="text-xs text-[var(--text-muted)] ">{label}</p>
                  <p className="font-semibold text-[var(--text-primary)]">{val}</p>
                </div>
              ))}
                    </div>
          </section>

          {/* Extended stats + info modal */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{t('stockDetail.extendedStats')}</h3>
              <button type="button" onClick={() => setStatsInfoOpen(true)} className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)]" aria-label="Info">
                <Info className="w-4 h-4" />
              </button>
                    </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[var(--text-muted)] ">{t('stockDetail.high52w')}</span><span>{formatNum(high52w)} ج</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-muted)] ">{t('stockDetail.low52w')}</span><span>{formatNum(low52w)} ج</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-muted)] ">{t('stockDetail.marketCap')}</span><span>{formatBig(stock.marketCap)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-muted)] ">{t('stockDetail.dividendYield')}</span><span>{(financials as { dividendYield?: number })?.dividendYield != null ? `${((financials as { dividendYield?: number }).dividendYield * 100).toFixed(2)}%` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-muted)] ">{t('stockDetail.eps')}</span><span>{formatNum((financials as { eps?: number })?.eps)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-muted)] ">{t('stockDetail.pe')}</span><span>{(financials as { pe?: number })?.pe != null ? `${Number((financials as { pe?: number }).pe).toFixed(1)}x` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-muted)] ">{t('stockDetail.avgDailyVolume')}</span><span>{formatBig(volume)} ج</span></div>
                  </div>
          </section>

          {/* Analyst predictions */}
          <section>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-[var(--brand)]" aria-hidden />
              {t('predictions.analystPredictions')}
            </h3>
            <button
              type="button"
              onClick={() => navigate(`/predictions?ticker=${encodeURIComponent(stock.ticker)}`)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-start hover:bg-[var(--bg-card-hover)] transition-colors flex items-center justify-between gap-2"
            >
              <span className="text-sm font-medium text-[var(--text-secondary)]">{t('predictions.viewAllPredictions')}</span>
              <ChevronLeft className={`w-5 h-5 text-[var(--text-muted)] ${isRTL ? 'rotate-180' : ''}`} aria-hidden />
            </button>
          </section>

          {/* Order depth — Pro for full data */}
          <section className="relative">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">{t('stockDetail.orderDepth')} {!isPro && <Lock className="w-4 h-4 text-[var(--text-muted)]" />}</h3>
            {orderDepthAvailable ? (
              <div className="rounded-xl border border-[var(--border)] p-4 text-[var(--text-muted)]  text-sm">—</div>
            ) : (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-[var(--text-muted)]  text-sm">{t('stockDetail.orderDepthUnavailable')}</div>
            )}
            {!isPro && (
              <div className="absolute inset-0 top-8 rounded-xl bg-[var(--bg-card)]/70 dark:bg-[var(--bg-primary)]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-4">
                <Crown className="w-8 h-8 text-[var(--brand)]" />
                <p className="text-sm font-medium text-[var(--text-primary)]">{t('plan.availableInPro')}</p>
                <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-subscription'))} className="text-xs text-[var(--brand)] hover:text-[var(--brand-hover)] font-medium">{t('plan.subscribeToAccess')}</button>
                </div>
            )}
          </section>

          {/* Support & Resistance */}
          {pivots && (
            <section>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">{t('stockDetail.supportResistance')}</h3>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-2 text-sm">
                <p className="text-[var(--text-muted)] ">{t('stockDetail.resistance')}: R3: {formatNum(pivots.r3)} &nbsp; R2: {formatNum(pivots.r2)} &nbsp; R1: {formatNum(pivots.r1)}</p>
                <p className="font-medium text-[var(--text-primary)] border-t border-b border-[var(--border)] py-2 my-2">{t('stockDetail.currentPrice')}: {formatNum(price)}</p>
                <p className="text-[var(--text-muted)] ">{t('stockDetail.support')}: S1: {formatNum(pivots.s1)} &nbsp; S2: {formatNum(pivots.s2)} &nbsp; S3: {formatNum(pivots.s3)}</p>
              </div>
            </section>
          )}

          {/* Fibonacci */}
          {fibLevels && (
            <section>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">{t('stockDetail.fibonacci')}</h3>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-1 text-sm font-mono">
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
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">{t('stockDetail.aboutCompany')}</h3>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <p className="font-medium text-[var(--text-primary)]">{getStockName(stock.ticker, lang as 'ar' | 'en')}</p>
              <p className="text-sm text-[var(--text-muted)]  mt-1">{info?.nameEn}</p>
              <p className="text-sm text-[var(--text-secondary)] mt-2">{stock.description || t('stockDetail.defaultDescription')}</p>
              <p className="text-xs text-[var(--text-muted)]  mt-2">{t('stockDetail.listedIn')}: EGX30 | {sector}</p>
            </div>
          </section>

          {/* أسهم من نفس القطاع — حتى 5 أسهم */}
          <section>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">{t('stockDetail.similarSector')}</h3>
            <p className="text-xs text-[var(--text-muted)] mb-3">{effectiveSectorLabel ? t('stockDetail.sameSectorDesc', { sector: effectiveSectorLabel, defaultValue: `أسهم أخرى من قطاع: ${effectiveSectorLabel}` }) : '—'}</p>
            {sameSectorStocks.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'thin' }}>
                {sameSectorStocks.map((s) => {
                  const ch = s.changePercent ?? 0;
                  const isUp = ch >= 0;
                  return (
                    <button
                      key={s.ticker}
                      type="button"
                      onClick={() => navigate(`/stocks/${s.ticker}`)}
                      className="flex-shrink-0 w-[140px] rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-start hover:border-[var(--brand)] hover:bg-[var(--bg-card-hover)] transition-colors"
                    >
                      <p className="text-label font-semibold text-[var(--text-primary)] truncate">{s.ticker}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{getStockName(s.ticker, lang as 'ar' | 'en')}</p>
                      <p className="text-sm font-bold tabular-nums text-[var(--text-primary)] mt-2">{(s.price ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ج.م</p>
                      <span className={`inline-block text-xs font-semibold tabular-nums mt-1 ${isUp ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                        {isUp ? '+' : ''}{(ch).toFixed(2)}%
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">{t('stockDetail.noSameSector', { defaultValue: 'لا توجد أسهم أخرى من نفس القطاع في القائمة الحالية.' })}</p>
            )}
          </section>
        </div>
      )}

      {/* Tab: Statistics — advanced stats Pro */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <section className="relative">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1 flex items-center gap-2">{t('stockDetail.investorCategories')} {!isPro && <Lock className="w-4 h-4 text-[var(--text-muted)]" />}</h3>
            <p className="text-xs text-[var(--text-muted)]  mb-3">{t('stockDetail.investorCategoriesDesc')}</p>
            {investorCategoriesAvailable ? (
              <div className="rounded-xl border border-[var(--border)] p-4 text-sm">—</div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]  rounded-xl border border-[var(--border)] p-4">{t('stockDetail.investorCategoriesUnavailable')}</p>
            )}
            {!isPro && (
              <div className="absolute inset-0 top-14 rounded-xl bg-[var(--bg-card)]/70 dark:bg-[var(--bg-primary)]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-4">
                <Crown className="w-8 h-8 text-[var(--brand)]" />
                <p className="text-sm font-medium text-[var(--text-primary)]">{t('plan.availableInPro')}</p>
                <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-subscription'))} className="text-xs text-[var(--brand)] hover:text-[var(--brand-hover)] font-medium">{t('plan.subscribeToAccess')}</button>
                  </div>
            )}
          </section>
          <section className="relative">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">{t('stockDetail.tradingStats')} {!isPro && <Lock className="w-4 h-4 text-[var(--text-muted)]" />}</h3>
            {tradingStatsAvailable ? (
              <div className="rounded-xl border border-[var(--border)] p-4 text-sm">—</div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]  rounded-xl border border-[var(--border)] p-4">{t('stockDetail.tradingStatsUnavailable')}</p>
            )}
            {!isPro && (
              <div className="absolute inset-0 top-12 rounded-xl bg-[var(--bg-card)]/70 dark:bg-[var(--bg-primary)]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-4">
                <Crown className="w-8 h-8 text-[var(--brand)]" />
                <p className="text-sm font-medium text-[var(--text-primary)]">{t('plan.availableInPro')}</p>
                <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-subscription'))} className="text-xs text-[var(--brand)] hover:text-[var(--brand-hover)] font-medium">{t('plan.subscribeToAccess')}</button>
              </div>
            )}
          </section>
        </div>
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
        <div className="space-y-4">
          {news.length === 0 ? (
            <p className="text-center py-12 text-[var(--text-muted)] ">{t('stockDetail.noNews')}</p>
          ) : (
            news.map((item, idx) => (
              <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 hover:border-[var(--brand)] transition-colors">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]  mb-2">
                  <span>{item.source}</span>
                  <span>{new Date(item.publishedAt).toLocaleString(i18n.language)}</span>
            </div>
                <h4 className="font-medium text-[var(--text-primary)] mb-2">{item.title}</h4>
                <span className="text-sm text-[var(--brand)] font-medium inline-flex items-center gap-1">{t('stockDetail.readMore')} <ExternalLink className="w-4 h-4" /></span>
              </a>
            ))
          )}
        </div>
      )}

      {/* Analysis limit reached — Pro upsell modal */}
      {showAnalysisLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAnalysisLimitModal(false)}>
          <div className="bg-[var(--bg-card)] rounded-2xl shadow-xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <BrainCircuit className="w-12 h-12 text-[var(--brand)] mx-auto mb-4" />
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{t('plan.analysisLimitTitle')}</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">{t('plan.analysisLimitBody')}</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button type="button" onClick={() => { setShowAnalysisLimitModal(false); window.dispatchEvent(new CustomEvent('navigate-to-subscription')); }} className="px-4 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-inverse)] rounded-xl font-bold text-sm">
                {t('plan.subscribeNow')}
              </button>
              <button type="button" onClick={() => setShowAnalysisLimitModal(false)} className="px-4 py-2.5 border border-[var(--border)] text-[var(--text-secondary)] rounded-xl font-medium text-sm hover:bg-[var(--bg-card-hover)]">
                {t('plan.waitNextMonth')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWatchlistLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowWatchlistLimitModal(false)}>
          <div className="bg-[var(--bg-card)] rounded-2xl shadow-xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-[var(--text-secondary)] mb-6">{t('plan.watchlistLimitMessage')}</p>
            <div className="flex gap-2 justify-center">
              <button type="button" onClick={() => { setShowWatchlistLimitModal(false); window.dispatchEvent(new CustomEvent('navigate-to-subscription')); }} className="px-4 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-inverse)] rounded-xl font-bold text-sm">{t('plan.subscribeNow')}</button>
              <button type="button" onClick={() => setShowWatchlistLimitModal(false)} className="px-4 py-2.5 border border-[var(--border)] rounded-xl font-medium text-sm">{t('plan.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats glossary modal */}
      {statsInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setStatsInfoOpen(false)}>
          <div className="bg-[var(--bg-card)] rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{t('stockDetail.statsInfo')}</h3>
              <button type="button" onClick={() => setStatsInfoOpen(false)} className="p-1 rounded hover:bg-[var(--bg-card-hover)]" aria-label={t('common.close')}><X className="w-5 h-5" aria-hidden="true" /></button>
            </div>
            <ul className="text-sm text-[var(--text-secondary)] space-y-2">
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
