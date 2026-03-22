import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';

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

export function useGoals() {
  const { t } = useTranslation('common');
  const { accessToken } = useAuthStore();
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(
    async (signal?: AbortSignal) => {
      if (!accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/goals', {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal,
        });
        if (signal?.aborted) return;
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        const payload = json?.data ?? json;
        if (!signal?.aborted)
          setGoals(Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : []);
      } catch (err) {
        if (err instanceof Error && (err.name === 'AbortError' || err.message?.includes('abort')))
          return;
        setError(t('goals.errorAdd'));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [accessToken, t]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchGoals(controller.signal);
    return () => controller.abort();
  }, [fetchGoals]);

  const prependGoal = useCallback((goal: GoalRecord) => {
    setGoals((prev) => [goal, ...prev.filter((g) => g.id !== goal.id)]);
  }, []);

  const activeGoals = goals.filter((g) => g.status !== 'completed');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  return {
    goals,
    activeGoals,
    completedGoals,
    loading,
    error,
    setError,
    fetchGoals,
    prependGoal,
  };
}
