import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Newspaper, ExternalLink, BookmarkPlus, TrendingUp, TrendingDown } from 'lucide-react';
import type { MarketNewsItem } from './types';

type Filter = 'all' | 'interests';

type Props = {
  news: MarketNewsItem[];
  loading: boolean;
  locale: string;
  filter: Filter;
  onFilterChange: (f: Filter) => void;
};

function relativeTime(dateStr: string, t: ReturnType<typeof useTranslation<'common'>>['t']): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 60) return t('market.newsMinAgo', { m: Math.max(1, m) });
  if (h < 24) return t('market.newsHoursAgo', { h });
  return t('market.newsDaysAgo', { d });
}

function sentimentBorder(sentiment?: string | null) {
  if (!sentiment) return 'border-l-[var(--border)]';
  const s = sentiment.toLowerCase();
  if (s === 'positive' || s === 'bullish') return 'border-l-green-500';
  if (s === 'negative' || s === 'bearish') return 'border-l-red-500';
  return 'border-l-[var(--border)]';
}

function sentimentIcon(sentiment?: string | null) {
  if (!sentiment) return null;
  const s = sentiment.toLowerCase();
  if (s === 'positive' || s === 'bullish') return <TrendingUp className="w-3 h-3 text-green-500 shrink-0" />;
  if (s === 'negative' || s === 'bearish') return <TrendingDown className="w-3 h-3 text-red-500 shrink-0" />;
  return null;
}

function NewsCardSkeleton() {
  return (
    <div className="flex gap-4 p-4 border-b border-[var(--border)] animate-pulse last:border-b-0">
      <div className="w-1 rounded-full bg-[var(--bg-card-hover)] shrink-0" />
      <div className="flex-1 space-y-2.5 min-w-0">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-16 rounded-full bg-[var(--bg-card-hover)]" />
          <div className="h-2.5 w-12 rounded-full bg-[var(--bg-card-hover)]" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3.5 w-full rounded-full bg-[var(--bg-card-hover)]" />
          <div className="h-3.5 w-4/5 rounded-full bg-[var(--bg-card-hover)]" />
        </div>
        <div className="h-2.5 w-1/2 rounded-full bg-[var(--bg-card-hover)]" />
      </div>
    </div>
  );
}

export function MarketNewsSection({ news, loading, locale, filter, onFilterChange }: Props) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const isRtl = locale.startsWith('ar');

  return (
    <section className="space-y-4">
      {/* Header + filter */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-[var(--brand)]" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{t('market.newsTitle')}</h2>
          {!loading && news.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--brand-subtle)] text-[var(--brand-text)]">
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
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200
                ${filter === f
                  ? 'bg-[var(--bg-card)] text-[var(--brand-text)] shadow-sm ring-1 ring-[var(--border-strong)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
            >
              {f === 'all' ? t('market.newsFilterAll') : t('market.newsFilterInterests')}
            </button>
          ))}
        </div>
      </div>

      {/* Card container */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border)]">

        {/* Loading skeletons */}
        {loading && (
          <>
            {[...Array(5)].map((_, i) => <NewsCardSkeleton key={i} />)}
          </>
        )}

        {/* Empty state */}
        {!loading && news.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-[var(--brand-subtle)] flex items-center justify-center">
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand)] text-[var(--text-inverse)] text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <BookmarkPlus className="w-4 h-4" />
                {t('market.newsAddWatchlist')}
              </button>
            )}
          </div>
        )}

        {/* News list */}
        {!loading && news.slice(0, 15).map((item, idx) => (
          <a
            key={idx}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex gap-0 hover:bg-[var(--bg-card-hover)] transition-colors duration-150 ${isRtl ? 'flex-row-reverse' : ''}`}
          >
            {/* Sentiment accent bar */}
            <div className={`w-[3px] shrink-0 ${sentimentBorder(item.sentiment)} border-l-[3px]`} />

            {/* Content */}
            <div className="flex-1 min-w-0 px-4 py-4">
              {/* Top row: source + time + sentiment icon */}
              <div className={`flex items-center gap-2 mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <span className="text-[11px] font-semibold text-[var(--brand-text)] bg-[var(--brand-subtle)] px-2 py-0.5 rounded-full truncate max-w-[140px]">
                  {item.source}
                </span>
                {sentimentIcon(item.sentiment)}
                <span className="text-[11px] text-[var(--text-muted)] ml-auto shrink-0">
                  {item.publishedAt ? relativeTime(item.publishedAt, t) : ''}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--brand)] transition-colors mb-1.5">
                {item.title}
              </h3>

              {/* Summary */}
              {item.summary && (
                <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed mb-2">
                  {item.summary}
                </p>
              )}

              {/* Bottom: tickers + read more */}
              <div className={`flex items-center gap-2 flex-wrap ${isRtl ? 'flex-row-reverse' : ''}`}>
                {item.tickers?.slice(0, 4).map(ticker => (
                  <span
                    key={ticker}
                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]"
                  >
                    {ticker}
                  </span>
                ))}
                <span className={`inline-flex items-center gap-1 text-xs font-medium text-[var(--brand)] ${isRtl ? 'mr-auto' : 'ml-auto'} shrink-0 group-hover:underline`}>
                  {t('market.readMore')}
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
