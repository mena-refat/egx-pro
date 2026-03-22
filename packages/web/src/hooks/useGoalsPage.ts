import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { clearCache } from '../lib/queryCache';
import { useGoals } from './useGoals';
import type { GoalRecord } from './useGoals';

function getGoalsLimit(
  plan: string | null | undefined,
  planExpiresAt: string | null | undefined,
  referralProExpiresAt: string | null | undefined,
): number {
  const now = new Date();
  const hasReferralPro = referralProExpiresAt != null && new Date(referralProExpiresAt) > now;
  const p = plan || 'free';
  const exp = planExpiresAt ? new Date(planExpiresAt) : null;
  const isActive = exp == null || exp > now;
  if (!isActive && !hasReferralPro) return 1;
  if (hasReferralPro || p === 'pro' || p === 'yearly') return 3;
  if (p === 'ultra' || p === 'ultra_yearly') return 999;
  return 1;
}

export function useGoalsPage() {
  const { t } = useTranslation('common');
  const { accessToken, user } = useAuthStore();
  const goalsData = useGoals();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [goalsLimitOpen, setGoalsLimitOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  const [amountModalOpen, setAmountModalOpen] = useState(false);
  const [amountGoal, setAmountGoal] = useState<GoalRecord | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [completedOpen, setCompletedOpen] = useState(false);

  const openAddModal = useCallback(() => {
    const limit = getGoalsLimit(user?.plan, user?.planExpiresAt, user?.referralProExpiresAt);
    if (goalsData.activeGoals.length >= limit) {
      setGoalsLimitOpen(true);
    } else {
      setAddModalOpen(true);
    }
  }, [user, goalsData.activeGoals]);
  const closeAddModal = useCallback(() => setAddModalOpen(false), []);
  const onSavedAdd = useCallback((goal?: GoalRecord) => {
    setAddModalOpen(false);
    if (goal) goalsData.prependGoal(goal);
    goalsData.fetchGoals();
  }, [goalsData]);

  const closeEditModal = useCallback(() => {
    setEditModalOpen(false);
    setEditGoalId(null);
  }, []);
  const onSavedEdit = useCallback(() => {
    setEditModalOpen(false);
    setEditGoalId(null);
    goalsData.fetchGoals();
  }, [goalsData]);

  const closeAmountModal = useCallback(() => {
    setAmountModalOpen(false);
    setAmountGoal(null);
  }, []);
  const onSavedAmount = useCallback(() => {
    setAmountModalOpen(false);
    setAmountGoal(null);
    goalsData.fetchGoals();
  }, [goalsData]);

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
        await fetch(`/api/goals/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
        clearCache('/goals');
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
        await fetch(`/api/goals/${id}/complete`, { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` } });
        clearCache('/goals');
        goalsData.fetchGoals();
      } catch {
        goalsData.setError(t('goals.errorAdd'));
      }
      setMenuOpenId(null);
    },
    [accessToken, goalsData, t]
  );

  const closeGoalsLimitModal = useCallback(() => setGoalsLimitOpen(false), []);

  return {
    goalsData,
    addModalOpen,
    goalsLimitOpen,
    closeGoalsLimitModal,
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
  };
}
