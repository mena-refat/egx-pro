import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
}

export default function FinancialGoalsSidebar({ currentWealth }: { currentWealth: number }) {
  const { t } = useTranslation('common');
  const { accessToken } = useAuthStore();
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    const fetchGoals = async () => {
      if (!accessToken) return;
      try {
        const res = await fetch('/api/goals', { 
          headers: { 'Authorization': `Bearer ${accessToken}` } 
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.items)) setGoals(data.items);
          else if (Array.isArray(data)) setGoals(data);
        }
      } catch (err) {
        console.error('Fetch goals error', err);
      }
    };
    fetchGoals();
  }, [accessToken]);

  return (
    <div className="card-base p-6 h-full">
      <h3 className="text-lg font-bold mb-6">{t('goals.title')}</h3>
      <div className="space-y-6">
        {goals.map(goal => {
          const progress = Math.min((currentWealth / goal.targetAmount) * 100, 100);
          return (
            <div key={goal.id} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{goal.name}</span>
                <span className="text-violet-500 font-bold">{progress.toFixed(0)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-violet-500 transition-all duration-1000" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
        {goals.length === 0 && (
          <p className="text-slate-500 text-sm italic">{t('goals.noGoalsSet')}</p>
        )}
      </div>
    </div>
  );
}
