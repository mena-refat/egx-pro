import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, TrendingUp, TrendingDown, BarChart2, Crosshair, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../../store/authStore';
import { searchStocks, getStockName } from '../../../lib/egxStocks';
import { PredictionCard } from './PredictionCard';
import { Button } from '../../ui/Button';
import EmptyState from '../../shared/EmptyState';
import type { FeedPrediction } from '../../../store/usePredictionsStore';
import { PAGINATION } from '../../../lib/constants';

const API = '/api/predictions';

type StockStats = {
  total: number;
  up: number;
  down: number;
  avgAccuracy: number;
};

function buildStats(predictions: FeedPrediction[]): StockStats {
  const total = predictions.length;
  const up = predictions.filter((p) => p.direction === 'UP').length;
  const down = predictions.filter((p) => p.direction === 'DOWN').length;
  const accuracies = predictions
    .filter((p) => p.userAccuracyRate != null)
    .map((p) => p.userAccuracyRate ?? 0);
  const avgAccuracy =
    accuracies.length > 0
      ? Math.round(accuracies.reduce((s, a) => s + a, 0) / accuracies.length)
      : 0;
  return { total, up, down, avgAccuracy };
}

export function PredictionsStockTab() {
  const { t, i18n } = useTranslation('common');
  const accessToken = useAuthStore((s) => s.accessToken);
  const isRTL = i18n.language.startsWith('ar');
  const lang = isRTL ? 'ar' : 'en';

  // ── Search state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [stockPrice, setStockPrice] = useState<number | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // ── Predictions state ─────────────────────────────────────────────────────
  const [predictions, setPredictions] = useState<FeedPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [likeLoading, setLikeLoading] = useState<Set<string>>(new Set());

  // ── Dismiss suggestions on outside click ─────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Fetch stock price ─────────────────────────────────────────────────────
  const fetchPrice = useCallback(
    async (ticker: string) => {
      try {
        const res = await fetch(`/api/stocks/${encodeURIComponent(ticker)}/price`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        if (!res.ok) return;
        const json = await res.json();
        const price = json?.data?.price ?? json?.price ?? null;
        setStockPrice(typeof price === 'number' ? price : null);
      } catch {
        setStockPrice(null);
      }
    },
    [accessToken]
  );

  // ── Fetch predictions for ticker ──────────────────────────────────────────
  const fetchPredictions = useCallback(
    async (ticker: string, pageNum = 1, append = false) => {
      if (!accessToken) return;
      setLoading(true);
      try {
        const q = new URLSearchParams({
          ticker,
          filter: 'all',
          page: String(pageNum),
          limit: String(PAGINATION.defaultLimit),
        });
        const res = await fetch(`${API}/feed?${q}`, {
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        const items = (json.items ?? []) as FeedPrediction[];
        const pag = json.pagination ?? {};
        setPredictions((prev) => (append ? [...prev, ...items] : items));
        setPage(pag.page ?? pageNum);
        setTotalPages(pag.totalPages ?? 1);
      } finally {
        setLoading(false);
      }
    },
    [accessToken]
  );

  // ── Select stock ──────────────────────────────────────────────────────────
  const selectTicker = useCallback(
    (ticker: string) => {
      setSelectedTicker(ticker);
      setSearch(ticker);
      setShowSuggestions(false);
      setPredictions([]);
      setPage(1);
      setTotalPages(1);
      setStockPrice(null);
      fetchPrice(ticker);
      fetchPredictions(ticker, 1);
    },
    [fetchPrice, fetchPredictions]
  );

  // ── Clear selection ───────────────────────────────────────────────────────
  const clearSelection = useCallback(() => {
    setSelectedTicker(null);
    setSearch('');
    setStockPrice(null);
    setPredictions([]);
    setPage(1);
    setTotalPages(1);
  }, []);

  // ── Like toggle (local optimistic) ────────────────────────────────────────
  const handleLike = useCallback(
    async (predictionId: string, likeCount: number, isLiked: boolean) => {
      if (!accessToken || likeLoading.has(predictionId)) return;
      const nextLiked = !isLiked;
      const nextCount = Math.max(0, likeCount + (nextLiked ? 1 : -1));
      // optimistic
      setPredictions((prev) =>
        prev.map((p) =>
          p.id === predictionId ? { ...p, isLikedByMe: nextLiked, likeCount: nextCount } : p
        )
      );
      setLikeLoading((s) => new Set(s).add(predictionId));
      try {
        const res = await fetch(`${API}/${predictionId}/like`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('like failed');
        const json = await res.json();
        const liked = json?.data?.liked ?? nextLiked;
        const count = Math.max(0, likeCount + (liked ? 1 : -1));
        setPredictions((prev) =>
          prev.map((p) =>
            p.id === predictionId ? { ...p, isLikedByMe: liked, likeCount: count } : p
          )
        );
      } catch {
        // revert
        setPredictions((prev) =>
          prev.map((p) =>
            p.id === predictionId ? { ...p, isLikedByMe: isLiked, likeCount: likeCount } : p
          )
        );
      } finally {
        setLikeLoading((s) => {
          const next = new Set(s);
          next.delete(predictionId);
          return next;
        });
      }
    },
    [accessToken, likeLoading]
  );

  // ── Suggestions list ──────────────────────────────────────────────────────
  const suggestions = search.trim() ? searchStocks(search.trim(), lang).slice(0, 10) : [];
  const stockName = selectedTicker ? getStockName(selectedTicker, lang) : null;
  const stats = buildStats(predictions);

  return (
    <div className="space-y-5">
      {/* ── Search Input ────────────────────────────────────────── */}
      <div ref={searchRef} className="relative">
        <div className="relative">
          <Search
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none"
            style={{ [isRTL ? 'right' : 'left']: '14px' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowSuggestions(true);
              if (!e.target.value.trim()) clearSelection();
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder={isRTL ? 'ابحث عن سهم...' : 'Search for a stock...'}
            className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]/30 transition-colors"
            style={{
              paddingInlineStart: '40px',
              paddingInlineEnd: selectedTicker ? '40px' : '14px',
            }}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
          {selectedTicker && (
            <button
              type="button"
              onClick={clearSelection}
              className="absolute top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              style={{ [isRTL ? 'left' : 'right']: '12px' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdown */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute z-20 w-full mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xl"
            >
              {suggestions.map((s) => (
                <li key={s.ticker}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectTicker(s.ticker);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--bg-card-hover)] transition-colors text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <span className="font-semibold text-[var(--text-primary)] shrink-0">{s.ticker}</span>
                    <span className="text-[var(--text-muted)] truncate">{getStockName(s.ticker, lang)}</span>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {/* ── Selected Stock Header ────────────────────────────────── */}
      <AnimatePresence>
        {selectedTicker && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-5 py-4 flex items-center justify-between gap-4"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div>
              <p className="font-bold text-lg text-[var(--text-primary)]">{selectedTicker}</p>
              {stockName && <p className="text-sm text-[var(--text-muted)]">{stockName}</p>}
            </div>
            {stockPrice != null && (
              <div className={isRTL ? 'text-left' : 'text-right'}>
                <p className="text-xs text-[var(--text-muted)] mb-0.5">
                  {isRTL ? 'السعر الحالي' : 'Current Price'}
                </p>
                <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums">
                  {stockPrice.toFixed(2)}
                  <span className="text-xs font-normal text-[var(--text-muted)] mr-1 ml-1">EGP</span>
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats Bar ────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedTicker && !loading && predictions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-3 gap-3"
          >
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {isRTL ? 'إجمالي التوقعات' : 'Total Predictions'}
              </p>
            </div>
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <p className="text-2xl font-bold text-green-500">{stats.up}</p>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {isRTL ? 'صاعد' : 'Bullish'}
                {stats.total > 0 && (
                  <span className="block font-medium text-green-500/80">
                    {Math.round((stats.up / stats.total) * 100)}%
                  </span>
                )}
              </p>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <p className="text-2xl font-bold text-red-500">{stats.down}</p>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {isRTL ? 'هابط' : 'Bearish'}
                {stats.total > 0 && (
                  <span className="block font-medium text-red-500/80">
                    {Math.round((stats.down / stats.total) * 100)}%
                  </span>
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Predictions List ─────────────────────────────────────── */}
      {!selectedTicker ? (
        <EmptyState
          icon={BarChart2}
          title={isRTL ? 'اختر سهماً' : 'Select a Stock'}
          description={
            isRTL
              ? 'ابحث عن سهم لعرض توقعات المتداولين عليه'
              : 'Search for a stock to view trader predictions'
          }
        />
      ) : loading && predictions.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-[var(--bg-secondary)] animate-pulse" />
          ))}
        </div>
      ) : predictions.length === 0 ? (
        <EmptyState
          icon={Crosshair}
          title={isRTL ? 'لا توجد توقعات' : 'No Predictions Yet'}
          description={
            isRTL
              ? `لم يتم نشر أي توقعات على سهم ${selectedTicker} حتى الآن`
              : `No predictions have been published for ${selectedTicker} yet`
          }
        />
      ) : (
        <div className="space-y-3">
          {predictions.map((p) => (
            <PredictionCard
              key={p.id}
              prediction={p}
              showLikeButton
              onLike={() => handleLike(p.id, p.likeCount, p.isLikedByMe)}
              likeLoading={likeLoading.has(p.id)}
              variant="feed"
            />
          ))}

          {page < totalPages && (
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                onClick={() => fetchPredictions(selectedTicker, page + 1, true)}
                disabled={loading}
              >
                {loading
                  ? isRTL ? 'جاري التحميل...' : 'Loading...'
                  : isRTL ? 'تحميل المزيد' : 'Load More'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
