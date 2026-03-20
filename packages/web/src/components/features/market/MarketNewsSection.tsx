import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Newspaper, BookmarkPlus, TrendingUp, TrendingDown, X, Clock } from 'lucide-react';
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

  const s = item.sentiment?.toLowerCase();
  const isBullish = s === 'positive' || s === 'bullish';
  const isBearish = s === 'negative' || s === 'bearish';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="relative w-full sm:max-w-lg bg-[var(--bg-card)] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[88vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle on mobile */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>

        <div className="px-5 pt-4 pb-8 sm:pt-6">
          {/* Top row: sentiment + time + close */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              {isBullish && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600 bg-green-100 dark:bg-green-950/40 px-2.5 py-1 rounded-full">
                  <TrendingUp className="w-3.5 h-3.5" /> إيجابي
                </span>
              )}
              {isBearish && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-100 dark:bg-red-950/40 px-2.5 py-1 rounded-full">
                  <TrendingDown className="w-3.5 h-3.5" /> سلبي
                </span>
              )}
              {!isBullish && !isBearish && (
                <span className="text-[11px] font-semibold text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2.5 py-1 rounded-full">
                  عام
                </span>
              )}
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
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] leading-snug mb-3 line-clamp-2">
            {item.title}
          </h2>

          {/* Summary */}
          <div className="rounded-2xl bg-[var(--bg-secondary)] p-4 mb-4">
            {item.summary ? (
              <p className="text-base text-[var(--text-primary)] leading-7">
                {item.summary}
              </p>
            ) : (
              <p className="text-sm text-[var(--text-muted)] text-center py-2">
                لا يوجد ملخص متاح لهذا الخبر حالياً
              </p>
            )}
          </div>

          {/* Affected tickers */}
          {item.tickers && item.tickers.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wide">
                الأسهم المتأثرة
              </p>
              <div className="flex flex-wrap gap-2">
                {item.tickers.map(ticker => (
                  <span
                    key={ticker}
                    className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]"
                  >
                    {ticker}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MarketNewsSection({ news, loading, locale, filter, onFilterChange }: Props) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const isRtl = locale.startsWith('ar');
  const [selected, setSelected] = useState<MarketNewsItem | null>(null);

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
          <button
            key={idx}
            type="button"
            onClick={() => setSelected(item)}
            className={`group w-full text-start flex gap-0 hover:bg-[var(--bg-card-hover)] transition-colors duration-150 ${isRtl ? 'flex-row-reverse' : ''}`}
          >
            {/* Sentiment accent bar */}
            <div className={`w-[3px] shrink-0 ${sentimentBorder(item.sentiment)} border-l-[3px]`} />

            {/* Content */}
            <div className="flex-1 min-w-0 px-4 py-4">
                  {/* Top row: sentiment badge + time */}
              <div className={`flex items-center gap-2 mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                {(() => {
                  const sv = item.sentiment?.toLowerCase();
                  if (sv === 'positive' || sv === 'bullish') return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600 bg-green-100 dark:bg-green-950/40 px-2 py-0.5 rounded-full shrink-0">
                      <TrendingUp className="w-3 h-3" /> إيجابي
                    </span>
                  );
                  if (sv === 'negative' || sv === 'bearish') return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-100 dark:bg-red-950/40 px-2 py-0.5 rounded-full shrink-0">
                      <TrendingDown className="w-3 h-3" /> سلبي
                    </span>
                  );
                  return (
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full shrink-0">
                      عام
                    </span>
                  );
                })()}
                <span className="text-[11px] text-[var(--text-muted)] ml-auto shrink-0">
                  {item.publishedAt ? relativeTime(item.publishedAt, t) : ''}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-1 group-hover:text-[var(--brand)] transition-colors mb-1.5">
                {item.title}
              </h3>

              {/* Summary preview */}
              {item.summary && (
                <p className="text-xs text-[var(--text-muted)] line-clamp-3 leading-relaxed">
                  {item.summary}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* News detail modal */}
      {selected && (
        <NewsModal
          item={selected}
          isRtl={isRtl}
          onClose={() => setSelected(null)}
          t={t}
        />
      )}
    </section>
  );
}
