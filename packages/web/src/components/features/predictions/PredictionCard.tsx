import React, { memo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Heart, Target, Trash2, Zap, Trophy, Timer, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FeedPrediction, MoveTier } from '../../../store/usePredictionsStore';
import { useAuthStore } from '../../../store/authStore';
import { formatRange } from '../../../lib/scoringConstants';
import type { PredictionTime } from '../../../lib/scoringConstants';

const DELETION_WINDOW_MS = 5 * 60 * 1000;

const TIER_STYLE: Record<MoveTier, {
  color: string; bg: string; border: string; labelKey: string;
  gradient: string; glowColor: string;
}> = {
  LIGHT:   { color: 'text-sky-400',    bg: 'bg-sky-500/10',    border: 'border-sky-500/20',    labelKey: 'predictions.tierLight',   gradient: 'from-sky-500/15 to-sky-500/5',    glowColor: 'rgba(14,165,233,0.15)'  },
  MEDIUM:  { color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', labelKey: 'predictions.tierMedium',  gradient: 'from-indigo-500/15 to-indigo-500/5', glowColor: 'rgba(99,102,241,0.15)'  },
  STRONG:  { color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', labelKey: 'predictions.tierStrong',  gradient: 'from-violet-500/15 to-violet-500/5', glowColor: 'rgba(139,92,246,0.15)'  },
  EXTREME: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', labelKey: 'predictions.tierExtreme', gradient: 'from-orange-500/15 to-orange-500/5', glowColor: 'rgba(249,115,22,0.15)'  },
};

const RANK_META: Record<string, { color: string; labelKey: string; ring: string }> = {
  BEGINNER: { color: 'text-[var(--text-muted)]', labelKey: 'predictions.rankBeginner', ring: 'rgba(255,255,255,0.08)' },
  ANALYST:  { color: 'text-blue-400',            labelKey: 'predictions.rankAnalyst',  ring: 'rgba(96,165,250,0.35)' },
  SENIOR:   { color: 'text-purple-400',          labelKey: 'predictions.rankSenior',   ring: 'rgba(192,132,252,0.35)' },
  EXPERT:   { color: 'text-amber-400',           labelKey: 'predictions.rankExpert',   ring: 'rgba(251,191,36,0.4)' },
  LEGEND:   { color: 'text-rose-400',            labelKey: 'predictions.rankLegend',   ring: 'rgba(251,113,133,0.4)' },
};

const TIMEFRAME_KEY: Record<string, string> = {
  WEEK:         'predictions.timeframeWeek',
  MONTH:        'predictions.timeframeMonth',
  THREE_MONTHS: 'predictions.timeframeThreeMonths',
  SIX_MONTHS:   'predictions.timeframeSixMonths',
  NINE_MONTHS:  'predictions.timeframeNineMonths',
  YEAR:         'predictions.timeframeYear',
};

function formatCountdown(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function shortDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

function pctChange(from: number, to: number): number {
  return from ? ((to - from) / from) * 100 : 0;
}

function useDeleteCountdown(createdAt: string, enabled: boolean): number {
  const [ms, setMs] = useState(() =>
    enabled ? Math.max(0, DELETION_WINDOW_MS - (Date.now() - new Date(createdAt).getTime())) : 0
  );
  useEffect(() => {
    if (!enabled || ms <= 0) return;
    const id = setInterval(() => {
      const r = Math.max(0, DELETION_WINDOW_MS - (Date.now() - new Date(createdAt).getTime()));
      setMs(r);
      if (r <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [createdAt, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  return ms;
}

export interface PredictionCardProps {
  prediction: FeedPrediction;
  showLikeButton?: boolean;
  onLike?: () => Promise<void> | void;
  onDelete?: () => Promise<void>;
  variant?: 'feed' | 'my';
  likeLoading?: boolean;
}

export const PredictionCard = memo(function PredictionCard({
  prediction, showLikeButton = true, onLike, onDelete, variant = 'feed',
}: PredictionCardProps) {
  const { t, i18n } = useTranslation('common');
  const locale = i18n.language;
  const isAr   = locale.startsWith('ar');

  const currentUserId   = useAuthStore((s) => s.user?.id);
  const isOwnPrediction = currentUserId != null && Number(currentUserId) === prediction.userId;

  const isMyActive = variant === 'my' && prediction.status === 'ACTIVE' && !!onDelete;
  const msLeft     = useDeleteCountdown(prediction.createdAt, isMyActive);
  const canDelete  = isMyActive && msLeft > 0;

  const [deleteState, setDeleteState] = useState<'idle' | 'confirming' | 'deleting'>('idle');
  const [likeLoading, setLikeLoading] = useState(false);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (!canDelete && deleteState === 'confirming') setDeleteState('idle');
  }, [canDelete, deleteState]);

  const handleLike = async () => {
    if (!onLike || likeLoading) return;
    setLikeLoading(true);
    try { await onLike(); } finally { setLikeLoading(false); }
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setDeleteState('deleting');
    try { await onDelete(); } catch { setDeleteState('idle'); }
  };

  // ─── Derived values ──────────────────────────────────────────────
  const isUp      = prediction.direction === 'UP';
  const isActive  = prediction.status === 'ACTIVE';
  const isHit     = prediction.status === 'HIT';
  const isMissed  = prediction.status === 'MISSED';
  const isExpired = prediction.status === 'EXPIRED';

  const tier     = prediction.moveTier ? TIER_STYLE[prediction.moveTier] : null;
  const rankMeta = RANK_META[prediction.userRank ?? 'BEGINNER'] ?? RANK_META.BEGINNER;

  const createdMs   = new Date(prediction.createdAt).getTime();
  const expiresMs   = new Date(prediction.expiresAt).getTime();
  const totalMs     = expiresMs - createdMs;
  const progressPct = Math.min(100, Math.max(0, ((now - createdMs) / totalMs) * 100));
  const daysLeft    = Math.max(0, Math.ceil((expiresMs - now) / 86_400_000));
  const daysTotal   = Math.max(1, Math.round(totalMs / 86_400_000));

  const priceAt  = prediction.priceAtCreation ?? 0;
  const priceNow = isActive ? (prediction.currentPrice ?? null) : (prediction.resolvedPrice ?? null);
  const diff     = priceNow != null ? pctChange(priceAt, priceNow) : null;
  const diffPos  = diff != null && diff > 0.005;
  const diffNeg  = diff != null && diff < -0.005;

  const timeframeLabel = prediction.timeframe
    ? t(TIMEFRAME_KEY[prediction.timeframe] ?? prediction.timeframe)
    : `${daysTotal} ${t('predictions.day')}`;

  // Bar colors / gradient
  const barGradient = isHit
    ? 'linear-gradient(to right, rgba(251,191,36,0.4), rgba(251,191,36,0.85))'
    : (isMissed || isExpired)
      ? 'linear-gradient(to right, rgba(255,255,255,0.06), rgba(255,255,255,0.12))'
      : daysLeft <= 3
        ? 'linear-gradient(to right, rgba(251,191,36,0.35), rgba(251,191,36,0.75))'
        : 'linear-gradient(to right, var(--brand-dim, rgba(139,92,246,0.35)), var(--brand, rgba(139,92,246,0.75)))';

  const dotColor = isHit ? '#fbbf24' : daysLeft <= 3 ? '#fbbf24' : 'var(--brand)';

  // Top accent strip color
  const accentGradient = isActive
    ? 'linear-gradient(to right, transparent, var(--brand), transparent)'
    : isHit
      ? 'linear-gradient(to right, transparent, rgba(251,191,36,0.7), transparent)'
      : 'linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden relative"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
    >
      {/* Top accent gradient line */}
      <div className="h-px w-full" style={{ background: accentGradient }} />

      <div className="p-4 space-y-3">

        {/* ── 1. Author row ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5">
          {/* Avatar with rank-colored ring */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-black text-[var(--brand)] bg-[var(--brand)]/10"
            style={{ boxShadow: `0 0 0 2px ${rankMeta.ring}` }}
          >
            {(prediction.user?.username ?? '?').slice(0, 1).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                @{prediction.user?.username ?? '-'}
              </span>
              <span className={`text-[11px] font-semibold ${rankMeta.color}`}>
                {t(rankMeta.labelKey)}
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                · {Math.round(prediction.userAccuracyRate ?? 0)}%
                <span className="opacity-50"> ({prediction.userTotalPredictions ?? 0})</span>
              </span>
            </div>
          </div>

          {/* Status badge */}
          <AnimatePresence mode="wait">
            {isActive && (
              <motion.span
                key="active"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[var(--brand)]/8 text-[var(--brand)] border border-[var(--brand)]/20"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-pulse" />
                {t('predictions.statusActive')}
              </motion.span>
            )}
            {isHit && (
              <motion.span
                key="hit"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/12 text-amber-400 border border-amber-500/20"
              >
                <Trophy className="w-3 h-3" /> {t('predictions.hitBadge')}
              </motion.span>
            )}
            {isMissed && (
              <motion.span key="missed" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)]">
                {t('predictions.missedBadge')}
              </motion.span>
            )}
            {isExpired && (
              <motion.span key="expired" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)]">
                <Timer className="w-3 h-3" /> {t('predictions.expiredBadge')}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* ── 2. Prediction core ──────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-2xl font-black text-[var(--text-primary)] tracking-tight leading-none mb-2">
              {prediction.ticker}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Direction — soft green/red */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                isUp
                  ? 'text-emerald-400 bg-emerald-500/8 border-emerald-500/20'
                  : 'text-rose-400 bg-rose-500/8 border-rose-500/20'
              }`}>
                {isUp
                  ? <TrendingUp  className="w-3.5 h-3.5" aria-hidden />
                  : <TrendingDown className="w-3.5 h-3.5" aria-hidden />
                }
                {t(isUp ? 'predictions.directionUp' : 'predictions.directionDown')}
              </span>

              {/* Tier chip — gradient bg */}
              {prediction.mode === 'EXACT' && prediction.targetPrice != null ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]">
                  <Target className="w-3 h-3" aria-hidden />
                  {prediction.targetPrice.toFixed(2)} {t('common.egp')}
                </span>
              ) : tier && prediction.timeframe ? (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border bg-gradient-to-br ${tier.gradient} ${tier.color} ${tier.border}`}
                  style={{ boxShadow: `inset 0 1px 0 ${tier.glowColor}` }}
                >
                  <Zap className="w-3 h-3" aria-hidden />
                  {t(tier.labelKey)}
                  <span className="opacity-50 text-[10px] tabular-nums">
                    {formatRange(prediction.moveTier!, prediction.timeframe as PredictionTime)}
                  </span>
                </span>
              ) : null}
            </div>
          </div>

          {/* Right info block */}
          {(isHit || isMissed) && prediction.pointsEarned != null ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className={`shrink-0 text-end px-3 py-2 rounded-xl border ${
                isHit
                  ? 'border-amber-500/20 bg-gradient-to-br from-amber-500/12 to-amber-500/4'
                  : 'border-[var(--border)] bg-[var(--bg-secondary)]'
              }`}
            >
              <p className={`text-lg font-black tabular-nums leading-none ${isHit ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>
                {isHit ? '+' : ''}{prediction.pointsEarned}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{t('predictions.pts')}</p>
            </motion.div>
          ) : (
            <div className="shrink-0 text-end px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
              <p className="text-xs font-bold text-[var(--text-primary)] leading-tight">{timeframeLabel}</p>
              {isActive && (
                <p className={`text-[10px] tabular-nums mt-0.5 font-semibold ${daysLeft <= 3 ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>
                  {daysLeft} {t('predictions.day')} {t('predictions.daysLeft')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── 3. Price row — full-width block ─────────────────────────── */}
        <div className="flex items-stretch rounded-xl overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border)]">
          <div className="flex-1 px-3 py-2.5">
            <p className="text-[10px] text-[var(--text-muted)] mb-0.5">{isAr ? 'سعر الدخول' : 'Entry'}</p>
            <p className="font-bold text-[var(--text-primary)] tabular-nums text-sm">
              {priceAt.toFixed(2)}{' '}
              <span className="text-[10px] font-normal text-[var(--text-muted)]">{t('common.egp')}</span>
            </p>
          </div>

          <div className="flex items-center px-2 text-[var(--text-muted)]">
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden />
          </div>

          <div className="flex-1 px-3 py-2.5 text-end">
            <p className="text-[10px] text-[var(--text-muted)] mb-0.5">
              {isActive ? (isAr ? 'السعر الحالي' : 'Current') : (isAr ? 'سعر الإغلاق' : 'Close')}
            </p>
            {priceNow != null ? (
              <p className="font-bold text-[var(--text-primary)] tabular-nums text-sm">
                {priceNow.toFixed(2)}{' '}
                <span className="text-[10px] font-normal text-[var(--text-muted)]">{t('common.egp')}</span>
              </p>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">—</p>
            )}
          </div>

          {diff != null && Math.abs(diff) >= 0.01 && (
            <motion.div
              initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12 }}
              className={`flex items-center px-3.5 border-s border-[var(--border)] ${
                diffPos ? 'bg-gradient-to-b from-green-500/10 to-green-500/5'
                : diffNeg ? 'bg-gradient-to-b from-red-500/10 to-red-500/5'
                : ''
              }`}
            >
              <span className={`text-sm font-black tabular-nums ${
                diffPos ? 'text-green-400' : diffNeg ? 'text-red-400' : 'text-[var(--text-muted)]'
              }`}>
                {diffPos ? '+' : ''}{diff.toFixed(2)}%
              </span>
            </motion.div>
          )}
        </div>

        {/* ── 4. Timeline ──────────────────────────────────────────────── */}
        <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] px-3 py-2.5 space-y-2">
          <div className="flex items-center justify-between text-[10px] tabular-nums">
            <span className="text-[var(--text-muted)]">{shortDate(prediction.createdAt, locale)}</span>
            <span className={`font-bold text-[10px] ${
              isHit ? 'text-amber-400'
              : isMissed || isExpired ? 'text-[var(--text-muted)]'
              : daysLeft <= 3 ? 'text-amber-400'
              : 'text-[var(--brand)]'
            }`}>
              {Math.round(progressPct)}%
            </span>
            <span className="text-[var(--text-muted)]">{shortDate(prediction.expiresAt, locale)}</span>
          </div>

          {/* Bar */}
          <div className="relative h-2 rounded-full bg-[var(--bg-card)] overflow-visible">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{ background: barGradient }}
            />
            {/* Glow dot at tip */}
            {isActive && progressPct > 3 && progressPct < 97 && (
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.25 }}
                style={{
                  left: `calc(${progressPct}% - 5px)`,
                  background: dotColor,
                  boxShadow: `0 0 6px 2px ${dotColor === 'var(--brand)' ? 'rgba(139,92,246,0.5)' : 'rgba(251,191,36,0.5)'}`,
                }}
              />
            )}
          </div>
        </div>

        {/* ── 5. Reason ────────────────────────────────────────────────── */}
        {prediction.reason && (
          <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-2 ps-3 border-s-[1.5px] border-[var(--brand)]/30">
            {prediction.reason}
          </p>
        )}

        {/* ── 6. Footer ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 pt-1 border-t border-[var(--border)]">

          {/* Like button */}
          {showLikeButton && onLike && !isOwnPrediction ? (
            <motion.button
              type="button"
              onClick={handleLike}
              disabled={likeLoading}
              whileTap={{ scale: 0.82 }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.12 }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors duration-150 disabled:opacity-50 ${
                prediction.isLikedByMe
                  ? 'text-red-500 bg-red-500/10 border border-red-500/20'
                  : 'text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/8 border border-transparent'
              }`}
            >
              <motion.div
                animate={prediction.isLikedByMe ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <Heart
                  className={`w-5 h-5 ${likeLoading ? 'opacity-50' : ''} ${prediction.isLikedByMe ? 'fill-red-500' : ''}`}
                  aria-hidden
                />
              </motion.div>
              <span className="tabular-nums font-bold text-sm">{prediction.likeCount}</span>
            </motion.button>
          ) : (
            <span className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-muted)]">
              <Heart className="w-5 h-5" aria-hidden />
              <span className="tabular-nums font-bold">{prediction.likeCount}</span>
            </span>
          )}

          {/* Spacer + delete + timestamp */}
          <div className="ms-auto flex items-center gap-2">
            <AnimatePresence mode="wait">
              {canDelete && deleteState === 'idle' && (
                <motion.button key="del"
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  type="button" onClick={() => setDeleteState('confirming')}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/8 transition-all text-[10px]"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="tabular-nums font-mono">{formatCountdown(msLeft)}</span>
                </motion.button>
              )}
              {canDelete && deleteState === 'confirming' && (
                <motion.div key="confirm"
                  initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-1"
                >
                  <span className="text-[10px] text-[var(--text-muted)]">{isAr ? 'حذف؟' : 'Delete?'}</span>
                  <button type="button" onClick={handleConfirmDelete}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/12 text-red-400 hover:bg-red-500/20 transition-colors">
                    {isAr ? 'نعم' : 'Yes'}
                  </button>
                  <button type="button" onClick={() => setDeleteState('idle')}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    {isAr ? 'لا' : 'No'}
                  </button>
                </motion.div>
              )}
              {deleteState === 'deleting' && (
                <motion.span key="deleting" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-[10px] text-[var(--text-muted)]">
                  {isAr ? 'جاري الحذف...' : 'Deleting...'}
                </motion.span>
              )}
            </AnimatePresence>

            <span className="text-xs text-[var(--text-muted)] tabular-nums">
              {new Date(prediction.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

      </div>
    </motion.div>
  );
});
