import React from 'react';
import { useTranslation } from 'react-i18next';
import { Newspaper, ChevronRight } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import type { MarketNewsItem } from './types';

type Props = {
  news: MarketNewsItem[];
  loading: boolean;
  locale: string;
};

export function MarketNewsSection({ news, loading, locale }: Props) {
  const { t } = useTranslation('common');

  if (loading) {
    return (
      <section>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">{t('market.newsTitle')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-2">
              <Skeleton height={18} className="w-full" />
              <Skeleton height={14} className="w-4/5" />
              <Skeleton height={12} className="w-1/3" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (news.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">{t('market.newsTitle')}</h2>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
          <Newspaper className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
          <p className="font-medium text-[var(--text-secondary)]">{t('market.newsEmptyTitle')}</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">{t('market.newsEmptyDesc')}</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">{t('market.newsTitle')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {news.slice(0, 9).map((item, idx) => (
          <a
            key={idx}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm hover:border-[var(--brand)] hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)] mb-2">
              <span>{item.source}</span>
              <span>{item.publishedAt ? new Date(item.publishedAt).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' }) : ''}</span>
            </div>
            <h3 className="font-medium text-[var(--text-primary)] line-clamp-2 mb-2">{item.title}</h3>
            <span className="text-sm text-[var(--brand)] font-medium inline-flex items-center gap-1">
              {t('market.readMore')}
              <ChevronRight className="w-4 h-4" />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
