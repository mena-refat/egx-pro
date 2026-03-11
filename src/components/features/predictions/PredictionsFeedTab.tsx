import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../ui/Button';
import { PredictionCard } from '../../predictions/PredictionCard';
import type { FeedPrediction } from '../../../store/usePredictionsStore';

type Props = {
  predictions: FeedPrediction[];
  pagination: { page: number; total: number; totalPages: number } | null;
  loading: boolean;
  filter: 'all' | 'following' | 'top';
  onFilter: (f: 'all' | 'following' | 'top') => void;
  onLoadMore: () => void;
  onLike: (id: string, source: 'feed', likeCount: number, isLiked: boolean) => void;
};

export function PredictionsFeedTab({
  predictions,
  pagination,
  loading,
  filter,
  onFilter,
  onLoadMore,
  onLike,
}: Props) {
  const { t } = useTranslation('common');

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {(['all', 'following', 'top'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm ${
              filter === f ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}
          >
            {t(`predictions.filter${f.charAt(0).toUpperCase() + f.slice(1)}`)}
          </button>
        ))}
      </div>
      {loading && predictions.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-[var(--bg-secondary)] animate-pulse" />
          ))}
        </div>
      ) : predictions.length === 0 ? (
        <p className="text-[var(--text-muted)] py-8 text-center">{t('predictions.emptyFeed')}</p>
      ) : (
        <div className="space-y-4">
          {predictions.map((p) => (
            <PredictionCard
              key={p.id}
              prediction={p}
              showLikeButton
              onLike={() => onLike(p.id, 'feed', p.likeCount, p.isLikedByMe)}
              variant="feed"
            />
          ))}
          {pagination && pagination.page < pagination.totalPages && (
            <Button variant="secondary" onClick={onLoadMore} disabled={loading}>
              {t('predictions.loadMore')}
            </Button>
          )}
        </div>
      )}
    </>
  );
}
