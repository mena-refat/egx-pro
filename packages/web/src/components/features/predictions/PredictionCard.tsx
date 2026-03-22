import React, { memo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Heart, Zap, Target, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FeedPrediction, MoveTier } from '../../../store/usePredictionsStore';
import { Button } from '../../ui/Button';
import { formatRange } from '../../../lib/scoringConstants';
import type { PredictionTime } from '../../../lib/scoringConstants';

const DELETION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes — must match backend

const TIER_STYLE: Record<MoveTier, { color: string; bg: string; labelKey: string }> = {
  LIGHT:   { color: 'text-sky-400',   bg: 'bg-sky-500/10',   labelKey: 'predictions.tierLight'   },
  MEDIUM:  { color: 'text-green-400', bg: 'bg-green-500/10', labelKey: 'predictions.tierMedium'  },
  STRONG:  { color: 'text-amber-400', bg: 'bg-amber-500/10', labelKey: 'predictions.tierStrong'  },
  EXTREME: { color: 'text-red-400',   bg: 'bg-red-500/10',   labelKey: 'predictions.tierExtreme' },
};

const RANK_COLORS: Record<string, string> = {
  BEGINNER: 'text-[var(--text-muted)]',
  ANALYST:  'text-blue-500',
  SENIOR:   'text-purple-500',
  EXPERT:   'text-amber-500',
  LEGEND:   'text-red-500',
};

function rankKey(r: string): string {
  return `predictions.rank${r.charAt(0) + r.slice(1).toLowerCase()}`;
}

function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Countdown hook — ticks every second, stops at 0 ──────────────────────────
function useDeleteCountdown(createdAt: string, enabled: boolean): number {
  const [msLeft, setMsLeft] = useState(() => {
    if (!enabled) return 0;
    return Math.max(0, DELETION_WINDOW_MS - (Date.now() - new Date(createdAt).getTime()));
  });

  useEffect(() => {
    if (!enabled || msLeft <= 0) return;
    const id = setInterval(() => {
      const remaining = Math.max(0, DELETION_WINDOW_MS - (Date.now() - new Date(createdAt).getTime()));
      setMsLeft(remaining);
      if (remaining <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [createdAt, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return msLeft;
}

export interface PredictionCardProps {
  prediction: FeedPrediction;
  showLikeButton?: boolean;
  onLike?: () => void;
  likeLoading?: boolean;
  onDelete?: () => Promise<void>;
  variant?: 'feed' | 'my';
}

export const PredictionCard = memo(function PredictionCard({
  prediction,
  showLikeButton = true,
  onLike,
  likeLoading = false,
  onDelete,
  variant = 'feed',
}: PredictionCardProps) {
  const { t, i18n } = useTranslation('common');
  const isAr = i18n.language.startsWith('ar');

  const isMyActive = variant === 'my' && prediction.status === 'ACTIVE' && !!onDelete;
  const msLeft     = useDeleteCountdown(prediction.createdAt, isMyActive);
  const canDelete  = isMyActive && msLeft > 0;

  const [deleteState, setDeleteState] = useState<'idle' | 'confirming' | 'deleting'>('idle');

  // Reset confirm state when window expires
  useEffect(() => {
    if (!canDelete && deleteState === 'confirming') setDeleteState('idle');
  }, [canDelete, deleteState]);

  const handleDeleteClick = () => setDeleteState('confirming');
  const handleCancelDelete = () => setDeleteState('idle');
  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setDeleteState('deleting');
    try {
      await onDelete();
    } catch {
      setDeleteState('idle');
    }
  };

  const isUp = prediction.direction === 'UP';
  const priceAtCreation = prediction.priceAtCreation ?? 0;
  const tier = prediction.moveTier ? TIER_STYLE[prediction.moveTier] : null;
  const [now] = useState(() => Date.now());
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(prediction.expiresAt).getTime() - now) / 86_400_000)
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
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={`rounded-xl border bg-[var(--bg-card)] p-4 ${borderColor}`}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[var(--brand)]/20 flex items-center justify-center shrink-0 text-sm font-medium text-[var(--brand)]">
            {(prediction.user?.username ?? '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-[var(--text-primary)] truncate">
              @{prediction.user?.username ?? '-'}
            </p>
            <p className={`text-xs ${RANK_COLORS[prediction.userRank ?? 'BEGINNER'] ?? 'text-[var(--text-muted)]'}`}>
              {rankLabel} · {t('predictions.accuracyHistory')}: {Math.round(prediction.userAccuracyRate ?? 0)}% ({prediction.userTotalPredictions ?? 0} {t('predictions.predictionsCount')})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* ── Delete button (5-min window only) ── */}
          <AnimatePresence mode="wait">
            {canDelete && deleteState === 'idle' && (
              <motion.button
                key="delete-btn"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                type="button"
                onClick={handleDeleteClick}
                title={isAr ? `يمكن الحذف خلال ${formatCountdown(msLeft)}` : `Can delete for ${formatCountdown(msLeft)}`}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-[11px] tabular-nums font-mono">{formatCountdown(msLeft)}</span>
              </motion.button>
            )}

            {canDelete && deleteState === 'confirming' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5"
              >
                <span className="text-[11px] text-[var(--text-muted)]">
                  {isAr ? 'حذف؟' : 'Delete?'}
                </span>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                >
                  {isAr ? 'نعم' : 'Yes'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {isAr ? 'لا' : 'No'}
                </button>
              </motion.div>
            )}

            {deleteState === 'deleting' && (
              <motion.span
                key="deleting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[11px] text-[var(--text-muted)]"
              >
                {isAr ? 'جاري الحذف...' : 'Deleting...'}
              </motion.span>
            )}
          </AnimatePresence>

          <span className="text-xs text-[var(--text-muted)]">
            {new Date(prediction.createdAt).toLocaleDateString(undefined, { hour: '2-digit', minute: '2-digit', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* ── Stock + price ──────────────────────────────────────── */}
      <div className="mb-2">
        <p className="font-semibold text-[var(--text-primary)]">{prediction.ticker}</p>
        <p className="text-sm text-[var(--text-muted)]">
          {t('predictions.currentPrice')}: {priceAtCreation.toFixed(2)} ج.م
        </p>
      </div>

      {/* ── Direction + tier/target ───────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {isUp ? (
          <TrendingUp className="w-5 h-5 text-green-500 shrink-0" aria-hidden />
        ) : (
          <TrendingDown className="w-5 h-5 text-red-500 shrink-0" aria-hidden />
        )}
        <span className={isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
          {t(isUp ? 'predictions.directionUp' : 'predictions.directionDown')}
        </span>
        {prediction.mode === 'EXACT' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-emerald-400 bg-emerald-500/10">
            <Target className="w-3 h-3" />
            {prediction.targetPrice?.toFixed(2)} ج.م
          </span>
        ) : tier && prediction.timeframe ? (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tier.color} ${tier.bg}`}>
            {t(tier.labelKey)}
            <span className="opacity-70">{formatRange(prediction.moveTier!, prediction.timeframe as PredictionTime)}</span>
          </span>
        ) : null}
      </div>

      {/* ── Reason ───────────────────────────────────────────── */}
      <p className="text-xs text-[var(--text-muted)] mb-2">
        {t('predictions.reason')}: {prediction.reason || '-'}
      </p>

      {/* ── Footer ───────────────────────────────────────────── */}
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

        <div className="flex items-center gap-3">
          {prediction.status === 'ACTIVE' && (
            <span className="text-xs text-[var(--text-muted)]">
              {t('predictions.daysLeft')} {daysLeft} {t('predictions.day')}
            </span>
          )}
          {prediction.status === 'ACTIVE' && (tier || prediction.mode === 'EXACT') && (
            <span className={`text-xs flex items-center gap-0.5 ${prediction.mode === 'EXACT' ? 'text-emerald-400' : 'text-amber-400'}`}>
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
      </div>
    </motion.div>
  );
});
