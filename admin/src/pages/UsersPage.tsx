import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/adminApi';
import { DataTable } from '../components/DataTable';
import { Badge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import { Search, Download, RefreshCw, ShieldOff, Trash2, Plus } from 'lucide-react';

type UserRow = {
  id: string; email: string | null; phone: string | null;
  fullName: string | null; username: string | null;
  plan: string; createdAt: string; lastLoginAt: string | null;
  isEmailVerified: boolean; aiAnalysisUsedThisMonth: number;
};

type BlockedItem = {
  id: string; type: string; value: string;
  reason: string | null; createdAt: string;
};

const TYPE_COLORS: Record<string, string> = {
  EMAIL:        'bg-blue-500/15 text-blue-300 border border-blue-500/20',
  PHONE:        'bg-violet-500/15 text-violet-300 border border-violet-500/20',
  EMAIL_DOMAIN: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
};

export default function UsersPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'users' | 'blocklist'>('users');

  /* ── Users state ─────────────────────────────────────────── */
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

  useEffect(() => { void load(); }, [page]); // eslint-disable-line

  const handleSearch = (v: string) => {
    setSearch(v); setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, v, plan), 400);
  };

  const handlePlan = (v: string) => {
    setPlan(v); setPage(1);
    load(1, search, v);
  };

  /* ── Blocklist state ─────────────────────────────────────── */
  const [blocked, setBlocked]       = useState<BlockedItem[]>([]);
  const [blockLoading, setBlockLoading] = useState(false);
  const [addType, setAddType]       = useState('EMAIL');
  const [addValue, setAddValue]     = useState('');
  const [addReason, setAddReason]   = useState('');
  const [addError, setAddError]     = useState('');
  const [addValueError, setAddValueError] = useState('');
  const [adding, setAdding]         = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadBlocklist = async () => {
    setBlockLoading(true);
    try {
      const res = await adminApi.get('/blocklist');
      setBlocked(res.data.data ?? []);
    } catch { setBlocked([]); }
    finally { setBlockLoading(false); }
  };

  useEffect(() => { if (tab === 'blocklist') void loadBlocklist(); }, [tab]);

  const validateAddValue = (value: string, type: string): string => {
    if (!value.trim()) return '';
    if (type === 'EMAIL') {
      if (!value.includes('@') || !value.includes('.')) return 'Invalid email address';
    } else if (type === 'PHONE') {
      if (!/^[+]?[0-9\s\-()]{7,15}$/.test(value)) return 'Invalid phone number';
    } else if (type === 'EMAIL_DOMAIN') {
      if (!value.startsWith('@') && !value.includes('.')) return 'Invalid domain format (e.g. @example.com or example.com)';
    }
    return '';
  };

  const handleAdd = async () => {
    setAddError('');
    if (!addValue.trim()) return;
    const valErr = validateAddValue(addValue, addType);
    if (valErr) { setAddValueError(valErr); return; }
    setAdding(true);
    try {
      await adminApi.post('/blocklist', { type: addType, value: addValue.trim(), reason: addReason.trim() || undefined });
      setAddValue(''); setAddReason('');
      void loadBlocklist();
    } catch (err: any) {
      const code = err?.response?.data?.error;
      setAddError(code === 'ALREADY_BLOCKED' ? t('blocklist.alreadyBlocked') : 'Failed to add');
    } finally { setAdding(false); }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await adminApi.delete(`/blocklist/${id}`);
      setBlocked((prev) => prev.filter((b) => b.id !== id));
    } catch { /* ignore */ }
    finally { setRemovingId(null); }
  };

  const typeLabel: Record<string, string> = {
    EMAIL:        t('blocklist.email'),
    PHONE:        t('blocklist.phone'),
    EMAIL_DOMAIN: t('blocklist.emailDomain'),
  };

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{t('users.title')}</h1>
          <p className="text-sm text-slate-500">
            {tab === 'users'
              ? `${total.toLocaleString()} ${t('users.total')}`
              : `${blocked.length} ${t('blocklist.title').toLowerCase()}`}
          </p>
        </div>

        {tab === 'users' && (
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
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.04] border border-white/[0.06] rounded-xl w-fit">
        <button
          onClick={() => setTab('users')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'users'
              ? 'bg-white/[0.1] text-white'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {t('users.title')}
        </button>
        <button
          onClick={() => setTab('blocklist')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'blocklist'
              ? 'bg-white/[0.1] text-white'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <ShieldOff size={13} />
          {t('blocklist.title')}
          {blocked.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded-full leading-none">
              {blocked.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Users Tab ── */}
      {tab === 'users' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                value={search} onChange={(e) => handleSearch(e.target.value)}
                placeholder={t('users.searchPlaceholder')}
                className="w-full ps-9 pe-4 py-2 text-sm bg-[#111118] border border-white/[0.08] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 transition-colors"
              />
            </div>
            <select
              value={plan} onChange={(e) => handlePlan(e.target.value)}
              className="px-3 py-2 text-sm bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500/40 transition-colors"
            >
              <option value="">{t('users.allPlans')}</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="yearly">Pro Yearly</option>
              <option value="ultra">Ultra</option>
              <option value="ultra_yearly">Ultra Yearly</option>
            </select>
          </div>

          <DataTable
            headers={[t('users.user'), t('users.plan'), t('users.aiUses'), t('users.verified'), t('users.joined'), '']}
            loading={loading}
            rowCount={users.length}
            empty={t('users.noUsers')}
          >
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-white/[0.02] transition-colors border-b border-white/[0.04] last:border-0">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-white">{u.fullName ?? u.username ?? '—'}</p>
                  <p className="text-xs text-slate-500">{u.email ?? u.phone ?? '—'}</p>
                </td>
                <td className="px-4 py-3"><Badge label={u.plan} /></td>
                <td className="px-4 py-3 text-sm text-slate-400 tabular-nums">{u.aiAnalysisUsedThisMonth}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${u.isEmailVerified ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {u.isEmailVerified ? t('users.verifiedYes') : t('users.verifiedNo')}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
        </>
      )}

      {/* ── Blocklist Tab ── */}
      {tab === 'blocklist' && (
        <div className="space-y-5">
          <p className="text-sm text-slate-500">{t('blocklist.subtitle')}</p>

          {/* Add form */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">{t('blocklist.addTitle')}</h3>
            <div className="flex flex-wrap gap-3">
              {/* Type */}
              <select
                value={addType}
                onChange={(e) => { setAddType(e.target.value); setAddValue(''); setAddError(''); setAddValueError(''); }}
                className="px-3 py-2 text-sm bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500/40 transition-colors"
              >
                <option value="EMAIL">{t('blocklist.email')}</option>
                <option value="PHONE">{t('blocklist.phone')}</option>
                <option value="EMAIL_DOMAIN">{t('blocklist.emailDomain')}</option>
              </select>

              {/* Value */}
              <div className="flex-1 min-w-[200px] space-y-1">
                <input
                  value={addValue}
                  onChange={(e) => { setAddValue(e.target.value); setAddError(''); setAddValueError(''); }}
                  onBlur={() => setAddValueError(validateAddValue(addValue, addType))}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleAdd(); }}
                  placeholder={t('blocklist.valuePlaceholder')}
                  className={`w-full px-3 py-2 text-sm bg-[#111118] border rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 transition-colors ${addValueError ? 'border-red-500/50' : 'border-white/[0.08]'}`}
                />
                {addValueError && <p className="text-xs text-red-400">{addValueError}</p>}
              </div>

              {/* Reason */}
              <input
                value={addReason}
                onChange={(e) => setAddReason(e.target.value)}
                placeholder={t('blocklist.reasonPlaceholder')}
                className="flex-1 min-w-[160px] px-3 py-2 text-sm bg-[#111118] border border-white/[0.08] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 transition-colors"
              />

              {/* Submit */}
              <button
                onClick={() => void handleAdd()}
                disabled={adding || !addValue.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Plus size={14} />
                {adding ? t('blocklist.adding') : t('blocklist.add')}
              </button>
            </div>

            {addError && (
              <p className="text-xs text-red-400 mt-1">{addError}</p>
            )}
          </div>

          {/* Blocked list */}
          <DataTable
            headers={[t('blocklist.type'), t('blocklist.value'), t('blocklist.reason'), t('blocklist.blockedOn'), '']}
            loading={blockLoading}
            rowCount={blocked.length}
            empty={t('blocklist.noItems')}
          >
            {blocked.map((b) => (
              <tr key={b.id} className="hover:bg-white/[0.02] transition-colors border-b border-white/[0.04] last:border-0 text-sm">
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${TYPE_COLORS[b.type] ?? 'bg-white/[0.06] text-slate-300'}`}>
                    {typeLabel[b.type] ?? b.type}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-sm text-slate-200">{b.value}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{b.reason ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                  {new Date(b.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => void handleRemove(b.id)}
                    disabled={removingId === b.id}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                    title="Remove"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}
    </div>
  );
}
