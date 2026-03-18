import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/adminApi';
import { useAdminStore } from '../store/adminAuthStore';
import { DataTable } from '../components/DataTable';
import { Badge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import { Search, Download, RefreshCw, UserPlus } from 'lucide-react';

type UserRow = {
  id: string; email: string | null; phone: string | null;
  fullName: string | null; username: string | null;
  plan: string; createdAt: string; lastLoginAt: string | null;
  isEmailVerified: boolean; aiAnalysisUsedThisMonth: number;
};

const DEFAULT_OPTIONS = { forcePasswordChange: true, requireStrongPassword: true, force2FA: true };

export default function UsersPage() {
  const { t } = useTranslation();
  const admin = useAdminStore((s) => s.admin);
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';

  const [users, setUsers]   = useState<UserRow[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [plan, setPlan]     = useState('');
  const [loading, setLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Invite modal
  const [inviteOpen, setInviteOpen]   = useState(false);
  const [inviteForm, setInviteForm]   = useState({ email: '', fullName: '' });
  const [inviteOpts, setInviteOpts]   = useState(DEFAULT_OPTIONS);
  const [inviting, setInviting]       = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteDone, setInviteDone]   = useState(false);

  const openInvite = () => {
    setInviteForm({ email: '', fullName: '' });
    setInviteOpts(DEFAULT_OPTIONS);
    setInviteError('');
    setInviteDone(false);
    setInviteOpen(true);
  };

  const handleInvite = async () => {
    setInviteError('');
    if (!inviteForm.email.trim()) { setInviteError(t('users.inviteEmailRequired')); return; }
    setInviting(true);
    try {
      await adminApi.post('/users/invite', {
        email: inviteForm.email.trim(),
        fullName: inviteForm.fullName.trim() || undefined,
        options: inviteOpts,
      });
      setInviteDone(true);
      await load();
    } catch (err: any) {
      const code = err?.response?.data?.error;
      setInviteError(code === 'EMAIL_ALREADY_EXISTS' ? t('users.inviteEmailExists') : t('users.inviteError'));
    } finally {
      setInviting(false);
    }
  };

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
          {isSuperAdmin && (
            <button
              onClick={openInvite}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-all"
            >
              <UserPlus size={13} /> {t('users.inviteUser')}
            </button>
          )}
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

      {/* Invite User Modal */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title={t('users.inviteTitle')} width="max-w-sm">
        {inviteDone ? (
          <div className="text-center py-4 space-y-3">
            <p className="text-2xl">✅</p>
            <p className="text-sm font-semibold text-emerald-400">{t('users.inviteSent')}</p>
            <p className="text-xs text-slate-500">{t('users.inviteSentDesc')}</p>
            <button onClick={() => setInviteOpen(false)} className="mt-2 px-6 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-all">
              {t('common.close')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">{t('users.inviteEmail')} *</label>
              <input
                type="email"
                placeholder="user@example.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">{t('users.inviteFullName')}</label>
              <input
                type="text"
                placeholder={t('users.inviteFullNamePlaceholder')}
                value={inviteForm.fullName}
                onChange={(e) => setInviteForm((p) => ({ ...p, fullName: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Security Options */}
            <div>
              <label className="text-xs text-slate-500 block mb-2">{t('users.inviteOptions')}</label>
              <div className="space-y-2.5">
                {([
                  ['forcePasswordChange',  t('users.optForcePasswordChange')],
                  ['requireStrongPassword', t('users.optRequireStrongPassword')],
                  ['force2FA',             t('users.optForce2FA')],
                ] as [keyof typeof inviteOpts, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={inviteOpts[key]}
                      onChange={(e) => setInviteOpts((p) => ({ ...p, [key]: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs text-slate-300 leading-relaxed group-hover:text-white transition-colors">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {inviteError && <p className="text-xs text-red-400">{inviteError}</p>}

            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setInviteOpen(false)} className="px-4 py-2 text-sm text-slate-400">
                {t('common.cancel')}
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteForm.email.trim()}
                className="px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg disabled:opacity-50 transition-all"
              >
                {inviting ? t('users.inviteSending') : t('users.inviteSend')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
