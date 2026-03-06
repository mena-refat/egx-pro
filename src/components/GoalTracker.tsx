import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Calendar, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  type: string;
}

export default function GoalTracker({ currentWealth }: { currentWealth: number }) {
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
    const fetchGoals = async () => {
      if (!accessToken) return;
      setIsLoading(true);
      try {
        const res = await fetch('/api/goals', { 
          headers: { 'Authorization': `Bearer ${accessToken}` } 
        });
        if (!res.ok) {
          console.error('Fetch goals failed');
          return;
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          setGoals(data);
        }
      } catch (err) {
        console.error('Fetch goals error', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGoals();
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
        if (Array.isArray(data.newUnseenAchievements) && data.newUnseenAchievements.length > 0) {
          useAuthStore.getState().addUnseenAchievementsCount(data.newUnseenAchievements.length);
        }
      } else {
        setError(data.error || t('goals.errorAdd'));
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
        alert(t('goals.errorDelete'));
      }
    } catch (err) {
      console.error('Delete goal error', err);
      alert(t('goals.errorDelete'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">{t('goals.title')}</h3>
        <button 
          onClick={() => { setIsAdding(true); setError(''); }}
          className="p-2 bg-violet-600 hover:bg-violet-500 rounded-xl transition-all"
          title={t('goals.addNew')}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
          </div>
        ) : (
          <>
            {goals.map(goal => {
              const progress = Math.min((currentWealth / goal.targetAmount) * 100, 100);
              return (
                <div key={goal.id} className="card-base p-6 relative group">
                  <button 
                    onClick={() => handleDelete(goal.id)}
                    className="absolute top-4 right-4 p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    title={t('goals.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-lg">{goal.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(goal.targetDate).toLocaleDateString(i18n.language)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-violet-500">{goal.targetAmount.toLocaleString()} EGP</p>
                      <p className="text-xs text-slate-500">{t('goals.targetAmount')}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{t('goals.progress')}</span>
                      <span className="font-bold text-violet-500">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-violet-500 transition-all duration-1000" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {goals.length === 0 && !isAdding && (
              <div className="text-center py-8 text-slate-500 text-sm italic border border-dashed border-white/10 rounded-3xl">
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
              <div>
                <label className="block text-sm text-slate-400 mb-1">{t('goals.name')}</label>
                <input 
                  type="text" required
                  value={newGoal.name}
                  onChange={e => setNewGoal({ ...newGoal, name: e.target.value })}
                  className="input-base"
                  placeholder={t('goals.placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">{t('goals.targetAmount')}</label>
                <input 
                  type="number" required
                  value={newGoal.targetAmount}
                  onChange={e => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                  className="input-base"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">{t('goals.targetDate')}</label>
                <input 
                  type="date" required
                  value={newGoal.targetDate}
                  onChange={e => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                  className="input-base"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-4 mt-8">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold transition-all">
                  {t('goals.cancel')}
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-bold disabled:opacity-50 text-white shadow-lg shadow-violet-600/20"
                >
                  {isSubmitting ? t('common.loading') : t('goals.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
