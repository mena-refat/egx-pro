import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../lib/adminApi';
import { Badge } from '../components/Badge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { ArrowLeft, ShieldOff, ShieldCheck } from 'lucide-react';

const PLANS = ['free', 'pro', 'yearly', 'ultra', 'ultra_yearly'];

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [planModal, setPlanModal] = useState(false);
  const [newPlan, setNewPlan] = useState('');
  const [planDate, setPlanDate] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await adminApi.get(`/users/${id}`);
      setUser(res.data.data);
      setNewPlan(res.data.data?.plan ?? 'free');
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggleDelete = async () => {
    setSaving(true);
    try {
      await adminApi.patch(`/users/${id}/toggle-delete`);
      setConfirmToggle(false);
      await load();
    } finally {
      setSaving(false);
    }
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
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">User not found</p>
        <button
          type="button"
          onClick={() => navigate('/users')}
          className="mt-3 text-sm text-emerald-400 hover:underline"
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/users')}
          className="p-2 rounded-lg border border-white/10/80 text-slate-400 hover:text-slate-200 hover:bg-white/5/50 transition-all"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">
            {user.fullName ?? user.username ?? 'User'}
          </h1>
          <p className="text-sm text-slate-500">{user.email ?? user.phone ?? user.id}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPlanModal(true)}
            className="px-3 py-1.5 text-xs font-medium bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 rounded-lg transition-all"
          >
            Change Plan
          </button>
          <button
            type="button"
            onClick={() => setConfirmToggle(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              user.isDeleted
                ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
            }`}
          >
            {user.isDeleted ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}
            {user.isDeleted ? 'Reactivate' : 'Deactivate'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Plan', value: <Badge label={user.plan} /> },
          {
            label: 'Status',
            value: (
              <span
                className={
                  user.isDeleted ? 'text-red-400 text-sm' : 'text-emerald-400 text-sm'
                }
              >
                {user.isDeleted ? 'Deactivated' : 'Active'}
              </span>
            ),
          },
          {
            label: 'AI Uses',
            value: <span className="text-white text-sm">{user.aiAnalysisUsedThisMonth}</span>,
          },
          {
            label: 'Verified',
            value: (
              <span
                className={
                  user.isEmailVerified ? 'text-emerald-400 text-sm' : 'text-slate-500 text-sm'
                }
              >
                {user.isEmailVerified ? 'Yes' : 'No'}
              </span>
            ),
          },
          {
            label: 'Joined',
            value: (
              <span className="text-slate-300 text-sm">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            ),
          },
          {
            label: 'Last Login',
            value: (
              <span className="text-slate-300 text-sm">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '—'}
              </span>
            ),
          },
          {
            label: 'Portfolio',
            value: (
              <span className="text-white text-sm">
                {user._count?.portfolios ?? 0}
              </span>
            ),
          },
          {
            label: 'Predictions',
            value: (
              <span className="text-white text-sm">
                {user._count?.predictions ?? 0}
              </span>
            ),
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-white/10/70 bg-[#111118] p-4"
          >
            <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">
              {item.label}
            </p>
            {item.value}
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={confirmToggle}
        title={user.isDeleted ? 'Reactivate User' : 'Deactivate User'}
        message={
          user.isDeleted
            ? 'This will restore access for this user.'
            : 'This will block this user from logging in.'
        }
        confirmLabel={user.isDeleted ? 'Reactivate' : 'Deactivate'}
        danger={!user.isDeleted}
        loading={saving}
        onConfirm={handleToggleDelete}
        onCancel={() => setConfirmToggle(false)}
      />

      <Modal
        open={planModal}
        onClose={() => setPlanModal(false)}
        title="Change Plan"
        width="max-w-sm"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">New Plan</label>
            <select
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/10/80 rounded-lg text-white focus:outline-none focus:border-emerald-500/50"
            >
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">
              Expires At (optional)
            </label>
            <input
              type="datetime-local"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/10/80 rounded-lg text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => setPlanModal(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdatePlan}
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

