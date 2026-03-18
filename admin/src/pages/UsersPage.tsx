import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/adminApi';
import { DataTable } from '../components/DataTable';
import { Badge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import { Search, Download, RefreshCw } from 'lucide-react';

type UserRow = {
  id: string; email: string | null; phone: string | null;
  fullName: string | null; username: string | null;
  plan: string; createdAt: string; lastLoginAt: string | null;
  isEmailVerified: boolean; aiAnalysisUsedThisMonth: number;
};

export default function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers]   = useState<UserRow[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [plan, setPlan]     = useState('');
  const [loading, setLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (p = page, s = search, pl = plan) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(p), limit: '20' };
      if (s) params.search = s;
      if (pl) params.plan = pl;
      const res = await adminApi.get('/users', { params });
      setUsers(res.data.data.users ?? []);
      setTotal(res.data.data.total ?? 0);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  }, [page, search, plan]);

  useEffect(() => { void load(); }, [page]);// eslint-disable-line

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, v, plan), 400);
  };

  const handlePlan = (v: string) => {
    setPlan(v); setPage(1);
    load(1, search, v);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{t('users.title')}</h1>
          <p className="text-sm text-slate-500">{total.toLocaleString()} {t('users.total')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => load()} className="p-2 rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <a
            href={`/api/admin/users/export.csv${plan ? `?plan=${plan}` : ''}`}
            download
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg text-slate-300 transition-all"
          >
            <Download size={13} /> {t('users.exportCsv')}
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search} onChange={(e) => handleSearch(e.target.value)}
            placeholder={t('users.searchPlaceholder')}
            className="w-full ps-9 pe-4 py-2 text-sm bg-[#111118] border border-white/[0.08] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
          />
        </div>
        <select
          value={plan} onChange={(e) => handlePlan(e.target.value)}
          className="px-3 py-2 text-sm bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500/50 transition-all"
        >
          <option value="">{t('users.allPlans')}</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="yearly">Pro Yearly</option>
          <option value="ultra">Ultra</option>
          <option value="ultra_yearly">Ultra Yearly</option>
        </select>
      </div>

      {/* Table */}
      <DataTable
        headers={[t('users.user'), t('users.plan'), t('users.aiUses'), t('users.verified'), t('users.joined'), '']}
        loading={loading}
        rowCount={users.length}
        empty={t('users.noUsers')}
      >
        {users.map((u) => (
          <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
            <td className="px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">{u.fullName ?? u.username ?? '—'}</p>
                <p className="text-xs text-slate-500">{u.email ?? u.phone ?? '—'}</p>
              </div>
            </td>
            <td className="px-4 py-3"><Badge label={u.plan} /></td>
            <td className="px-4 py-3 text-sm text-slate-400 tabular-nums">{u.aiAnalysisUsedThisMonth}</td>
            <td className="px-4 py-3">
              <span className={`text-xs ${u.isEmailVerified ? 'text-emerald-400' : 'text-slate-600'}`}>
                {u.isEmailVerified ? t('users.verifiedYes') : t('users.verifiedNo')}
              </span>
            </td>
            <td className="px-4 py-3 text-xs text-slate-500">
              {new Date(u.createdAt).toLocaleDateString()}
            </td>
            <td className="px-4 py-3">
              <Link to={`/users/${u.id}`} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                {t('users.view')}
              </Link>
            </td>
          </tr>
        ))}
      </DataTable>

      <Pagination page={page} totalPages={Math.ceil(total / 20)} total={total} limit={20} onChange={setPage} />
    </div>
  );
}
