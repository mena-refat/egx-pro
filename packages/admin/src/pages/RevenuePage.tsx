import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/adminApi';
import { StatsCard } from '../components/StatsCard';
import { DataTable } from '../components/DataTable';
import { Badge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import {
  DollarSign,
  TrendingUp,
  Users,
  Gift,
  Tag,
  Download,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useAdminStore } from '../store/adminAuthStore';

type RevenueData = {
  mrr: number;
  arr: number;
  totalPaidUsers: number;
  newPaidThisMonth: number;
  newPaidLastMonth: number;
  freeUpgrades: number;
  byPlan: Record<string, { count: number; mrr: number; arr: number }>;
  topDiscountCodes: { code: string; type: string; value: number; uses: number }[];
};

type ChartPoint = { month: string; newSubs: number; estimatedRevenue: number };

type Subscriber = {
  id?: string;
  email: string | null;
  fullName: string | null;
  username: string | null;
  plan: string;
  planExpiresAt: string | null;
  subscribedAt: string;
  basePrice: number;
  paidAmount: number;
  usedDiscount: boolean;
  discountCode: string | null;
  isFreeUpgrade: boolean;
  isAdminGrant: boolean;
};

const PLAN_LABELS: Record<string, string> = {
  pro: 'Pro Monthly',
  yearly: 'Pro Yearly',
  ultra: 'Ultra Monthly',
  ultra_yearly: 'Ultra Yearly',
};

export default function RevenuePage() {
  const { t } = useTranslation();
  const currentAdmin = useAdminStore((s) => s.admin);
  const isSuperAdmin = currentAdmin?.role === 'SUPER_ADMIN';
  const [data, setData] = useState<RevenueData | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [planFilter, setPlanFilter] = useState('');
  const [discountFilter, setDiscountFilter] = useState('');
  const [adminGrantFilter, setAdminGrantFilter] = useState('');
  const [loadingSubs, setLoadingSubs] = useState(false);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2.5 text-xs space-y-1">
        <p className="text-slate-400 font-medium">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}:{' '}
            <span className="font-bold">
              {p.name.includes('Revenue')
                ? `${p.value.toLocaleString()} EGP`
                : p.value}
            </span>
          </p>
        ))}
      </div>
    );
  };

  useEffect(() => {
    adminApi.get('/analytics/revenue').then((r) => setData(r.data.data)).catch(() => null);
    adminApi.get('/analytics/revenue/chart').then((r) => setChart(r.data.data)).catch(() => null);
  }, []);

  const loadSubs = useCallback(async () => {
    setLoadingSubs(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (planFilter) params.plan = planFilter;
      if (discountFilter) params.withDiscount = discountFilter;
      if (adminGrantFilter) params.adminGrant = adminGrantFilter;
      const r = await adminApi.get('/analytics/revenue/subscribers', { params });
      setSubs(r.data.data.users ?? []);
      setTotal(r.data.data.total ?? 0);
    } finally {
      setLoadingSubs(false);
    }
  }, [page, planFilter, discountFilter, adminGrantFilter]);

  useEffect(() => { void loadSubs(); }, [loadSubs]);

  const newThis = data?.newPaidThisMonth ?? 0;
  const prev = data?.newPaidLastMonth ?? 0;
  const mrrGrowth =
    prev > 0 ? (((newThis - prev) / prev) * 100).toFixed(1) : newThis > 0 ? '100' : '0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">{t('revenue.title')}</h1>
        <p className="text-sm text-slate-500">{t('revenue.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard label={t('revenue.mrr')}          value={data ? `${(data.mrr ?? 0).toLocaleString()} EGP` : 0}  icon={DollarSign} accent="emerald" sub={t('revenue.mrrSub')} />
        <StatsCard label={t('revenue.arr')}          value={data ? `${(data.arr ?? 0).toLocaleString()} EGP` : 0}  icon={TrendingUp}  accent="blue"    sub={t('revenue.arrSub')} />
        <StatsCard label={t('revenue.paidUsers')}    value={data?.totalPaidUsers ?? 0}                       icon={Users}       accent="amber"   sub={`+${newThis} ${t('common.thisMonth')} (${mrrGrowth}%)`} />
        <StatsCard label={t('revenue.freeUpgrades')} value={data?.freeUpgrades ?? 0}                         icon={Gift}        accent="rose"    sub={t('revenue.freeUpgradesSub')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-white/[0.07] bg-[#111118] p-5">
          <h2 className="text-sm font-semibold text-white mb-5">{t('revenue.revenueChart')}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chart} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => String(v).slice(5)} />
              <YAxis yAxisId="left"  tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              <Bar yAxisId="left"  dataKey="estimatedRevenue" name="Revenue (EGP)" fill="#10b981" radius={[3,3,0,0]} opacity={0.85} />
              <Bar yAxisId="right" dataKey="newSubs"          name="New Subs"      fill="#3b82f6" radius={[3,3,0,0]} opacity={0.9} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-[#111118] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">{t('revenue.revenueByPlan')}</h2>
          <div className="space-y-3">
            {Object.entries(data?.byPlan ?? {}).map(([plan, stats]) => {
              const pct = data?.mrr ? Math.round((stats.mrr / data.mrr) * 100) : 0;
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge label={PLAN_LABELS[plan] ?? plan} />
                      <span className="text-xs text-slate-500">{stats.count} {t('revenue.users')}</span>
                    </div>
                    <span className="text-xs font-semibold text-white">{Math.round(stats.mrr).toLocaleString()} EGP</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {!data && <div className="text-slate-600 text-sm text-center py-4">{t('common.loading')}</div>}
          </div>
        </div>
      </div>

      {data?.topDiscountCodes?.length ? (
        <div className="rounded-xl border border-white/[0.07] bg-[#111118] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Tag size={14} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">{t('revenue.mostUsedDiscounts')}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {data.topDiscountCodes.slice(0, 5).map((c) => (
              <div key={c.code} className="bg-[#0d0d14] rounded-lg p-3 border border-white/[0.06]">
                <p className="font-mono text-xs font-bold text-emerald-400">{c.code}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {c.type === 'percentage' ? `${c.value}% ${t('revenue.off')}` : c.type === 'fixed' ? `${c.value} EGP ${t('revenue.off')}` : t('revenue.free')}
                </p>
                <p className="text-lg font-bold text-white mt-1">{c.uses}x</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">{t('revenue.allSubscribers')}</h2>
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-slate-500" />
            <select
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-xs bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none"
            >
              <option value="">{t('revenue.allPlans')}</option>
              <option value="pro">Pro</option>
              <option value="yearly">Pro Yearly</option>
              <option value="ultra">Ultra</option>
              <option value="ultra_yearly">Ultra Yearly</option>
            </select>
            <select
              value={discountFilter}
              onChange={(e) => { setDiscountFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-xs bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none"
            >
              <option value="">{t('revenue.allTypes')}</option>
              <option value="true">{t('revenue.withDiscount')}</option>
              <option value="false">{t('revenue.paidFull')}</option>
            </select>
            <select
              value={adminGrantFilter}
              onChange={(e) => { setAdminGrantFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-xs bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none"
            >
              <option value="">{t('revenue.allSources')}</option>
              <option value="true">{t('revenue.adminGrants')}</option>
              <option value="false">{t('revenue.paidOnly')}</option>
            </select>
            {isSuperAdmin && (
              <a
                href={`/api/admin/users/export.csv${planFilter ? `?plan=${planFilter}` : ''}`}
                download
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white/[0.06] border border-white/[0.08] rounded-lg text-slate-300 hover:bg-white/[0.1] transition-all"
              >
                <Download size={12} /> CSV
              </a>
            )}
          </div>
        </div>

        <DataTable
          headers={[t('revenue.user'), t('revenue.plan'), t('revenue.basePrice'), t('revenue.paid'), t('revenue.discount'), t('revenue.subscribed'), t('revenue.expires')]}
          loading={loadingSubs}
          rowCount={subs.length}
          empty={t('revenue.noSubscribers')}
        >
          {subs.map((s, idx) => (
            <tr key={isSuperAdmin ? (s.id ?? String(idx)) : (s.email ?? s.username ?? String(idx))} className="hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-3">
                <p className="text-sm text-white font-medium">{s.fullName ?? s.username ?? '—'}</p>
                <p className="text-xs text-slate-500">{s.email ?? '—'}</p>
              </td>
              <td className="px-4 py-3"><Badge label={PLAN_LABELS[s.plan] ?? s.plan} /></td>
              <td className="px-4 py-3 text-sm text-slate-400 tabular-nums">{s.basePrice} EGP</td>
              <td className="px-4 py-3">
                {s.isAdminGrant ? (
                  <span className="text-xs font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">{t('revenue.adminGrant')}</span>
                ) : s.isFreeUpgrade ? (
                  <span className="text-xs font-semibold text-rose-400">{t('revenue.free')}</span>
                ) : (
                  <span className={`text-sm font-semibold tabular-nums ${s.usedDiscount ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {s.paidAmount} EGP
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {s.discountCode ? (
                  <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">{s.discountCode}</span>
                ) : (
                  <span className="text-xs text-slate-600">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">{new Date(s.subscribedAt).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-xs">
                {s.planExpiresAt ? (
                  <span className={new Date(s.planExpiresAt).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000 ? 'text-amber-400' : 'text-slate-500'}>
                    {new Date(s.planExpiresAt).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-slate-600">∞</span>
                )}
              </td>
            </tr>
          ))}
        </DataTable>

        <Pagination page={page} totalPages={Math.ceil(total / 20)} total={total} limit={20} onChange={setPage} />
      </div>

      {data?.totalPaidUsers && data.totalPaidUsers > 0 ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
          <span className="text-amber-400 mt-0.5">⚠</span>
          <div>
            <p className="text-sm font-semibold text-amber-400">{t('revenue.expiringNote')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('revenue.expiringDesc')}</p>
            <Link to="/notifications" className="text-xs text-emerald-400 hover:underline mt-2 inline-block">
              {t('revenue.sendReminder')}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
