import React, { memo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Calendar, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/toastStore';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  type: string;
}

const GoalTracker = memo(function GoalTracker({ currentWealth }: { currentWealth: number }) {
  const { t, i18n } = useTranslation('common');
  const { accessToken } = useAuthStore();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [newGoal, setNewGoal] = useState({ name: '', targetAmount: '', targetDate: '', type: 'apartment' });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    const fetchGoals = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/goals', {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data?.items)) setGoals(data.items);
        else if (Array.isArray(data)) setGoals(data);
      } catch (err) {
        if (err instanceof Error && (err.name === 'AbortError' || err.message?.includes('abort'))) return;
        if (import.meta.env.DEV) console.error('Fetch goals error', err);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    fetchGoals();
    return () => controller.abort();
  }, [accessToken, refreshTrigger]);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const amountNum = parseFloat(newGoal.targetAmount);

    if (!newGoal.name || newGoal.name.length < 3) {
      setError(t('goals.validationName'));
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setError(t('goals.validationAmount'));
      return;
    }
    if (!newGoal.targetDate) {
      setError(t('goals.validationDate'));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          ...newGoal,
          targetAmount: amountNum
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsAdding(false);
        setNewGoal({ name: '', targetAmount: '', targetDate: '', type: 'apartment' });
        setRefreshTrigger(prev => prev + 1);
        const payload = data?.data ?? data;
        if (Array.isArray(payload?.newUnseenAchievements) && payload.newUnseenAchievements.length > 0) {
          useAuthStore.getState().addUnseenAchievementsCount(payload.newUnseenAchievements.length);
        }
      } else {
        setError((data as { error?: string })?.error || t('goals.errorAdd'));
      }
    } catch (err) {
      console.error('Add goal error', err);
      setError(t('goals.errorAdd'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('goals.deleteConfirm'))) return;

    try {
      const res = await fetch(`/api/goals/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${accessToken}`
        },
      });
      if (res.ok) {
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(t('goals.errorDelete'));
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Delete goal error', err);
      toast.error(t('goals.errorDelete'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">{t('goals.title')}</h3>
        <button 
          onClick={() => { setIsAdding(true); setError(''); }}
          className="p-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] rounded-xl transition-all"
          title={t('goals.addNew')}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand)]" />
          </div>
        ) : (
          <>
            {goals.map(goal => {
              const progress = Math.min((currentWealth / goal.targetAmount) * 100, 100);
              return (
                <div key={goal.id} className="card-base p-6 relative group">
                  <button 
                    onClick={() => handleDelete(goal.id)}
                    className="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100 transition-all"
                    title={t('goals.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-lg">{goal.name}</h4>
                      <div className="flex items-center gap-2 text-label text-[var(--text-muted)] mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(goal.targetDate).toLocaleDateString(i18n.language)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[var(--brand)]">{goal.targetAmount.toLocaleString()} EGP</p>
                      <p className="text-label text-[var(--text-muted)]">{t('goals.targetAmount')}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)]">{t('goals.progress')}</span>
                      <span className="font-bold text-[var(--brand)]">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                      <div
                        className="h-full w-progress bg-[var(--brand)] transition-all duration-1000"
                        style={{ ['--progress-width']: `${progress}%` } as React.CSSProperties}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {goals.length === 0 && !isAdding && (
              <div className="text-center py-8 text-[var(--text-muted)] text-body italic border border-dashed border-[var(--border)] rounded-3xl">
                {t('goals.noGoals')}
              </div>
            )}
          </>
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card-base p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-bold mb-6">{t('goals.addNew')}</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <Input
                label={t('goals.name')}
                type="text"
                required
                value={newGoal.name}
                onChange={e => setNewGoal({ ...newGoal, name: e.target.value })}
                placeholder={t('goals.placeholder')}
              />
              <Input
                label={t('goals.targetAmount')}
                type="number"
                required
                value={newGoal.targetAmount}
                onChange={e => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
              />
              <Input
                label={t('goals.targetDate')}
                type="date"
                required
                value={newGoal.targetDate}
                onChange={e => setNewGoal({ ...newGoal, targetDate: e.target.value })}
              />

              {error && (
                <div className="p-3 bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-xl text-[var(--danger)] text-body">
                  {error}
                </div>
              )}

              <div className="flex gap-4 mt-8">
                <Button type="button" variant="secondary" onClick={() => setIsAdding(false)} className="flex-1">
                  {t('goals.cancel')}
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? t('common.loading') : t('goals.save')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

export default GoalTracker;
