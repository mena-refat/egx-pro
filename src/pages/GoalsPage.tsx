import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/shared/EmptyState';
import { Button } from '../components/ui/Button';
import { GoalCard } from '../components/goals/GoalCard';
import { GoalFormModal } from '../components/goals/GoalFormModal';
import { GoalAmountModal } from '../components/goals/GoalAmountModal';
import { useAuthStore } from '../store/authStore';
import { useGoals } from '../hooks/useGoals';
import { formatMoney } from '../components/goals/goalsUtils';

export type { GoalRecord } from '../hooks/useGoals';

export default function GoalsPage({ currentWealth = 0 }: { currentWealth?: number }) {
  const { t, i18n } = useTranslation('common');
  const { accessToken } = useAuthStore();
  const goalsData = useGoals();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  const [amountModalOpen, setAmountModalOpen] = useState(false);
  const [amountGoal, setAmountGoal] = useState<import('../hooks/useGoals').GoalRecord | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [completedOpen, setCompletedOpen] = useState(false);

  const openAddModal = useCallback(() => setAddModalOpen(true), []);
  const closeAddModal = useCallback(() => setAddModalOpen(false), []);
  const onSavedAdd = useCallback(() => {
    setAddModalOpen(false);
    goalsData.fetchGoals();
  }, [goalsData.fetchGoals]);
  const closeEditModal = useCallback(() => {
    setEditModalOpen(false);
    setEditGoalId(null);
  }, []);
  const onSavedEdit = useCallback(() => {
    setEditModalOpen(false);
    setEditGoalId(null);
    goalsData.fetchGoals();
  }, [goalsData.fetchGoals]);
  const closeAmountModal = useCallback(() => {
    setAmountModalOpen(false);
    setAmountGoal(null);
  }, []);
  const onSavedAmount = useCallback(() => {
    setAmountModalOpen(false);
    setAmountGoal(null);
    goalsData.fetchGoals();
  }, [goalsData.fetchGoals]);
  const toggleCompletedOpen = useCallback(() => setCompletedOpen((c) => !c), []);
  const setMenuOpenIdFor = useCallback((id: string) => setMenuOpenId((prev) => (prev === id ? null : id)), []);
  const openAmountFor = useCallback((goal: import('../hooks/useGoals').GoalRecord) => {
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
        goalsData.fetchGoals();
      } catch {
        goalsData.setError(t('goals.errorDelete'));
      }
      setMenuOpenId(null);
    },
    [accessToken, t, goalsData]
  );
  const markComplete = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/goals/${id}/complete`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        goalsData.fetchGoals();
      } catch {
        goalsData.setError(t('goals.errorAdd'));
      }
      setMenuOpenId(null);
    },
    [accessToken, goalsData.fetchGoals]
  );
  const noop = useCallback(() => {}, []);
  const noopAsync = useCallback(async () => {}, []);

  if (goalsData.loading) {
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
      {currentWealth > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
          <p className="text-body text-[var(--text-secondary)]">
            {t('goals.portfolioAvailable')}:{' '}
            <span className="font-semibold text-[var(--text-primary)]">
              {formatMoney(currentWealth, i18n.language)} ج.م
            </span>
          </p>
        </div>
      )}

      {goalsData.goals.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-title font-bold text-[var(--text-primary)]">{t('goals.title')}</h2>
            <p className="text-body text-[var(--text-muted)] mt-0.5">
              {goalsData.activeGoals.length} {t('goals.activeCount')}
            </p>
          </div>
          <Button type="button" onClick={openAddModal} className="flex items-center gap-2" variant="primary">
            <Plus className="w-4 h-4" />
            {t('goals.addNew')}
          </Button>
        </div>
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

      {goalsData.activeGoals.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goalsData.activeGoals.map((goal) => (
            <React.Fragment key={goal.id}>
              <GoalCard
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
            </React.Fragment>
          ))}
        </div>
      )}

      {goalsData.activeGoals.length > 0 && (
        <div className="flex justify-center lg:hidden">
          <Button type="button" onClick={openAddModal} variant="primary" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t('goals.addNew')}
          </Button>
        </div>
      )}

      {goalsData.completedGoals.length > 0 && (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-secondary)]">
          <Button
            type="button"
            variant="ghost"
            onClick={toggleCompletedOpen}
            className="w-full flex items-center justify-between px-4 py-3 text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <span className="font-medium">
              {t('goals.completedSection')} ({goalsData.completedGoals.length})
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
                  {goalsData.completedGoals.map((goal) => (
                    <React.Fragment key={goal.id}>
                      <GoalCard
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
                    </React.Fragment>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

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
        initialGoal={
          editGoalId ? goalsData.goals.find((g) => g.id === editGoalId) ?? undefined : undefined
        }
      />
      <GoalAmountModal
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
