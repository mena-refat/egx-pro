import { useEffect, useState } from 'react';
import { adminApi } from '../lib/adminApi';

type Overview = {
  users: { total: number; newToday: number; newThisMonth: number; activePaid: number };
  analyses: { total: number; thisMonth: number };
  predictions: { total: number };
};

export function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    adminApi
      .get('/analytics/overview')
      .then((res) => setData(res.data.data))
      .catch(() => setData(null));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      {data && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs text-slate-400">Total Users</div>
            <div className="text-2xl font-semibold">{data.users.total}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs text-slate-400">New This Month</div>
            <div className="text-2xl font-semibold">{data.users.newThisMonth}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs text-slate-400">Paid Active</div>
            <div className="text-2xl font-semibold">{data.users.activePaid}</div>
          </div>
        </div>
      )}
    </div>
  );
}

