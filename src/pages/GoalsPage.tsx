import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import {
  Target,
  Plus,
  MoreVertical,
  Home,
  Car,
  Umbrella,
  TrendingUp,
  Compass,
  X,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Skeleton } from '../components/ui/Skeleton';

export interface GoalRecord {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline: string | null;
  category: string;
  status: string;
  achievedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { id: 'home', icon: Home },
  { id: 'car', icon: Car },
  { id: 'retirement', icon: Umbrella },
  { id: 'wealth', icon: TrendingUp },
  { id: 'travel', icon: Compass },
  { id: 'other', icon: Target },
] as const;

function formatMoney(n: number, locale: string): string {
  return n.toLocaleString(locale, { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

/** Format digits string with comma every 3 digits for display while typing (e.g. "500000" → "500,000") */
function formatWithCommas(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits === '') return '';
  return Number(digits).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function getProgressColor(percent: number): string {
  if (percent >= 100) return 'bg-emerald-500';
  if (percent >= 61) return 'bg-blue-500';
  if (percent >= 31) return 'bg-amber-500';
  return 'bg-rose-500';
}

function formatTimeLeft(deadline: string | null, t: (key: string, opts?: object) => string, locale: string): string {
  if (!deadline) return '—';
  const end = new Date(deadline);
  const now = new Date();
  if (end.getTime() <= now.getTime()) return t('goals.daysLeft', { d: 0 });
  const months = Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  const days = Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (months >= 12) {
    const y = Math.floor(months / 12);
    const m = months % 12;
    const yearKey = y === 1 ? 'goals.yearOne' : 'goals.yearMany';
    return `${y} ${t(yearKey)} ${t('goals.andMonths', { m })}`;
  }
  if (months >= 1) return t('goals.monthsLeft', { m: months });
  return t('goals.daysLeft', { d: days });
}

function formatDeadline(deadline: string | null, locale: string): string {
  if (!deadline) return '—';
  return new Date(deadline).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export default function GoalsPage({ currentWealth = 0 }: { currentWealth?: number }) {
  const { t, i18n } = useTranslation('common');
  const { accessToken } = useAuthStore();
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  const [amountModalOpen, setAmountModalOpen] = useState(false);
  const [amountGoal, setAmountGoal] = useState<GoalRecord | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/goals', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setGoals(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
    } catch {
      setError(t('goals.errorAdd'));
    } finally {
      setLoading(false);
    }
  }, [accessToken, t]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const activeGoals = goals.filter((g) => g.status !== 'completed');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton height={40} className="w-full max-w-md" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3">
              <Skeleton height={20} className="w-3/4" />
              <Skeleton height={28} className="w-1/2" />
              <Skeleton height={16} className="w-full" />
              <Skeleton height={16} className="w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio value - always show when we have a value so goals stay in sync */}
      {currentWealth > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3">
          <p className="text-sm text-slate-400">
            {t('goals.portfolioAvailable')}: <span className="font-semibold text-slate-200">{formatMoney(currentWealth, i18n.language)} ج.م</span>
          </p>
        </div>
      )}

      {/* Header when there are goals */}
      {goals.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">{t('goals.title')}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {activeGoals.length} {t('goals.activeCount')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('goals.addNew')}
          </button>
        </div>
      )}

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="card-base p-10 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
          <Target className="w-16 h-16 text-violet-500 mb-4" />
          <h3 className="text-xl font-bold text-slate-100 mb-2">{t('goals.emptyTitle')}</h3>
          <p className="text-slate-400 text-sm mb-6">{t('goals.emptyDesc')}</p>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('goals.addFirst')}
          </button>
        </div>
      )}

      {/* Active goal cards */}
      {activeGoals.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              t={t as (key: string, opts?: object) => string}
              locale={i18n.language}
              menuOpen={menuOpenId === goal.id}
              onMenuToggle={() => setMenuOpenId(menuOpenId === goal.id ? null : goal.id)}
              onUpdateAmount={() => {
                setAmountGoal(goal);
                setAmountModalOpen(true);
                setMenuOpenId(null);
              }}
              onEdit={() => {
                setEditGoalId(goal.id);
                setEditModalOpen(true);
                setMenuOpenId(null);
              }}
              onDelete={async () => {
                if (!window.confirm(t('goals.deleteConfirm'))) return;
                try {
                  await fetch(`/api/goals/${goal.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${accessToken}` },
                  });
                  fetchGoals();
                } catch {
                  setError(t('goals.errorDelete'));
                }
                setMenuOpenId(null);
              }}
              onMarkComplete={async () => {
                try {
                  await fetch(`/api/goals/${goal.id}/complete`, {
                    method: 'PATCH',
                    headers: { Authorization: `Bearer ${accessToken}` },
                  });
                  fetchGoals();
                } catch {
                  setError(t('goals.errorAdd'));
                }
                setMenuOpenId(null);
              }}
            />
          ))}
        </div>
      )}

      {/* Add goal button when we have goals but no header button visible on mobile */}
      {activeGoals.length > 0 && (
        <div className="flex justify-center lg:hidden">
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('goals.addNew')}
          </button>
        </div>
      )}

      {/* Completed section */}
      {completedGoals.length > 0 && (
        <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-800/30">
          <button
            type="button"
            onClick={() => setCompletedOpen(!completedOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-slate-300 hover:bg-slate-800/50 transition-colors"
          >
            <span className="font-medium">
              {t('goals.completedSection')} ({completedGoals.length})
            </span>
            {completedOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          <AnimatePresence>
            {completedOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-slate-700"
              >
                <div className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {completedGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      t={t as (key: string, opts?: object) => string}
                      locale={i18n.language}
                      completed
                      menuOpen={false}
                      onMenuToggle={() => {}}
                      onUpdateAmount={() => {}}
                      onEdit={() => {}}
                      onDelete={async () => {}}
                      onMarkComplete={async () => {}}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>
      )}

      {/* Add goal modal */}
      <AddEditGoalModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSaved={() => {
          setAddModalOpen(false);
          fetchGoals();
        }}
        accessToken={accessToken}
        t={t as (key: string, opts?: object) => string}
        mode="add"
      />

      {/* Edit goal modal */}
      <AddEditGoalModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditGoalId(null);
        }}
        onSaved={() => {
          setEditModalOpen(false);
          setEditGoalId(null);
          fetchGoals();
        }}
        accessToken={accessToken}
        t={t as (key: string, opts?: object) => string}
        mode="edit"
        goalId={editGoalId}
        initialGoal={editGoalId ? goals.find((g) => g.id === editGoalId) ?? undefined : undefined}
      />

      {/* Update amount modal */}
      <UpdateAmountModal
        open={amountModalOpen}
        goal={amountGoal}
        onClose={() => {
          setAmountModalOpen(false);
          setAmountGoal(null);
        }}
        onSaved={() => {
          setAmountModalOpen(false);
          setAmountGoal(null);
          fetchGoals();
        }}
        accessToken={accessToken}
        t={t as (key: string, opts?: object) => string}
        locale={i18n.language}
      />
    </div>
  );
}

function GoalCard({
  goal,
  t,
  locale,
  completed,
  menuOpen,
  onMenuToggle,
  onUpdateAmount,
  onEdit,
  onDelete,
  onMarkComplete,
}: {
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
  key?: string;
}) {
  const percent = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const cat = CATEGORIES.find((c) => c.id === goal.category) ?? CATEGORIES[CATEGORIES.length - 1];
  const CategoryIcon = cat.icon;

  return (
    <div
      className={`rounded-xl border p-4 ${
        completed
          ? 'border-slate-600 bg-slate-800/50 text-slate-400'
          : 'border-slate-700 bg-slate-800/50 text-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <CategoryIcon className="w-5 h-5 text-violet-400 shrink-0" />
          <span className="font-semibold truncate">{goal.title}</span>
        </div>
        {!completed && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={onMenuToggle}
              className="p-1 rounded-lg hover:bg-slate-700 text-slate-400"
              aria-label="Menu"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" aria-hidden onClick={onMenuToggle} />
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-slate-700 bg-slate-900 shadow-xl z-20 py-1">
                  <button
                    type="button"
                    onClick={onUpdateAmount}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    {t('goals.menuUpdateAmount')}
                  </button>
                  <button
                    type="button"
                    onClick={onEdit}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    {t('goals.menuEdit')}
                  </button>
                  <button
                    type="button"
                    onClick={onMarkComplete}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    {t('goals.menuMarkComplete')}
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-800"
                  >
                    {t('goals.menuDelete')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {completed && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">
            <Check className="w-3 h-3" />
            {t('goals.completedBadge')}
          </span>
        )}
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">{t('goals.targetAmount')}:</span>
          <span>{formatMoney(goal.targetAmount, locale)} {t('goals.currency')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">{t('goals.saved')}:</span>
          <span>{formatMoney(goal.currentAmount, locale)} {t('goals.currency')}</span>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1">
          <span />
          <span className="font-medium">{percent.toFixed(0)}%</span>
        </div>
        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${getProgressColor(percent)}`}
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>
      </div>

      <div className="mt-3 space-y-1 text-xs text-slate-500">
        <div className="flex justify-between">
          <span>{t('goals.remaining')}:</span>
          <span>{formatMoney(remaining, locale)} {t('goals.currency')}</span>
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

function AddEditGoalModal({
  open,
  onClose,
  onSaved,
  accessToken,
  t,
  mode,
  goalId,
  initialGoal,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  accessToken: string | null;
  t: (key: string, opts?: object) => string;
  mode: 'add' | 'edit';
  goalId?: string | null;
  initialGoal?: GoalRecord;
}) {
  const [title, setTitle] = useState(initialGoal?.title ?? '');
  const [category, setCategory] = useState(initialGoal?.category ?? 'home');
  const [targetAmount, setTargetAmount] = useState(initialGoal?.targetAmount?.toString() ?? '');
  const [currentAmount, setCurrentAmount] = useState(initialGoal?.currentAmount?.toString() ?? '');
  const [deadline, setDeadline] = useState(
    initialGoal?.deadline ? new Date(initialGoal.deadline).toISOString().slice(0, 10) : ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showGoalsLimitModal, setShowGoalsLimitModal] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initialGoal?.title ?? '');
      setCategory(initialGoal?.category ?? 'home');
      setTargetAmount(initialGoal?.targetAmount?.toString() ?? '');
      setCurrentAmount(initialGoal?.currentAmount?.toString() ?? '');
      setDeadline(initialGoal?.deadline ? new Date(initialGoal.deadline).toISOString().slice(0, 10) : '');
      setErr(null);
    }
  }, [open, initialGoal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const target = parseFloat(targetAmount);
    const current = parseFloat(currentAmount) || 0;
    if (!title || title.trim().length < 3) {
      setErr(t('goals.validationName'));
      return;
    }
    if (!target || target <= 0) {
      setErr(t('goals.validationAmount'));
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'add') {
        const payload = {
          title: String(title).trim(),
          category: category && CATEGORIES.some((c) => c.id === category) ? category : 'home',
          targetAmount: Number(target),
          currentAmount: Number(current) || 0,
          currency: 'EGP',
          deadline: deadline && String(deadline).trim() ? String(deadline).trim() : null,
        };
        const res = await fetch('/api/goals', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 403 && data.code === 'GOALS_LIMIT') {
            setShowGoalsLimitModal(true);
            setSubmitting(false);
            return;
          }
          throw new Error(data.error || 'Failed');
        }
      } else if (goalId) {
        const res = await fetch(`/api/goals/${goalId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: title.trim(),
            category: category && CATEGORIES.some((c) => c.id === category) ? category : 'home',
            targetAmount: target,
            currentAmount: current,
            deadline: deadline && String(deadline).trim() ? String(deadline).trim() : null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed');
        }
      }
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('profile-completion-changed'));
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('goals.errorAdd'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const targetNum = parseFloat(targetAmount);
  const canSubmit =
    title.trim().length >= 3 &&
    (category && CATEGORIES.some((c) => c.id === category)) &&
    Number.isFinite(targetNum) &&
    targetNum > 0;
  const addButtonDisabled = mode === 'add' ? !canSubmit : false;

  const categoryLabel = (id: string) => {
    const map: Record<string, string> = {
      home: t('goals.categoryHome'),
      car: t('goals.categoryCar'),
      retirement: t('goals.categoryRetirement'),
      wealth: t('goals.categoryWealth'),
      travel: t('goals.categoryTravel'),
      other: t('goals.categoryOther'),
    };
    return map[id] ?? t('goals.categoryOther');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-100">
            {mode === 'add' ? t('goals.newGoalTitle') : t('goals.editGoalTitle')}
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{t('goals.name')} *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('goals.namePlaceholder')}
              className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{t('goals.category')} *</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-sm transition-colors ${
                      category === c.id
                        ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                        : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {categoryLabel(c.id)}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{t('goals.targetAmountLabel')} *</label>
            <input
              type="text"
              inputMode="numeric"
              value={formatWithCommas(targetAmount)}
              onChange={(e) => setTargetAmount(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{t('goals.currentAmountLabel')}</label>
            <input
              type="text"
              inputMode="numeric"
              value={formatWithCommas(currentAmount)}
              onChange={(e) => setCurrentAmount(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{t('goals.deadlineLabel')}</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 focus:ring-2 focus:ring-violet-500"
            />
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              {t('goals.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || addButtonDisabled}
              className="flex-1 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium disabled:opacity-50"
            >
              {submitting ? t('common.loading') : mode === 'add' ? t('goals.addGoal') : t('goals.save')}
            </button>
          </div>
        </form>
      </div>
      {showGoalsLimitModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" onClick={() => setShowGoalsLimitModal(false)}>
          <div className="bg-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-6 text-center border border-slate-700" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-slate-300 mb-6">{t('plan.goalsLimitMessage')}</p>
            <div className="flex gap-2 justify-center">
              <button type="button" onClick={() => { setShowGoalsLimitModal(false); onClose(); window.dispatchEvent(new CustomEvent('navigate-to-subscription')); }} className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-sm">{t('plan.subscribeNow')}</button>
              <button type="button" onClick={() => setShowGoalsLimitModal(false)} className="px-4 py-2.5 border border-slate-600 rounded-xl font-medium text-sm text-slate-300">{t('plan.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UpdateAmountModal({
  open,
  goal,
  onClose,
  onSaved,
  accessToken,
  t,
  locale,
}: {
  open: boolean;
  goal: GoalRecord | null;
  onClose: () => void;
  onSaved: () => void;
  accessToken: string | null;
  t: (key: string, opts?: object) => string;
  locale: string;
}) {
  const [value, setValue] = useState(goal?.currentAmount?.toString() ?? '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && goal) setValue(goal.currentAmount.toString());
  }, [open, goal]);

  if (!open || !goal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(value);
    if (Number.isNaN(num) || num < 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/goals/${goal.id}/amount`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentAmount: num }),
      });
      if (!res.ok) throw new Error('Failed');
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-100">{t('goals.updateAmountTitle')}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-500 mb-1">{t('goals.currentAmount')}</label>
            <p className="text-slate-200 font-medium">{formatMoney(goal.currentAmount, locale)} {t('goals.currency')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{t('goals.newAmount')}</label>
            <input
              type="text"
              inputMode="numeric"
              value={formatWithCommas(value)}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              {t('goals.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium disabled:opacity-50"
            >
              {submitting ? t('common.loading') : t('goals.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
