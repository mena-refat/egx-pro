import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Newspaper, BookmarkPlus, TrendingUp, TrendingDown,
  X, Clock, Radio,
} from 'lucide-react';
import type { MarketNewsItem } from './types';

type Filter = 'all' | 'interests';

type Props = {
  news: MarketNewsItem[];
  loading: boolean;
  locale: string;
  filter: Filter;
  onFilterChange: (f: Filter) => void;
};

/** Strips source-name suffixes that aggregators embed in titles (client-side safety net for existing DB data) */
function cleanTitle(title: string, source?: string): string {
  // Strip domain names (e.g. "... vetogate.com")
  let out = title.replace(/\s+\S+\.\w{2,6}\s*$/, '').trim();
  // Strip known source suffix: "Title - Source" or "Title Source" at end
  if (source && source !== 'Google News' && source !== 'NewsAPI') {
    const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`\\s*[-–—|]?\\s*${escaped}\\s*$`, 'i'), '').trim();
  }
  return out.length > 5 ? out : title;
}

function relativeTime(dateStr: string, t: ReturnType<typeof useTranslation<'common'>>['t']): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 60) return t('market.newsMinAgo', { m: Math.max(1, m) });
  if (h < 24) return t('market.newsHoursAgo', { h });
  return t('market.newsDaysAgo', { d });
}

function sentimentColor(sentiment?: string | null) {
  const s = sentiment?.toLowerCase();
  if (s === 'positive' || s === 'bullish') return { bar: 'bg-emerald-500', badge: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500' };
  if (s === 'negative' || s === 'bearish') return { bar: 'bg-red-500', badge: 'text-red-500 bg-red-500/10 border-red-500/20', dot: 'bg-red-500' };
  return { bar: 'bg-[var(--border)]', badge: 'text-[var(--text-muted)] bg-[var(--bg-secondary)] border-[var(--border)]', dot: 'bg-[var(--text-muted)]' };
}

function SentimentBadge({ sentiment, t }: { sentiment?: string | null; t: ReturnType<typeof useTranslation<'common'>>['t'] }) {
  const s = sentiment?.toLowerCase();
  const colors = sentimentColor(sentiment);
  const isBullish = s === 'positive' || s === 'bullish';
  const isBearish = s === 'negative' || s === 'bearish';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${colors.badge}`}>
      {isBullish && <TrendingUp className="w-3 h-3" />}
      {isBearish && <TrendingDown className="w-3 h-3" />}
      {isBullish ? t('market.newsSentimentPositive') : isBearish ? t('market.newsSentimentNegative') : t('market.newsSentimentNeutral')}
    </span>
  );
}

function NewsCardSkeleton() {
  return (
    <div className="flex gap-0 animate-pulse">
      <div className="w-1 shrink-0 bg-[var(--border)] rounded-s-2xl" />
      <div className="flex-1 px-4 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-14 rounded-full bg-[var(--bg-card-hover)]" />
          <div className="h-4 w-20 rounded-full bg-[var(--bg-card-hover)]" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3.5 w-full rounded-full bg-[var(--bg-card-hover)]" />
          <div className="h-3.5 w-3/4 rounded-full bg-[var(--bg-card-hover)]" />
        </div>
        <div className="h-3 w-1/3 rounded-full bg-[var(--bg-card-hover)]" />
      </div>
    </div>
  );
}

// ── News Modal ────────────────────────────────────────────────────────────────
type ModalProps = {
  item: MarketNewsItem;
  isRtl: boolean;
  onClose: () => void;
  t: ReturnType<typeof useTranslation<'common'>>['t'];
};

function NewsModal({ item, isRtl, onClose, t }: ModalProps) {
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const colors = sentimentColor(item.sentiment);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="relative w-full sm:max-w-lg bg-[var(--bg-card)] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[88vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>

        {/* Sentiment accent bar */}
        <div className={`h-1 w-full ${colors.bar} rounded-t-none sm:rounded-t-3xl`} />

        <div className="px-5 pt-5 pb-8">
          {/* Top row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <SentimentBadge sentiment={item.sentiment} t={t} />
              {item.publishedAt && (
                <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                  <Clock className="w-3 h-3" />
                  {relativeTime(item.publishedAt, t)}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center hover:bg-[var(--bg-card-hover)] transition-colors"
            >
              <X className="w-4 h-4 text-[var(--text-muted)]" />
            </button>
          </div>

          {/* Title */}
          <h2 className="text-base font-bold text-[var(--text-primary)] leading-snug mb-3">
            {cleanTitle(item.title, item.source)}
          </h2>

          {/* Summary */}
          <p className="text-sm text-[var(--text-secondary)] leading-7 mb-5">
            {item.summary || t('market.newsNoSummary')}
          </p>

          {/* Ticker chips */}
          {item.tickers && item.tickers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {item.tickers.map((ticker) => (
                <span
                  key={ticker}
                  className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[var(--brand)]/10 text-[var(--brand)] border border-[var(--brand)]/20"
                >
                  {ticker}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function MarketNewsSection({ news, loading, locale, filter, onFilterChange }: Props) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const isRtl = locale.startsWith('ar');
  const [selected, setSelected] = useState<MarketNewsItem | null>(null);

  return (
    <section className="space-y-3">
      {/* Header + filter */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[var(--brand)]" />
          <h2 className="text-base font-bold text-[var(--text-primary)]">{t('market.newsTitle')}</h2>
          {!loading && news.length > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] border border-[var(--brand)]/20">
              {news.length}
            </span>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)]">
          {(['all', 'interests'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFilterChange(f)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200
                ${filter === f
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm ring-1 ring-[var(--border)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
            >
              {f === 'all' ? t('market.newsFilterAll') : t('market.newsFilterInterests')}
            </button>
          ))}
        </div>
      </div>

      {/* Card list */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border)]">

        {/* Skeletons */}
        {loading && (
          <div className="divide-y divide-[var(--border)]">
            {[...Array(5)].map((_, i) => <NewsCardSkeleton key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!loading && news.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-[var(--brand)]/10 flex items-center justify-center">
              <Newspaper className="w-7 h-7 text-[var(--brand)]" />
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">
                {filter === 'interests' ? t('market.newsEmptyInterests') : t('market.newsEmptyTitle')}
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-1 max-w-xs mx-auto">
                {filter === 'interests' ? t('market.newsEmptyInterestsDesc') : t('market.newsEmptyDesc')}
              </p>
            </div>
            {filter === 'interests' && (
              <button
                type="button"
                onClick={() => navigate('/stocks')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <BookmarkPlus className="w-4 h-4" />
                {t('market.newsAddWatchlist')}
              </button>
            )}
          </div>
        )}

        {/* News list */}
        {!loading && news.slice(0, 20).map((item, idx) => {
          const colors = sentimentColor(item.sentiment);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setSelected(item)}
              className="group w-full text-start flex gap-0 hover:bg-[var(--bg-card-hover)] transition-colors duration-150"
            >
              {/* Sentiment accent bar */}
              <div className={`w-1 shrink-0 ${colors.bar} transition-opacity group-hover:opacity-100 opacity-70`} />

              {/* Content */}
              <div className="flex-1 min-w-0 px-4 py-3.5">
                {/* Top row: sentiment + time + source */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <SentimentBadge sentiment={item.sentiment} t={t} />
                  <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                    <Clock className="w-3 h-3 shrink-0" />
                    {item.publishedAt ? relativeTime(item.publishedAt, t) : ''}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--brand)] transition-colors mb-1.5">
                  {cleanTitle(item.title, item.source)}
                </h3>

                {/* Summary */}
                {item.summary && (
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed mb-2">
                    {item.summary}
                  </p>
                )}

                {/* Ticker chips (max 3) */}
                {item.tickers && item.tickers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.tickers.slice(0, 3).map((ticker) => (
                      <span
                        key={ticker}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--brand)]/8 text-[var(--brand)] border border-[var(--brand)]/15"
                      >
                        {ticker}
                      </span>
                    ))}
                    {item.tickers.length > 3 && (
                      <span className="text-[10px] text-[var(--text-muted)]">+{item.tickers.length - 3}</span>
                    )}
                  </div>
                )}
              </div>

            </button>
          );
        })}
      </div>

      {/* Modal */}
      {selected && (
        <NewsModal item={selected} isRtl={isRtl} onClose={() => setSelected(null)} t={t} />
      )}
    </section>
  );
}
