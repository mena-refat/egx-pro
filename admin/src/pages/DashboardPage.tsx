import { useEffect, useState } from 'react';
import { adminApi } from '../lib/adminApi';
import { StatsCard } from '../components/StatsCard';

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
          <StatsCard label="Total Users" value={data.users.total} />
          <StatsCard label="New This Month" value={data.users.newThisMonth} />
          <StatsCard label="Paid Active" value={data.users.activePaid} />
        </div>
      )}
    </div>
  );
}

