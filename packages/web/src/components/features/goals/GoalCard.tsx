import React, { memo } from 'react';
import { motion } from 'framer-motion';
import {
  MoreVertical, Check, Home, Car, Umbrella, TrendingUp, Compass, Target,
  Flame, AlertTriangle, CheckCircle2, Plus, Calendar, Wallet,
} from 'lucide-react';
import type { GoalRecord } from '../../../hooks/useGoals';
import {
  formatMoney, formatDeadline, formatTimeLeft,
  getGoalHealth, getMonthlyNeeded,
  type GoalHealth,
} from './goalsUtils';

// ── Constants ────────────────────────────────────────────────────────────────
const RING_R    = 38;
const RING_CIRC = 2 * Math.PI * RING_R; // ≈ 238.76

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home, car: Car, retirement: Umbrella,
  wealth: TrendingUp, travel: Compass, other: Target,
};

const HEALTH_CONFIG: Record<GoalHealth, {
  label: string; labelAr: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string; ring: string; monthly: string;
}> = {
  'on-track': {
    label: 'On Track', labelAr: 'في الموعد',
    icon: CheckCircle2,
    badge:   'bg-emerald-400/12 text-emerald-400 border-emerald-400/25',
    ring:    '#34d399',
    monthly: 'bg-emerald-400/8 border-emerald-400/20 text-emerald-400',
  },
  behind: {
    label: 'Behind', labelAr: 'متأخر شوية',
    icon: AlertTriangle,
    badge:   'bg-amber-400/12 text-amber-400 border-amber-400/25',
    ring:    '#fbbf24',
    monthly: 'bg-amber-400/8 border-amber-400/20 text-amber-400',
  },
  critical: {
    label: 'Critical', labelAr: 'حرج',
    icon: Flame,
    badge:   'bg-red-400/12 text-red-400 border-red-400/25',
    ring:    '#f87171',
    monthly: 'bg-red-400/8 border-red-400/20 text-red-400',
  },
};

// ── Ring SVG ─────────────────────────────────────────────────────────────────
function RingProgress({
  percent, color, icon: Icon,
}: { percent: number; color: string; icon: React.ComponentType<{ className?: string }> }) {
  const clamped  = Math.min(100, Math.max(0, percent));
  const dashOff  = RING_CIRC * (1 - clamped / 100);

  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        {/* Track */}
        <circle
          cx="50" cy="50" r={RING_R}
          fill="none" stroke="var(--border)" strokeWidth="9"
        />
        {/* Progress arc */}
        <motion.circle
          cx="50" cy="50" r={RING_R}
          fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={RING_CIRC}
          initial={{ strokeDashoffset: RING_CIRC }}
          animate={{ strokeDashoffset: dashOff }}
          transition={{ duration: 1.1, ease: 'easeOut', delay: 0.15 }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-sm font-bold tabular-nums text-[var(--text-primary)] leading-none">
          {Math.round(percent)}%
        </span>
      </div>
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
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
  isAr?: boolean;
}

export const GoalCard = memo(function GoalCard({
  goal, t, locale, completed = false,
  menuOpen, onMenuToggle, onUpdateAmount, onEdit, onDelete, onMarkComplete,
  isAr = false,
}: GoalCardProps) {
  const percent       = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
  const remaining     = Math.max(0, goal.targetAmount - goal.currentAmount);
  const CategoryIcon  = CATEGORY_ICONS[goal.category] ?? Target;
  const health        = completed ? null : getGoalHealth(percent, goal.deadline, goal.createdAt);
  const monthlyNeeded = completed ? null : getMonthlyNeeded(goal.targetAmount, goal.currentAmount, goal.deadline);
  const hConfig       = health ? HEALTH_CONFIG[health] : null;
  const HealthIcon    = hConfig?.icon;

  // Completed card — compact, greyed
  if (completed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 flex items-center gap-4"
      >
        <div className="relative w-14 h-14 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r={RING_R} fill="none" stroke="var(--border)" strokeWidth="9" />
            <circle cx="50" cy="50" r={RING_R} fill="none" stroke="#34d399" strokeWidth="9"
              strokeLinecap="round" strokeDasharray={RING_CIRC} strokeDashoffset={0} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Check className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--text-muted)] truncate">{goal.title}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatMoney(goal.targetAmount, locale)} {t('goals.currency')}</p>
        </div>
        <span className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">
          <Check className="w-3 h-3" />
          {t('goals.completedBadge')}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden"
    >
      {/* Top accent bar based on health */}
      {hConfig && (
        <div
          className="h-0.5 w-full"
          style={{ background: hConfig.ring }}
        />
      )}

      <div className="p-4 space-y-4">
        {/* Header row: health badge + menu */}
        <div className="flex items-center justify-between gap-2">
          {hConfig && HealthIcon && (
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${hConfig.badge}`}>
              <HealthIcon className="w-3 h-3" />
              {isAr ? hConfig.labelAr : hConfig.label}
            </span>
          )}
          <div className="relative ms-auto shrink-0">
            <button
              type="button"
              onClick={onMenuToggle}
              className="p-1.5 rounded-xl hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] transition-colors"
              aria-label="Menu"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" aria-hidden onClick={onMenuToggle} />
                <div className={`absolute ${isAr ? 'left-0' : 'right-0'} top-full mt-1 w-48 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xl z-20 py-1.5 overflow-hidden`}>
                  {[
                    { label: t('goals.menuUpdateAmount'), action: onUpdateAmount, danger: false },
                    { label: t('goals.menuEdit'),          action: onEdit,          danger: false },
                    { label: t('goals.menuMarkComplete'),  action: onMarkComplete,  danger: false },
                    { label: t('goals.menuDelete'),        action: onDelete,        danger: true  },
                  ].map(({ label, action, danger }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={action}
                      className={`w-full text-start px-3.5 py-2 text-sm transition-colors hover:bg-[var(--bg-card-hover)] ${danger ? 'text-[var(--danger)]' : 'text-[var(--text-secondary)]'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main content: ring + info */}
        <div className="flex items-start gap-4">
          {/* Ring */}
          <RingProgress percent={percent} color={hConfig?.ring ?? '#a78bfa'} icon={CategoryIcon} />

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <p className="font-bold text-[var(--text-primary)] leading-tight line-clamp-2">{goal.title}</p>

            {/* Monthly needed — the revolutionary insight */}
            {hConfig && (
              <div className={`rounded-xl border px-3 py-2 ${hConfig.monthly}`}>
                {monthlyNeeded === null ? (
                  <p className="text-xs font-semibold">⚠️ {t('goals.deadlinePassed', { defaultValue: 'Deadline passed' })}</p>
                ) : monthlyNeeded === 0 ? (
                  <p className="text-xs font-semibold">✅ {t('goals.targetReached', { defaultValue: 'Target reached!' })}</p>
                ) : (
                  <>
                    <p className="text-[10px] font-medium opacity-70 mb-0.5">
                      {isAr ? 'وفّر كل شهر عشان توصل في الموعد' : 'Save monthly to hit your goal'}
                    </p>
                    <p className="text-sm font-bold tabular-nums">
                      {formatMoney(monthlyNeeded, locale)} {t('goals.currency')}/{isAr ? 'شهر' : 'mo'}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <div>
                <p className="text-[var(--text-muted)]">{t('goals.saved')}</p>
                <p className="font-bold text-emerald-400 tabular-nums">{formatMoney(goal.currentAmount, locale)} {t('goals.currency')}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">{t('goals.targetAmount')}</p>
                <p className="font-bold text-[var(--text-primary)] tabular-nums">{formatMoney(goal.targetAmount, locale)} {t('goals.currency')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: deadline + time left */}
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            {formatDeadline(goal.deadline, locale)}
          </span>
          <span className="opacity-40">·</span>
          <span className="flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5 shrink-0" />
            {formatMoney(remaining, locale)} {t('goals.currency')} {t('goals.remaining')}
          </span>
        </div>

        {/* Quick deposit CTA */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onUpdateAmount}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--brand)]/10 hover:bg-[var(--brand)]/18 border border-[var(--brand)]/20 text-[var(--brand)] text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('goals.menuUpdateAmount')}
        </motion.button>
      </div>
    </motion.div>
  );
});
