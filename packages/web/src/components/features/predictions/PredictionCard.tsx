import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Heart, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import type { FeedPrediction, MoveTier } from '../../../store/usePredictionsStore';
import { Button } from '../../ui/Button';

const TIER_STYLE: Record<MoveTier, { color: string; bg: string; labelKey: string; rangeKey: string }> = {
  LIGHT:   { color: 'text-sky-400',   bg: 'bg-sky-500/10',   labelKey: 'predictions.tierLight',   rangeKey: 'predictions.tierLightRange' },
  MEDIUM:  { color: 'text-green-400', bg: 'bg-green-500/10', labelKey: 'predictions.tierMedium',  rangeKey: 'predictions.tierMediumRange' },
  STRONG:  { color: 'text-amber-400', bg: 'bg-amber-500/10', labelKey: 'predictions.tierStrong',  rangeKey: 'predictions.tierStrongRange' },
  EXTREME: { color: 'text-red-400',   bg: 'bg-red-500/10',   labelKey: 'predictions.tierExtreme', rangeKey: 'predictions.tierExtremeRange' },
};

const RANK_COLORS: Record<string, string> = {
  BEGINNER: 'text-[var(--text-muted)]',
  ANALYST: 'text-blue-500',
  SENIOR: 'text-purple-500',
  EXPERT: 'text-amber-500',
  LEGEND: 'text-red-500',
};

function rankKey(r: string): string {
  return `predictions.rank${r.charAt(0) + r.slice(1).toLowerCase()}`;
}

export interface PredictionCardProps {
  prediction: FeedPrediction;
  showLikeButton?: boolean;
  onLike?: () => void;
  likeLoading?: boolean;
  variant?: 'feed' | 'my';
}

export const PredictionCard = memo(function PredictionCard({
  prediction,
  showLikeButton = true,
  onLike,
  likeLoading = false,
  variant = 'feed',
}: PredictionCardProps) {
  void variant;
  const { t } = useTranslation('common');
  const [now] = React.useState(() => Date.now());
  const isUp = prediction.direction === 'UP';
  const priceAtCreation = prediction.priceAtCreation ?? 0;
  const tier = prediction.moveTier ? TIER_STYLE[prediction.moveTier] : null;
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(prediction.expiresAt).getTime() - now) / (24 * 60 * 60 * 1000))
  );
  const rankLabel = t(rankKey(prediction.userRank ?? 'BEGINNER'));
  const borderColor =
    prediction.status === 'HIT'
      ? 'border-amber-500/50'
      : prediction.status === 'MISSED' || prediction.status === 'EXPIRED'
        ? 'border-[var(--border)]'
        : isUp
          ? 'border-green-500/40'
          : 'border-red-500/40';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`rounded-xl border bg-[var(--bg-card)] p-4 ${borderColor}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[var(--brand)]/20 flex items-center justify-center shrink-0 text-sm font-medium text-[var(--brand)]">
            {(prediction.user?.username ?? '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-[var(--text-primary)] truncate">
              @{prediction.user?.username ?? '—'}
            </p>
            <p className={`text-xs ${RANK_COLORS[prediction.userRank ?? 'BEGINNER'] ?? 'text-[var(--text-muted)]'}`}>
              {rankLabel} · {t('predictions.accuracyHistory')}: {Math.round(prediction.userAccuracyRate ?? 0)}% ({prediction.userTotalPredictions ?? 0} {t('predictions.predictionsCount')})
            </p>
          </div>
        </div>
        <span className="text-xs text-[var(--text-muted)] shrink-0">
          {new Date(prediction.createdAt).toLocaleDateString(undefined, { hour: '2-digit', minute: '2-digit', day: 'numeric' })}
        </span>
      </div>

      <div className="mb-2">
        <p className="font-semibold text-[var(--text-primary)]">
          {prediction.ticker}
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          {t('predictions.currentPrice')}: {priceAtCreation.toFixed(2)} ج.م
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-2">
        {isUp ? (
          <TrendingUp className="w-5 h-5 text-green-500 shrink-0" aria-hidden />
        ) : (
          <TrendingDown className="w-5 h-5 text-red-500 shrink-0" aria-hidden />
        )}
        <span className={isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
          {t(isUp ? 'predictions.directionUp' : 'predictions.directionDown')}
        </span>
        {tier && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tier.color} ${tier.bg}`}>
            {t(tier.labelKey)}
            <span className="opacity-70">{t(tier.rangeKey)}</span>
          </span>
        )}
      </div>

      <p className="text-xs text-[var(--text-muted)] mb-2">
        {t('predictions.reason')}: {prediction.reason || '—'}
      </p>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
        {showLikeButton && onLike ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLike}
            disabled={likeLoading}
            className="gap-1"
          >
            <Heart
              className={`w-4 h-4 ${prediction.isLikedByMe ? 'fill-red-500 text-red-500' : ''}`}
              aria-hidden
            />
            <span>{prediction.likeCount}</span>
          </Button>
        ) : (
          <span className="text-sm text-[var(--text-muted)] flex items-center gap-1">
            <Heart className="w-4 h-4" aria-hidden />
            {prediction.likeCount}
          </span>
        )}
        {prediction.status === 'ACTIVE' && (
          <span className="text-xs text-[var(--text-muted)]">
            {t('predictions.daysLeft')} {daysLeft} {t('predictions.day')}
          </span>
        )}
        {prediction.status === 'ACTIVE' && tier && (
          <span className="text-xs text-amber-400 flex items-center gap-0.5">
            <Zap className="w-3 h-3" aria-hidden />
            {t('predictions.pointPotential')}
          </span>
        )}
        {prediction.status === 'HIT' && prediction.pointsEarned != null && (
          <span className="text-sm font-medium text-green-600 dark:text-green-400">
            {t('predictions.hitPoints', { points: prediction.pointsEarned })}
          </span>
        )}
        {prediction.status === 'MISSED' && (
          <span className="text-sm text-red-600 dark:text-red-400">
            {t('predictions.missedPoints', { points: prediction.pointsEarned ?? 0 })}
          </span>
        )}
        {prediction.status === 'EXPIRED' && (
          <span className="text-sm text-[var(--text-muted)]">{t('predictions.expiredLabel')}</span>
        )}
      </div>
    </motion.div>
  );
});
