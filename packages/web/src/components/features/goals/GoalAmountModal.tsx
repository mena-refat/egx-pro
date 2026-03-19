import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import type { GoalRecord } from '../../../hooks/useGoals';
import { formatMoney, formatWithCommas } from './goalsUtils';

export interface GoalAmountModalProps {
  open: boolean;
  goal: GoalRecord | null;
  onClose: () => void;
  onSaved: () => void;
  accessToken: string | null;
  t: (key: string, opts?: object) => string;
  locale: string;
}

export function GoalAmountModal({
  open,
  goal,
  onClose,
  onSaved,
  accessToken,
  t,
  locale,
}: GoalAmountModalProps) {
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
          <h3 className="text-header font-bold text-[var(--text-primary)]">
            {t('goals.updateAmountTitle')}
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)]"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-body text-[var(--text-muted)] mb-1">
              {t('goals.currentAmount')}
            </label>
            <p className="text-[var(--text-primary)] font-medium">
              {formatMoney(goal.currentAmount, locale)} {t('goals.currency')}
            </p>
          </div>
          <Input
            label={t('goals.newAmount')}
            type="text"
            inputMode="numeric"
            value={formatWithCommas(value)}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
            aria-required="true"
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {t('goals.cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={submitting} className="flex-1">
              {submitting ? t('common.loading') : t('goals.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
