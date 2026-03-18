import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  Brain,
  Target,
  UserPlus,
  Activity,
  Tag,
  Bell,
  DollarSign,
  Headphones,
} from 'lucide-react';
import { StatsCard } from '../components/StatsCard';
import { adminApi } from '../lib/adminApi';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Badge } from '../components/Badge';

type Overview = {
  users: { total: number; newToday: number; newThisMonth: number; activePaid: number; byPlan: { plan: string; _count: { plan: number } }[] };
  analyses: { total: number; thisMonth: number; bySingle: number; byCompare: number; byRecommendations: number };
  predictions: { total: number };
};

type Health = {
  activeUsersToday: number;
  activeUsers7d: number;
  analysesToday: number;
  predictionsToday: number;
  openTickets: number;
  expiringSoon: number;
  churnRisk: number;
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
  const [growth, setGrowth] = useState<{ date: string; count: number }[]>([]);
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    adminApi
      .get('/analytics/overview')
      .then((r) => setOverview(r.data.data))
      .catch(() => null);
    adminApi
      .get('/analytics/growth')
      .then((r) => setGrowth(r.data.data))
      .catch(() => null);
    adminApi
      .get('/analytics/health')
      .then((r) => setHealth(r.data.data))
      .catch(() => null);
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

      {/* AI Analysis Breakdown */}
      <div className="rounded-xl border border-white/[0.07] bg-[#111118] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain size={14} className="text-rose-400" />
          <h2 className="text-sm font-semibold text-white">AI Analyses Breakdown</h2>
          <span className="ml-auto text-[11px] text-slate-500">Total: {overview?.analyses.total ?? 0}</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Single Stock', value: overview?.analyses.bySingle ?? 0, color: 'text-blue-400' },
            { label: 'Compare',      value: overview?.analyses.byCompare ?? 0, color: 'text-amber-400' },
            { label: 'Recommendations', value: overview?.analyses.byRecommendations ?? 0, color: 'text-emerald-400' },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1 rounded-lg bg-white/[0.03] py-3 px-2">
              <span className={`text-xl font-bold tabular-nums ${item.color}`}>{item.value.toLocaleString()}</span>
              <span className="text-[11px] text-slate-500 text-center">{item.label}</span>
            </div>
          ))}
        </div>
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
        <div className="space-y-4">
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
                <div className="text-slate-600 text-sm text-center py-4">
                  Loading...
                </div>
              )}
            </div>
          </div>

          {health && (
            <div className="rounded-xl border border-white/[0.07] bg-[#111118] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={14} className="text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">Platform Health</h2>
              </div>
              <div className="space-y-2.5 text-sm">
                {[
                  {
                    label: 'Active today',
                    value: health.activeUsersToday,
                    color: 'text-emerald-400',
                  },
                  {
                    label: 'Active (7 days)',
                    value: health.activeUsers7d,
                    color: 'text-blue-400',
                  },
                  {
                    label: 'AI analyses today',
                    value: health.analysesToday,
                    color: 'text-purple-400',
                  },
                  {
                    label: 'Predictions today',
                    value: health.predictionsToday,
                    color: 'text-amber-400',
                  },
                  {
                    label: 'Open tickets ⚠',
                    value: health.openTickets,
                    color:
                      health.openTickets > 5 ? 'text-red-400' : 'text-slate-300',
                  },
                  {
                    label: 'Expiring (7 days) ⚠',
                    value: health.expiringSoon,
                    color:
                      health.expiringSoon > 0 ? 'text-amber-400' : 'text-slate-300',
                  },
                  {
                    label: 'Churn risk',
                    value: health.churnRisk,
                    color:
                      health.churnRisk > 10 ? 'text-red-400' : 'text-slate-400',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-xs text-slate-500">{item.label}</span>
                    <span
                      className={`font-semibold tabular-nums ${item.color}`}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'New Discount',
            icon: Tag,
            to: '/discounts',
            color: 'hover:border-emerald-500/40',
          },
          {
            label: 'Broadcast Message',
            icon: Bell,
            to: '/notifications',
            color: 'hover:border-blue-500/40',
          },
          {
            label: 'View Subscribers',
            icon: DollarSign,
            to: '/revenue',
            color: 'hover:border-amber-500/40',
          },
          {
            label: 'Open Tickets',
            icon: Headphones,
            to: '/support',
            color: 'hover:border-rose-500/40',
          },
        ].map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-white/[0.07] bg-[#111118] ${a.color} transition-all hover:bg-white/[0.03] text-center`}
          >
            <a.icon size={18} className="text-slate-400" />
            <span className="text-xs text-slate-400 font-medium">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

