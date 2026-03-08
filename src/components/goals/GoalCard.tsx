import React from 'react';
import { MoreVertical, Check, Home, Car, Umbrella, TrendingUp, Compass, Target } from 'lucide-react';
import type { GoalRecord } from '../../hooks/useGoals';
import { formatMoney, formatDeadline, formatTimeLeft, getProgressColor } from './goalsUtils';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  car: Car,
  retirement: Umbrella,
  wealth: TrendingUp,
  travel: Compass,
  other: Target,
};

export interface GoalCardProps {
  goal: GoalRecord;
  t: (key: string, opts?: object) => string;
  locale: string;
  completed?: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onUpdateAmount: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMarkComplete: () => void;
}

export function GoalCard({
  goal,
  t,
  locale,
  completed = false,
  menuOpen,
  onMenuToggle,
  onUpdateAmount,
  onEdit,
  onDelete,
  onMarkComplete,
}: GoalCardProps) {
  const percent =
    goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const CategoryIcon = CATEGORY_ICONS[goal.category] ?? Target;

  return (
    <div
      className={`rounded-xl border p-4 ${
        completed
          ? 'border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)]'
          : 'border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <CategoryIcon className="w-5 h-5 text-[var(--brand)] shrink-0" />
          <span className="font-semibold truncate">{goal.title}</span>
        </div>
        {!completed && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={onMenuToggle}
              className="p-1 rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)]"
              aria-label="Menu"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" aria-hidden onClick={onMenuToggle} />
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-xl z-20 py-1">
                  <button
                    type="button"
                    onClick={onUpdateAmount}
                    className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                  >
                    {t('goals.menuUpdateAmount')}
                  </button>
                  <button
                    type="button"
                    onClick={onEdit}
                    className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                  >
                    {t('goals.menuEdit')}
                  </button>
                  <button
                    type="button"
                    onClick={onMarkComplete}
                    className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                  >
                    {t('goals.menuMarkComplete')}
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="w-full text-left px-3 py-2 text-sm text-[var(--danger)] hover:bg-[var(--bg-card-hover)]"
                  >
                    {t('goals.menuDelete')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {completed && (
          <span className="flex items-center gap-1 text-label font-medium text-[var(--success)] bg-[var(--success-bg)] px-2 py-1 rounded-full">
            <Check className="w-3 h-3" />
            {t('goals.completedBadge')}
          </span>
        )}
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">{t('goals.targetAmount')}:</span>
          <span>
            {formatMoney(goal.targetAmount, locale)} {t('goals.currency')}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">{t('goals.saved')}:</span>
          <span>
            {formatMoney(goal.currentAmount, locale)} {t('goals.currency')}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1">
          <span />
          <span className="font-medium">{percent.toFixed(0)}%</span>
        </div>
        <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
          <div
            className={`h-full w-progress transition-all duration-500 ${getProgressColor(percent)}`}
            style={{ ['--progress-width']: `${Math.min(100, percent)}%` } as React.CSSProperties}
          />
        </div>
      </div>

      <div className="mt-3 space-y-1 text-label text-[var(--text-muted)]">
        <div className="flex justify-between">
          <span>{t('goals.remaining')}:</span>
          <span>
            {formatMoney(remaining, locale)} {t('goals.currency')}
          </span>
        </div>
        <div className="flex justify-between">
          <span>{t('goals.deadline')}:</span>
          <span>{formatDeadline(goal.deadline, locale)}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('goals.timeLeft')}:</span>
          <span>{formatTimeLeft(goal.deadline, t, locale)}</span>
        </div>
      </div>
    </div>
  );
}
