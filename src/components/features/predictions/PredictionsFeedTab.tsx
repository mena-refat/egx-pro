import React, { memo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTranslation } from 'react-i18next';
import { Crosshair } from 'lucide-react';
import { Button } from '../../ui/Button';
import { PredictionCard } from '../../predictions/PredictionCard';
import EmptyState from '../../shared/EmptyState';
import type { FeedPrediction } from '../../../store/usePredictionsStore';

const ROW_ESTIMATE = 120;
const OVERSCAN = 5;

type Props = {
  predictions: FeedPrediction[];
  pagination: { page: number; total: number; totalPages: number } | null;
  loading: boolean;
  filter: 'all' | 'following' | 'top';
  onFilter: (f: 'all' | 'following' | 'top') => void;
  onLoadMore: () => void;
  onLike: (id: string, source: 'feed', likeCount: number, isLiked: boolean) => void;
  onNewPrediction?: () => void;
};

export const PredictionsFeedTab = memo(function PredictionsFeedTab({
  predictions,
  pagination,
  loading,
  filter,
  onFilter,
  onLoadMore,
  onLike,
  onNewPrediction,
}: Props) {
  const { t } = useTranslation('common');
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: predictions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_ESTIMATE,
    overscan: OVERSCAN,
  });

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
        <EmptyState
          icon={Crosshair}
          title={t('predictions.emptyFeed')}
          description={t('predictions.emptyFeedDesc', { defaultValue: 'لا توجد توقعات في الخلاصة بعد. ابدأ بتوقّعك الأول أو غيّر الفلتر.' })}
          actionLabel={onNewPrediction ? t('predictions.newPrediction') : undefined}
          onAction={onNewPrediction}
        />
      ) : (
        <div
          ref={parentRef}
          className="overflow-auto rounded-xl"
          style={{ maxHeight: 'min(70vh, 560px)' }}
        >
          <div
            className="relative w-full"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const p = predictions[virtualRow.index];
              return (
                <div
                  key={p.id}
                  className="absolute left-0 w-full px-0"
                  style={{
                    top: virtualRow.start,
                    height: `${virtualRow.size}px`,
                  }}
                >
                  <div className="pb-4">
                    <PredictionCard
                      prediction={p}
                      showLikeButton
                      onLike={() => onLike(p.id, 'feed', p.likeCount, p.isLikedByMe)}
                      variant="feed"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {pagination && pagination.page < pagination.totalPages && (
            <div className="pt-2">
              <Button variant="secondary" onClick={onLoadMore} disabled={loading}>
                {t('predictions.loadMore')}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
});
