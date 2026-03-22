import React from 'react';
import { GoalCard } from './GoalCard';
import type { GoalRecord } from '../../../hooks/useGoals';
import type { TFunction } from 'i18next';

type Props = {
  goals: GoalRecord[];
  locale: string;
  t: TFunction;
  menuOpenId: string | null;
  onMenuToggle: (id: string) => void;
  onUpdateAmount: (goal: GoalRecord) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMarkComplete: (id: string) => void;
  onAdd: () => void;
  isAr?: boolean;
};

export function GoalsActiveList({
  goals, locale, t, menuOpenId, onMenuToggle,
  onUpdateAmount, onEdit, onDelete, onMarkComplete, onAdd, isAr = false,
}: Props) {
  if (goals.length === 0) return null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            t={t as (key: string, opts?: object) => string}
            locale={locale}
            menuOpen={menuOpenId === goal.id}
            onMenuToggle={() => onMenuToggle(goal.id)}
            onUpdateAmount={() => onUpdateAmount(goal)}
            onEdit={() => onEdit(goal.id)}
            onDelete={() => onDelete(goal.id)}
            onMarkComplete={() => onMarkComplete(goal.id)}
            isAr={isAr}
          />
        ))}
      </div>
    </>
  );
}
