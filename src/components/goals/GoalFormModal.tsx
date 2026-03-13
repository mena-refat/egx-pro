import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { GoalRecord } from '../../hooks/useGoals';
import { toast } from '../../store/toastStore';
import { GOAL_CATEGORIES } from './goalsUtils';
import { formatWithCommas } from './goalsUtils';

export interface GoalFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  accessToken: string | null;
  t: (key: string, opts?: object) => string;
  mode: 'add' | 'edit';
  goalId?: string | null;
  initialGoal?: GoalRecord;
}

export function GoalFormModal({
  open,
  onClose,
  onSaved,
  accessToken,
  t,
  mode,
  goalId,
  initialGoal,
}: GoalFormModalProps) {
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
      setDeadline(
        initialGoal?.deadline ? new Date(initialGoal.deadline).toISOString().slice(0, 10) : ''
      );
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
          category: category && GOAL_CATEGORIES.some((c) => c.id === category) ? category : 'home',
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
          if (res.status === 403 && data.error === 'GOAL_LIMIT_REACHED') {
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
            category: category && GOAL_CATEGORIES.some((c) => c.id === category) ? category : 'home',
            targetAmount: target,
            currentAmount: current,
            deadline: deadline && String(deadline).trim() ? String(deadline).trim() : null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error || 'Failed');
        }
      }
      if (typeof window !== 'undefined')
        window.dispatchEvent(new CustomEvent('profile-completion-changed'));
      toast.success(mode === 'add' ? t('goals.added', { defaultValue: t('common.success') }) : t('common.success'));
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
    (category && GOAL_CATEGORIES.some((c) => c.id === category)) &&
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

  const handleCloseLimitAndSubscribe = () => {
    setShowGoalsLimitModal(false);
    onClose();
    if (typeof window !== 'undefined')
      window.dispatchEvent(new CustomEvent('navigate-to-subscription'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-header font-bold text-[var(--text-primary)]">
            {mode === 'add' ? t('goals.newGoalTitle') : t('goals.editGoalTitle')}
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label={t('common.close')}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)]"
          >
            <X className="w-5 h-5" aria-hidden />
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
            <label className="block text-body font-medium text-[var(--text-secondary)] mb-2">
              {t('goals.category')} *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {GOAL_CATEGORIES.map((c) => {
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
          {err && <p className="text-body text-[var(--danger)]" role="alert" aria-live="polite">{err}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {t('goals.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || addButtonDisabled}
              className="flex-1"
            >
              {submitting ? t('common.loading') : mode === 'add' ? t('goals.addGoal') : t('goals.save')}
            </Button>
          </div>
        </form>
      </div>
      {showGoalsLimitModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60"
          onClick={() => setShowGoalsLimitModal(false)}
        >
          <div
            className="bg-[var(--bg-card)] rounded-2xl shadow-xl max-w-sm w-full p-6 text-center border border-[var(--border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-body text-[var(--text-secondary)] mb-6">{t('plan.goalsLimitMessage')}</p>
            <div className="flex gap-2 justify-center">
              <Button type="button" variant="primary" onClick={handleCloseLimitAndSubscribe}>
                {t('plan.subscribeNow')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowGoalsLimitModal(false)}>
                {t('plan.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
