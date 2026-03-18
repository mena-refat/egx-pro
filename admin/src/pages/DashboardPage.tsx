import { useEffect, useState } from 'react';
import { Users, TrendingUp, Brain, Target, UserPlus, Activity } from 'lucide-react';
import { StatsCard } from '../components/StatsCard';
import { adminApi } from '../lib/adminApi';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Badge } from '../components/Badge';

type Overview = {
  users: { total: number; newToday: number; newThisMonth: number; activePaid: number; byPlan: { plan: string; _count: { plan: number } }[] };
  analyses: { total: number; thisMonth: number };
  predictions: { total: number };
};

// Custom tooltip for chart
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-emerald-400 font-semibold">+{payload[0]?.value} users</p>
    </div>
  );
};

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [growth, setGrowth]     = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    adminApi.get('/analytics/overview').then((r) => setOverview(r.data.data)).catch(() => null);
    adminApi.get('/analytics/growth').then((r) => setGrowth(r.data.data)).catch(() => null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Platform overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard label="Total Users"     value={overview?.users.total ?? 0}        icon={Users}     accent="emerald" sub={`+${overview?.users.newToday ?? 0} today`} />
        <StatsCard label="New This Month"  value={overview?.users.newThisMonth ?? 0} icon={UserPlus}  accent="blue"    />
        <StatsCard label="Paid Active"     value={overview?.users.activePaid ?? 0}   icon={TrendingUp} accent="amber"  />
        <StatsCard label="AI Analyses"     value={overview?.analyses.total ?? 0}     icon={Brain}     accent="rose"    sub={`${overview?.analyses.thisMonth ?? 0} this month`} />
      </div>

      {/* Chart + Plan breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="lg:col-span-2 rounded-xl border border-white/[0.07] bg-[#111118] p-5">
          <div className="flex items-center gap-2 mb-5">
            <Activity size={14} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">User Growth</h2>
            <span className="ml-auto text-[11px] text-slate-500">Last 30 days</span>
          </div>
          {growth.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={growth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-600 text-sm">No data yet</div>
          )}
        </div>

        {/* Plan breakdown */}
        <div className="rounded-xl border border-white/[0.07] bg-[#111118] p-5">
          <div className="flex items-center gap-2 mb-5">
            <Target size={14} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">By Plan</h2>
          </div>
          <div className="space-y-2.5">
            {(overview?.users.byPlan ?? []).map((p) => (
              <div key={p.plan} className="flex items-center justify-between">
                <Badge label={p.plan} />
                <span className="text-sm font-semibold text-white tabular-nums">
                  {p._count.plan.toLocaleString()}
                </span>
              </div>
            ))}
            {!overview && (
              <div className="text-slate-600 text-sm text-center py-4">Loading...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

