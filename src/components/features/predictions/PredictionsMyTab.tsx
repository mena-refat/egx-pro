import React from 'react';
import { useTranslation } from 'react-i18next';
import { Target } from 'lucide-react';
import { Button } from '../../ui/Button';
import { PredictionCard } from '../../predictions/PredictionCard';
import EmptyState from '../../shared/EmptyState';
import type { FeedPrediction } from '../../../store/usePredictionsStore';

type MyStats = { totalPoints?: number; accuracyRate?: number; correctPredictions?: number; totalPredictions?: number } | null;

type Props = {
  predictions: FeedPrediction[];
  loading: boolean;
  stats: MyStats;
  statusFilter: string;
  onStatusFilter: (s: string) => void;
  canCreate: boolean;
  limitReachedLabel?: string;
  onNewPrediction: () => void;
};

export function PredictionsMyTab({
  predictions,
  loading,
  stats,
  statusFilter,
  onStatusFilter,
  canCreate,
  limitReachedLabel,
  onNewPrediction,
}: Props) {
  const { t } = useTranslation('common');

  return (
    <>
      {stats && (
        <div className="flex gap-4 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
          <span className="text-sm">{(stats.totalPoints ?? 0)} {t('predictions.pointsShort')}</span>
          <span className="text-sm">{(stats.accuracyRate ?? 0).toFixed(0)}% {t('predictions.accuracy')}</span>
          <span className="text-sm">{stats.correctPredictions ?? 0} / {stats.totalPredictions ?? 0}</span>
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {['ACTIVE', 'HIT', 'MISSED', 'EXPIRED'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm ${
              statusFilter === s ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-secondary)]'
            }`}
          >
            {s === 'HIT' ? t('predictions.hitBadge') : s === 'MISSED' ? t('predictions.missedBadge') : s === 'EXPIRED' ? t('predictions.expiredBadge') : t('predictions.statusActive')}
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
          icon={Target}
          title={t('predictions.emptyMy')}
          description={t('predictions.emptyMyDesc', { defaultValue: 'لم تنشئ أي توقّعات بعد. اضغط على + لإنشاء توقّعك الأول.' })}
          actionLabel={t('predictions.newPrediction')}
          onAction={onNewPrediction}
        />
      ) : (
        <div className="space-y-4">
          {predictions.map((p) => (
            <PredictionCard key={p.id} prediction={p} variant="my" />
          ))}
        </div>
      )}
      <div className="fixed bottom-20 end-6 z-40 flex flex-col items-end gap-1">
        {!canCreate && limitReachedLabel && (
          <span className="text-xs text-[var(--text-muted)]" title={limitReachedLabel}>
            {t('predictions.limitReached')}
          </span>
        )}
        <Button
          variant="primary"
          size="lg"
          onClick={onNewPrediction}
          disabled={!canCreate}
          aria-label={t('predictions.newPrediction')}
          className="rounded-full w-14 h-14 shadow-lg"
        >
          +
        </Button>
      </div>
    </>
  );
}
