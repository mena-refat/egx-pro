import React from 'react';
import { useTranslation } from 'react-i18next';
import { Target } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/shared/EmptyState';
import { GoalFormModal } from '../components/features/goals/GoalFormModal';
import { GoalAmountModal } from '../components/features/goals/GoalAmountModal';
import {
  GoalsWealthBanner,
  GoalsToolbar,
  GoalsActiveList,
  GoalsCompletedSection,
} from '../components/features/goals';
import { useGoalsPage } from '../hooks/useGoalsPage';

export type { GoalRecord } from '../hooks/useGoals';

export default function GoalsPage({ currentWealth = 0 }: { currentWealth?: number }) {
  const { t, i18n } = useTranslation('common');
  const {
    goalsData,
    addModalOpen,
    editModalOpen,
    editGoalId,
    amountModalOpen,
    amountGoal,
    menuOpenId,
    completedOpen,
    accessToken,
    openAddModal,
    closeAddModal,
    onSavedAdd,
    closeEditModal,
    onSavedEdit,
    closeAmountModal,
    onSavedAmount,
    toggleCompletedOpen,
    setMenuOpenIdFor,
    openAmountFor,
    openEditFor,
    deleteGoal,
    markComplete,
  } = useGoalsPage();

  if (goalsData.loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={112} className="w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const locale = i18n.language;

  return (
    <div className="space-y-6">
      <GoalsWealthBanner currentWealth={currentWealth} locale={locale} />

      {goalsData.goals.length > 0 && (
        <GoalsToolbar activeCount={goalsData.activeGoals.length} onAdd={openAddModal} />
      )}

      {goalsData.goals.length === 0 && (
        <EmptyState
          icon={Target}
          title={t('goals.emptyTitle')}
          description={t('goals.emptyDescription')}
          actionLabel={t('goals.addFirst')}
          onAction={openAddModal}
        />
      )}

      <GoalsActiveList
        goals={goalsData.activeGoals}
        locale={locale}
        t={t}
        menuOpenId={menuOpenId}
        onMenuToggle={setMenuOpenIdFor}
        onUpdateAmount={openAmountFor}
        onEdit={openEditFor}
        onDelete={deleteGoal}
        onMarkComplete={markComplete}
        onAdd={openAddModal}
      />

      <GoalsCompletedSection
        goals={goalsData.completedGoals}
        expanded={completedOpen}
        onToggle={toggleCompletedOpen}
        locale={locale}
        t={t as (key: string, opts?: object) => string}
      />

      {goalsData.error && (
        <p className="text-body text-[var(--danger)] bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-lg p-3">
          {goalsData.error}
        </p>
      )}

      <GoalFormModal
        open={addModalOpen}
        onClose={closeAddModal}
        onSaved={onSavedAdd}
        accessToken={accessToken}
        t={t as (key: string, opts?: object) => string}
        mode="add"
      />
      <GoalFormModal
        open={editModalOpen}
        onClose={closeEditModal}
        onSaved={onSavedEdit}
        accessToken={accessToken}
        t={t as (key: string, opts?: object) => string}
        mode="edit"
        goalId={editGoalId}
        initialGoal={editGoalId ? goalsData.goals.find((g) => g.id === editGoalId) ?? undefined : undefined}
      />
      <GoalAmountModal
        open={amountModalOpen}
        goal={amountGoal}
        onClose={closeAmountModal}
        onSaved={onSavedAmount}
        accessToken={accessToken}
        t={t as (key: string, opts?: object) => string}
        locale={locale}
      />
    </div>
  );
}
