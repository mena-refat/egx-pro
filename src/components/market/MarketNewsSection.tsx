import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Newspaper, ExternalLink, TrendingUp, TrendingDown, Minus, BookmarkPlus } from 'lucide-react';
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

function SentimentBadge({ sentiment, t }: { sentiment?: string | null; t: ReturnType<typeof useTranslation<'common'>>['t'] }) {
  if (!sentiment) return null;
  const s = sentiment.toLowerCase();
  if (s === 'positive' || s === 'bullish') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500">
        <TrendingUp className="w-2.5 h-2.5" /> {t('market.newsSentimentPositive')}
      </span>
    );
  }
  if (s === 'negative' || s === 'bearish') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500">
        <TrendingDown className="w-2.5 h-2.5" /> {t('market.newsSentimentNegative')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--bg-card-hover)] text-[var(--text-muted)]">
      <Minus className="w-2.5 h-2.5" /> {t('market.newsSentimentNeutral')}
    </span>
  );
}

function NewsCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded-full bg-[var(--bg-card-hover)]" />
        <div className="h-3 w-14 rounded-full bg-[var(--bg-card-hover)]" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full rounded-full bg-[var(--bg-card-hover)]" />
        <div className="h-4 w-4/5 rounded-full bg-[var(--bg-card-hover)]" />
      </div>
      <div className="h-3 w-1/3 rounded-full bg-[var(--bg-card-hover)]" />
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
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--brand-subtle)] text-[var(--brand-text)]">
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
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200
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

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <NewsCardSkeleton key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && news.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-16 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] text-center px-6">
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

      {/* News grid */}
      {!loading && news.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {news.slice(0, 12).map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 hover:border-[var(--brand)]/50 hover:shadow-[var(--shadow-md)] transition-all duration-200 gap-3"
            >
              {/* Top row: source + time */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[var(--brand-text)] bg-[var(--brand-subtle)] px-2 py-0.5 rounded-full truncate max-w-[120px]">
                  {item.source}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                  {item.publishedAt ? relativeTime(item.publishedAt, t) : ''}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-3 leading-relaxed flex-1 group-hover:text-[var(--brand)] transition-colors">
                {item.title}
              </h3>

              {/* Summary */}
              {item.summary && (
                <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                  {item.summary}
                </p>
              )}

              {/* Bottom: tickers + sentiment + read more */}
              <div className="flex items-center justify-between gap-2 mt-auto pt-1 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <SentimentBadge sentiment={item.sentiment} t={t} />
                  {item.tickers?.slice(0, 3).map(ticker => (
                    <span key={ticker} className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]">
                      {ticker}
                    </span>
                  ))}
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-[var(--brand)] group-hover:underline">
                  {t('market.readMore')}
                  <ExternalLink className={`w-3 h-3 ${isRtl ? 'rotate-180 scale-x-[-1]' : ''}`} />
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
