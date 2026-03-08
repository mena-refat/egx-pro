import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import StockCard from '../components/features/stocks/StockCard';
import PortfolioPerformanceChart from '../components/PortfolioPerformanceChart';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/shared/EmptyState';
import { Star } from 'lucide-react';
import { useLivePrices } from '../hooks/useLivePrices';
import { usePortfolio } from '../hooks/usePortfolio';
import { getStockName, getStockInfo } from '../lib/egxStocks';
import { Stock } from '../types';

export default function DashboardPage() {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
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

  useEffect(() => {
    const marketController = new AbortController();
    const watchlistController = new AbortController();

    const fetchMarketOverview = async () => {
      setMarketLoading(true);
      setMarketError(null);
      try {
        const res = await api.get('/stocks/market/overview', { signal: marketController.signal });
        if (!marketController.signal.aborted) setMarketOverview(res.data);
      } catch (err: unknown) {
        if (err instanceof Error && (err.name === 'AbortError' || (err as { code?: string }).code === 'ERR_CANCELED')) return;
        if (err instanceof Error) setMarketError(err.message);
        else setMarketError('Failed to fetch market overview');
      } finally {
        if (!marketController.signal.aborted) setMarketLoading(false);
      }
    };

    const fetchWatchlist = async () => {
      setWatchlistLoading(true);
      try {
        const res = await api.get('/watchlist', { signal: watchlistController.signal });
        if (!watchlistController.signal.aborted) setWatchlist(Array.isArray(res.data) ? res.data : []);
      } catch (err: unknown) {
        if (err instanceof Error && (err.name === 'AbortError' || (err as { code?: string }).code === 'ERR_CANCELED')) return;
        if (import.meta.env.DEV) console.error('Failed to fetch watchlist', err);
        if (!watchlistController.signal.aborted) setWatchlist([]);
      } finally {
        if (!watchlistController.signal.aborted) setWatchlistLoading(false);
      }
    };

    fetchMarketOverview();
    fetchWatchlist();
    return () => {
      marketController.abort();
      watchlistController.abort();
    };
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

  const isRTL = i18n.language.startsWith('ar');
  const goToStocks = useCallback(() => navigate('/stocks'), [navigate]);
  const toggleMarketOverview = useCallback(() => setShowMarketOverview((v) => !v), []);
  const retryMarketOverview = useCallback(async () => {
    setMarketError(null);
    setMarketLoading(true);
    try {
      const res = await api.get('/stocks/market/overview');
      setMarketOverview(res.data);
    } catch (err: unknown) {
      setMarketError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setMarketLoading(false);
    }
  }, []);

  if (portfolioLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  const gainPercent = stats.gainPercent ?? 0;
  const isPositiveGain = gainPercent >= 0;

  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Portfolio hero — big value + P&L badge */}
      <div className="card-base card-elevated p-8 rounded-2xl">
        <p className="text-label mb-2">{t('dashboard.totalValue')}</p>
        {portfolioLoading ? (
          <Skeleton className="h-14 w-56 rounded-lg" />
        ) : portfolioError ? (
          <p className="text-[var(--danger)] text-body">{portfolioError}</p>
        ) : (
          <div className="flex flex-wrap items-baseline gap-4 gap-y-2">
            <p className="text-[48px] font-bold font-number leading-tight tabular-nums text-[var(--text-primary)]">
              {stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              <span className="text-header font-normal text-[var(--text-muted)] ms-2">EGP</span>
            </p>
            <span
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-label font-bold tabular-nums ${
                isPositiveGain ? 'bg-[var(--success-bg)] text-[var(--positive)]' : 'bg-[var(--danger-bg)] text-[var(--negative)]'
              }`}
            >
              {isPositiveGain ? '↑' : '↓'} {isPositiveGain ? '+' : ''}{gainPercent.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Market status bar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-[var(--positive)]' : 'bg-[var(--negative)]'}`} />
          <span className="text-body font-medium text-[var(--text-secondary)]">
            {isConnected ? t('header.market_open') : t('dashboard.connecting')}
          </span>
        </div>
        <button
          type="button"
          onClick={toggleMarketOverview}
          className="text-label text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          {showMarketOverview ? (isRTL ? 'إخفاء المؤشرات' : 'Hide Indicators') : (isRTL ? 'إظهار المؤشرات' : 'Show Indicators')}
        </button>
      </div>

      {/* Market overview cards — with elevation + mini sparkline area */}
      {showMarketOverview && (
        <div className="overflow-x-auto pb-2 -mx-1 scrollbar-thin">
          {marketLoading ? (
            <div className="flex gap-3">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="shrink-0 inline-block w-36"><Skeleton className="h-20 w-full rounded-xl" /></span>
              ))}
            </div>
          ) : marketError ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center text-[var(--danger)] text-body">
              <p>{marketError}</p>
              <button
                type="button"
                onClick={retryMarketOverview}
                className="mt-3 text-[var(--brand)] hover:underline font-medium"
              >
                {t('common.retry')}
              </button>
            </div>
          ) : marketOverview ? (
            <div className="flex gap-4 min-w-0">
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
                  className="card-base card-elevated shrink-0 rounded-2xl px-5 py-4 min-w-[140px]"
                >
                  <p className="text-label uppercase tracking-wider mb-1">{item.label}</p>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-body font-number text-[var(--text-primary)]">
                      {item.value != null ? Number(item.value).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                    </span>
                    {item.change != null && (
                      <span className={`text-label font-bold tabular-nums ${item.change >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                        {item.change >= 0 ? '+' : ''}{Number(item.change).toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div className={`mt-2 h-1 rounded-full overflow-hidden ${item.change != null && item.change >= 0 ? 'bg-[var(--positive)]/20' : 'bg-[var(--negative)]/20'}`}>
                    <div
                      className={`h-full w-progress rounded-full ${item.change != null && item.change >= 0 ? 'bg-[var(--positive)]' : 'bg-[var(--negative)]'}`}
                      style={{ ['--progress-width']: `${Math.min(100, Math.abs((item.change ?? 0) / 2) + 20)}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* Live / Watchlist section */}
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <h3 className="text-header font-semibold text-[var(--text-primary)]">
            {watchlist.length > 0 ? t('dashboard.liveWatchlist') : t('market.livePrices')}
          </h3>
          <div className={`flex items-center gap-2 text-label font-medium ${isConnected ? 'text-[var(--positive)]' : 'text-[var(--warning)]'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--positive)] animate-pulse' : 'bg-[var(--warning)]'}`} />
            {isConnected ? 'Live' : 'Connecting...'}
          </div>
        </div>

        {watchlistLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <React.Fragment key={i}>
                <Skeleton className="h-36 w-full rounded-2xl" />
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {liveWatchlistStocks.map(stock => (
              <div key={stock.ticker} className="transition-transform duration-200 hover:-translate-y-0.5">
                <StockCard
                  ticker={stock.ticker}
                  price={stock.price}
                  change={stock.change}
                  changePercent={stock.changePercent}
                  isConnected={isConnected}
                />
              </div>
            ))}
            {liveWatchlistStocks.length === 0 && !watchlistLoading && (
              <div className="col-span-full">
                <EmptyState
                  icon={Star}
                  title={t('watchlist.emptyTitle')}
                  description={t('watchlist.emptyDescription')}
                  actionLabel={t('watchlist.addFirst')}
                  onAction={goToStocks}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3 space-y-8">
          {/* Top performer card */}
          <div className="card-base card-elevated p-6 rounded-2xl">
            <h4 className="text-label mb-2">{t('dashboard.topPerformer')}</h4>
            {portfolioLoading ? (
              <Skeleton className="h-10 w-32 rounded-lg" />
            ) : (
              <div className="flex items-baseline gap-2">
                <p className="text-header font-bold text-[var(--positive)] tabular-nums">{topPerformer.ticker}</p>
                {topPerformer.ticker !== '--' && (
                  <span className="text-label font-bold text-[var(--positive)]/90">({topPerformer.change.toFixed(2)}%)</span>
                )}
              </div>
            )}
          </div>

          <div className="card-base card-elevated p-8 rounded-2xl">
            <h3 className="text-header font-semibold mb-6">{t('dashboard.portfolioPerformance')}</h3>
            <PortfolioPerformanceChart />
          </div>

          <div className="card-base card-elevated p-8 rounded-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-header font-semibold">{t('dashboard.watchlist')}</h3>
            </div>

            {watchlistLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <React.Fragment key={i}>
                    <Skeleton className="h-20 w-full rounded-2xl" />
                  </React.Fragment>
                ))}
              </div>
            ) : watchlist.length === 0 ? (
              <EmptyState
                icon={Star}
                title={t('watchlist.emptyTitle')}
                description={t('watchlist.emptyDescription')}
                actionLabel={t('watchlist.addFirst')}
                onAction={goToStocks}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {watchlist.map(w => {
                  const stock = livePrices[w.ticker] || w;
                  const ch = (stock.changePercent ?? stock.change ?? 0) as number;
                  const isUp = ch >= 0;
                  return (
                    <div
                      key={stock.ticker}
                      className="flex justify-between items-center p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-body text-[var(--text-primary)]">{getStockName(stock.ticker, i18n.language.startsWith('ar') ? 'ar' : 'en')}</p>
                        <p className="text-label mt-0.5">{stock.ticker}</p>
                        {getStockInfo(stock.ticker)?.nameEn && (
                          <p className="text-label mt-0.5 truncate max-w-[200px]">{getStockInfo(stock.ticker)?.nameEn}</p>
                        )}
                      </div>
                      <div className="text-end shrink-0 ms-4">
                        <p className="font-number text-body text-[var(--text-primary)]">{(stock.price || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} EGP</p>
                        <p className={`text-label font-bold tabular-nums mt-0.5 ${isUp ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                          {isUp ? '↑' : '↓'} {isUp ? '+' : ''}{typeof ch === 'number' ? ch.toFixed(2) : ch}%
                        </p>
                        <div className={`mt-2 h-1 rounded-full overflow-hidden w-16 ms-auto ${isUp ? 'bg-[var(--positive)]/20' : 'bg-[var(--negative)]/20'}`}>
                          <div className={`h-full w-progress rounded-full ${isUp ? 'bg-[var(--positive)]' : 'bg-[var(--negative)]'}`} style={{ ['--progress-width']: `${Math.min(100, Math.abs(ch) / 2 + 20)}%` } as React.CSSProperties} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
