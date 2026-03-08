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
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/shared/EmptyState';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

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
  if (percent >= 100) return 'bg-[var(--success)]';
  if (percent >= 61) return 'bg-[var(--brand)]';
  if (percent >= 31) return 'bg-[var(--warning)]';
  return 'bg-[var(--danger)]';
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

  const fetchGoals = useCallback(async (signal?: AbortSignal) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/goals', { headers: { Authorization: `Bearer ${accessToken}` }, signal });
      if (signal?.aborted) return;
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (!signal?.aborted) setGoals(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof Error && (err.name === 'AbortError' || err.message?.includes('abort'))) return;
      setError(t('goals.errorAdd'));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [accessToken, t]);

  useEffect(() => {
    const controller = new AbortController();
    fetchGoals(controller.signal);
    return () => controller.abort();
  }, [fetchGoals]);

  const activeGoals = goals.filter((g) => g.status !== 'completed');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  const openAddModal = useCallback(() => setAddModalOpen(true), []);
  const closeAddModal = useCallback(() => setAddModalOpen(false), []);
  const onSavedAdd = useCallback(() => {
    setAddModalOpen(false);
    fetchGoals();
  }, [fetchGoals]);
  const closeEditModal = useCallback(() => {
    setEditModalOpen(false);
    setEditGoalId(null);
  }, []);
  const onSavedEdit = useCallback(() => {
    setEditModalOpen(false);
    setEditGoalId(null);
    fetchGoals();
  }, [fetchGoals]);
  const closeAmountModal = useCallback(() => {
    setAmountModalOpen(false);
    setAmountGoal(null);
  }, []);
  const onSavedAmount = useCallback(() => {
    setAmountModalOpen(false);
    setAmountGoal(null);
    fetchGoals();
  }, [fetchGoals]);
  const toggleCompletedOpen = useCallback(() => setCompletedOpen((c) => !c), []);
  const setMenuOpenIdFor = useCallback((id: string) => setMenuOpenId((prev) => (prev === id ? null : id)), []);
  const openAmountFor = useCallback((goal: GoalRecord) => {
    setAmountGoal(goal);
    setAmountModalOpen(true);
    setMenuOpenId(null);
  }, []);
  const openEditFor = useCallback((id: string) => {
    setEditGoalId(id);
    setEditModalOpen(true);
    setMenuOpenId(null);
  }, []);
  const deleteGoal = useCallback(
    async (id: string) => {
      if (!window.confirm(t('goals.deleteConfirm'))) return;
      try {
        await fetch(`/api/goals/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        fetchGoals();
      } catch {
        setError(t('goals.errorDelete'));
      }
      setMenuOpenId(null);
    },
    [accessToken, t, fetchGoals]
  );
  const markComplete = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/goals/${id}/complete`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        fetchGoals();
      } catch {
        setError(t('goals.errorAdd'));
      }
      setMenuOpenId(null);
    },
    [accessToken, fetchGoals]
  );
  const noop = useCallback(() => {}, []);
  const noopAsync = useCallback(async () => {}, []);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <React.Fragment key={i}>
            <Skeleton height={112} className="w-full rounded-xl" />
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio value - always show when we have a value so goals stay in sync */}
      {currentWealth > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
          <p className="text-body text-[var(--text-secondary)]">
            {t('goals.portfolioAvailable')}: <span className="font-semibold text-[var(--text-primary)]">{formatMoney(currentWealth, i18n.language)} ج.م</span>
          </p>
        </div>
      )}

      {/* Header when there are goals */}
      {goals.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-title font-bold text-[var(--text-primary)]">{t('goals.title')}</h2>
            <p className="text-body text-[var(--text-muted)] mt-0.5">
              {activeGoals.length} {t('goals.activeCount')}
            </p>
          </div>
          <Button type="button" onClick={openAddModal} className="flex items-center gap-2" variant="primary">
            <Plus className="w-4 h-4" />
            {t('goals.addNew')}
          </Button>
        </div>
      )}

      {/* Empty state */}
      {goals.length === 0 && !loading && (
        <EmptyState
          icon={Target}
          title={t('goals.emptyTitle')}
          description={t('goals.emptyDescription')}
          actionLabel={t('goals.addFirst')}
          onAction={openAddModal}
        />
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
              onMenuToggle={() => setMenuOpenIdFor(goal.id)}
              onUpdateAmount={() => openAmountFor(goal)}
              onEdit={() => openEditFor(goal.id)}
              onDelete={() => deleteGoal(goal.id)}
              onMarkComplete={() => markComplete(goal.id)}
            />
          ))}
        </div>
      )}

      {/* Add goal button when we have goals but no header button visible on mobile */}
      {activeGoals.length > 0 && (
        <div className="flex justify-center lg:hidden">
          <Button type="button" onClick={openAddModal} variant="primary" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t('goals.addNew')}
          </Button>
        </div>
      )}

      {/* Completed section */}
      {completedGoals.length > 0 && (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-secondary)]">
          <Button
            type="button"
            variant="ghost"
            onClick={toggleCompletedOpen}
            className="w-full flex items-center justify-between px-4 py-3 text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <span className="font-medium">
              {t('goals.completedSection')} ({completedGoals.length})
            </span>
            {completedOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </Button>
          <AnimatePresence>
            {completedOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-[var(--border)]"
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
                      onMenuToggle={noop}
                      onUpdateAmount={noop}
                      onEdit={noop}
                      onDelete={noopAsync}
                      onMarkComplete={noopAsync}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {error && (
        <p className="text-body text-[var(--danger)] bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-lg p-3">{error}</p>
      )}

      {/* Add goal modal */}
      <AddEditGoalModal
        open={addModalOpen}
        onClose={closeAddModal}
        onSaved={onSavedAdd}
        accessToken={accessToken}
        t={t as (key: string, opts?: object) => string}
        mode="add"
      />

      {/* Edit goal modal */}
      <AddEditGoalModal
        open={editModalOpen}
        onClose={closeEditModal}
        onSaved={onSavedEdit}
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
        onClose={closeAmountModal}
        onSaved={onSavedAmount}
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
          <span>{formatMoney(goal.targetAmount, locale)} {t('goals.currency')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">{t('goals.saved')}:</span>
          <span>{formatMoney(goal.currentAmount, locale)} {t('goals.currency')}</span>
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
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-header font-bold text-[var(--text-primary)]">
            {mode === 'add' ? t('goals.newGoalTitle') : t('goals.editGoalTitle')}
          </h3>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)]">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={`${t('goals.name')} *`}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('goals.namePlaceholder')}
          />
          <div>
            <label className="block text-body font-medium text-[var(--text-secondary)] mb-2">{t('goals.category')} *</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                return (
                  <React.Fragment key={c.id}>
                    <Button
                      type="button"
                      variant={category === c.id ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setCategory(c.id)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg text-sm"
                    >
                      <Icon className="w-5 h-5" />
                      {categoryLabel(c.id)}
                    </Button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          <Input
            label={`${t('goals.targetAmountLabel')} *`}
            type="text"
            inputMode="numeric"
            value={formatWithCommas(targetAmount)}
            onChange={(e) => setTargetAmount(e.target.value.replace(/\D/g, ''))}
          />
          <Input
            label={t('goals.currentAmountLabel')}
            type="text"
            inputMode="numeric"
            value={formatWithCommas(currentAmount)}
            onChange={(e) => setCurrentAmount(e.target.value.replace(/\D/g, ''))}
          />
          <Input
            label={t('goals.deadlineLabel')}
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
          {err && <p className="text-body text-[var(--danger)]">{err}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {t('goals.cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={submitting || addButtonDisabled} className="flex-1">
              {submitting ? t('common.loading') : mode === 'add' ? t('goals.addGoal') : t('goals.save')}
            </Button>
          </div>
        </form>
      </div>
      {showGoalsLimitModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" onClick={() => setShowGoalsLimitModal(false)}>
          <div className="bg-[var(--bg-card)] rounded-2xl shadow-xl max-w-sm w-full p-6 text-center border border-[var(--border)]" onClick={(e) => e.stopPropagation()}>
            <p className="text-body text-[var(--text-secondary)] mb-6">{t('plan.goalsLimitMessage')}</p>
            <div className="flex gap-2 justify-center">
              <Button type="button" variant="primary" onClick={() => { setShowGoalsLimitModal(false); onClose(); window.dispatchEvent(new CustomEvent('navigate-to-subscription')); }}>{t('plan.subscribeNow')}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowGoalsLimitModal(false)}>{t('plan.cancel')}</Button>
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
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-header font-bold text-[var(--text-primary)]">{t('goals.updateAmountTitle')}</h3>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)]">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-body text-[var(--text-muted)] mb-1">{t('goals.currentAmount')}</label>
            <p className="text-[var(--text-primary)] font-medium">{formatMoney(goal.currentAmount, locale)} {t('goals.currency')}</p>
          </div>
          <Input
            label={t('goals.newAmount')}
            type="text"
            inputMode="numeric"
            value={formatWithCommas(value)}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">{t('goals.cancel')}</Button>
            <Button type="submit" variant="primary" disabled={submitting} className="flex-1">{submitting ? t('common.loading') : t('goals.save')}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
