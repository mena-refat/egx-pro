import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/adminApi';
import { Badge } from '../components/Badge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { ArrowLeft, ShieldOff, ShieldCheck, Ban, ShieldAlert } from 'lucide-react';

const PLANS = ['free', 'pro', 'yearly', 'ultra', 'ultra_yearly'];

export default function UserDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const nav    = useNavigate();
  const [user, setUser]               = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [confirmBan, setConfirmBan]     = useState(false);
  const [planModal, setPlanModal]     = useState(false);
  const [newPlan, setNewPlan]         = useState('');
  const [planDate, setPlanDate]       = useState('');
  const [saving, setSaving]           = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await adminApi.get(`/users/${id}`);
      setUser(res.data.data);
      setNewPlan(res.data.data?.plan ?? 'free');
    } catch { setUser(null); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const handleToggleDelete = async () => {
    setSaving(true);
    try {
      await adminApi.patch(`/users/${id}/toggle-delete`);
      setConfirmToggle(false);
      await load();
    } finally { setSaving(false); }
  };

  const handleToggleBan = async () => {
    setSaving(true);
    try {
      await adminApi.patch(`/users/${id}/toggle-ban`);
      setConfirmBan(false);
      await load();
    } finally { setSaving(false); }
  };

  const handleUpdatePlan = async () => {
    setSaving(true);
    try {
      await adminApi.patch(`/users/${id}/plan`, {
        plan: newPlan,
        planExpiresAt: planDate || undefined,
      });
      setPlanModal(false);
      await load();
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <div className="text-center py-20">
      <p className="text-slate-500">{t('userDetail.userNotFound')}</p>
      <button onClick={() => nav('/users')} className="mt-3 text-sm text-emerald-400 hover:underline">← {t('common.back')}</button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => nav('/users')} className="p-2 rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all">
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{user.fullName ?? user.username ?? 'User'}</h1>
          <p className="text-sm text-slate-500">{user.email ?? user.phone ?? user.id}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPlanModal(true)}
            className="px-3 py-1.5 text-xs font-medium bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 rounded-lg transition-all"
          >
            {t('userDetail.changePlan')}
          </button>
          <button
            onClick={() => setConfirmBan(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              user.isSuspended
                ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                : 'bg-orange-500/15 text-orange-400 hover:bg-orange-500/25'
            }`}
          >
            {user.isSuspended ? <ShieldAlert size={12} /> : <Ban size={12} />}
            {user.isSuspended ? t('userDetail.unban') : t('userDetail.ban')}
          </button>
          <button
            onClick={() => setConfirmToggle(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              user.isDeleted
                ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
            }`}
          >
            {user.isDeleted ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}
            {user.isDeleted ? t('userDetail.reactivate') : t('userDetail.deactivate')}
          </button>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t('userDetail.plan'),        value: <Badge label={user.plan} /> },
          { label: t('userDetail.status'),      value: <span className={user.isSuspended ? 'text-orange-400 text-sm' : user.isDeleted ? 'text-red-400 text-sm' : 'text-emerald-400 text-sm'}>{user.isSuspended ? t('userDetail.banned') : user.isDeleted ? t('userDetail.deactivated') : t('userDetail.active')}</span> },
          { label: t('userDetail.aiUses'),      value: <span className="text-white text-sm">{user.aiAnalysisUsedThisMonth}</span> },
          { label: t('userDetail.verified'),    value: <span className={user.isEmailVerified ? 'text-emerald-400 text-sm' : 'text-slate-500 text-sm'}>{user.isEmailVerified ? t('common.yes') : t('common.no')}</span> },
          { label: t('userDetail.joined'),      value: <span className="text-slate-300 text-sm">{new Date(user.createdAt).toLocaleDateString()}</span> },
          { label: t('userDetail.lastLogin'),   value: <span className="text-slate-300 text-sm">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '—'}</span> },
          { label: t('userDetail.portfolio'),   value: <span className="text-white text-sm">{user._count?.portfolios ?? 0}</span> },
          { label: t('userDetail.predictions'), value: <span className="text-white text-sm">{user._count?.predictions ?? 0}</span> },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-white/[0.07] bg-[#111118] p-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">{item.label}</p>
            {item.value}
          </div>
        ))}
      </div>

      {/* Modals */}
      <ConfirmDialog
        open={confirmBan}
        title={user.isSuspended ? t('userDetail.unbanTitle') : t('userDetail.banTitle')}
        message={user.isSuspended ? t('userDetail.unbanMsg') : t('userDetail.banMsg')}
        confirmLabel={user.isSuspended ? t('userDetail.unban') : t('userDetail.ban')}
        danger={!user.isSuspended}
        loading={saving}
        onConfirm={handleToggleBan}
        onCancel={() => setConfirmBan(false)}
      />

      <ConfirmDialog
        open={confirmToggle}
        title={user.isDeleted ? t('userDetail.reactivateTitle') : t('userDetail.deactivateTitle')}
        message={user.isDeleted ? t('userDetail.reactivateMsg') : t('userDetail.deactivateMsg')}
        confirmLabel={user.isDeleted ? t('userDetail.reactivate') : t('userDetail.deactivate')}
        danger={!user.isDeleted}
        loading={saving}
        onConfirm={handleToggleDelete}
        onCancel={() => setConfirmToggle(false)}
      />

      <Modal open={planModal} onClose={() => setPlanModal(false)} title={t('userDetail.changePlan')} width="max-w-sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">{t('userDetail.newPlan')}</label>
            <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-emerald-500/50">
              {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">{t('userDetail.expiresAt')}</label>
            <input type="datetime-local" value={planDate} onChange={(e) => setPlanDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setPlanModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">{t('common.cancel')}</button>
            <button onClick={handleUpdatePlan} disabled={saving}
              className="px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg disabled:opacity-50 transition-all">
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
