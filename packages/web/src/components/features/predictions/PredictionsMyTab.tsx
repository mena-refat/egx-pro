import React from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Zap, Clock } from 'lucide-react';
import { Button } from '../../ui/Button';
import { PredictionCard } from './PredictionCard';
import EmptyState from '../../shared/EmptyState';
import type { FeedPrediction, DailyLimits } from '../../../store/usePredictionsStore';

type MyStats = { totalPoints?: number; accuracyRate?: number; correctPredictions?: number; totalPredictions?: number } | null;

type Props = {
  predictions: FeedPrediction[];
  loading: boolean;
  stats: MyStats;
  statusFilter: string;
  onStatusFilter: (s: string) => void;
  canCreate: boolean;
  limits?: DailyLimits;
  onNewPrediction: () => void;
};

function LimitBar({ used, total, label, icon: Icon, colorClass }: {
  used: number; total: number; label: string;
  icon: React.ElementType; colorClass: string;
}) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const isNearLimit = pct >= 80;
  const isAtLimit   = used >= total;

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
          <Icon className="w-3 h-3" />
          {label}
        </span>
        <span className={`text-[11px] font-semibold tabular-nums ${
          isAtLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-[var(--text-secondary)]'
        }`}>
          {used}/{total}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-400' : colorClass
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PredictionsMyTab({
  predictions,
  loading,
  stats,
  statusFilter,
  onStatusFilter,
  canCreate,
  limits,
  onNewPrediction,
}: Props) {
  const { t, i18n } = useTranslation('common');
  const isAr = i18n.language?.startsWith('ar');

  const dailyAtLimit  = limits ? limits.used >= limits.limit : false;
  const activeAtLimit = limits ? limits.activeUsed >= limits.activeLimit : false;

  return (
    <>
      {/* ── Stats row ── */}
      {stats && (
        <div className="flex gap-4 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
          <span className="text-sm">{(stats.totalPoints ?? 0)} {t('predictions.pointsShort')}</span>
          <span className="text-sm">{(stats.accuracyRate ?? 0).toFixed(0)}% {t('predictions.accuracy')}</span>
          <span className="text-sm">{stats.correctPredictions ?? 0} / {stats.totalPredictions ?? 0}</span>
        </div>
      )}

      {/* ── Limits bar ── */}
      {limits && (
        <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] space-y-3">
          <div className="flex gap-4">
            <LimitBar
              used={limits.used}
              total={limits.limit}
              label={isAr ? 'اليومي' : 'Daily'}
              icon={Zap}
              colorClass="bg-[var(--brand)]"
            />
            <LimitBar
              used={limits.activeUsed}
              total={limits.activeLimit}
              label={isAr ? 'نشطة الآن' : 'Active now'}
              icon={Target}
              colorClass="bg-emerald-500"
            />
          </div>

          {/* Contextual hint */}
          {(dailyAtLimit || activeAtLimit) ? (
            <p className="text-[11px] flex items-center gap-1.5 text-amber-400">
              <Clock className="w-3 h-3 shrink-0" />
              {dailyAtLimit && !activeAtLimit
                ? isAr
                  ? `وصلت للحد اليومي. يتجدد منتصف الليل بتوقيت القاهرة`
                  : `Daily limit reached. Resets at Cairo midnight`
                : isAr
                  ? `${limits.activeUsed}/${limits.activeLimit} توقع نشط. انتظر انتهاء بعضها لإضافة المزيد`
                  : `${limits.activeUsed}/${limits.activeLimit} active. Wait for some to expire to add more`
              }
            </p>
          ) : (
            <p className="text-[11px] text-[var(--text-muted)]">
              {isAr
                ? `يتبقى ${limits.limit - limits.used} توقع اليوم · ${limits.activeLimit - limits.activeUsed} مكان نشط متاح`
                : `${limits.limit - limits.used} predictions left today · ${limits.activeLimit - limits.activeUsed} active slots free`
              }
            </p>
          )}
        </div>
      )}

      {/* ── Status filter ── */}
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
            {s === 'HIT'     ? t('predictions.hitBadge')
             : s === 'MISSED'  ? t('predictions.missedBadge')
             : s === 'EXPIRED' ? t('predictions.expiredBadge')
             : t('predictions.statusActive')}
          </button>
        ))}
      </div>

      {/* ── Predictions list ── */}
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

      {/* ── FAB ── */}
      <div className="fixed bottom-20 end-6 z-40 flex flex-col items-end gap-1">
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
