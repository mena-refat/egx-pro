import { useEffect, useState } from 'react';
import { adminApi } from '../lib/adminApi';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';

export function AdminsPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm]     = useState({
    email: '',
    fullName: '',
    password: '',
    permissions: [] as string[],
  });

  useEffect(() => {
    adminApi
      .get('/admins')
      .then((res) => setAdmins(res.data.data))
      .catch(() => setAdmins([]));
  }, []);

  const togglePermission = (perm: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter((p) => p !== perm)
        : [...f.permissions, perm],
    }));
  };

  const handleCreate = async () => {
    if (!form.email || !form.password) return;
    setSaving(true);
    try {
      await adminApi.post('/admins', form);
      setOpen(false);
      setForm({ email: '', fullName: '', password: '', permissions: [] });
      const res = await adminApi.get('/admins');
      setAdmins(res.data.data);
    } finally {
      setSaving(false);
    }
  };

  const PERMS = [
    'users.view',
    'discounts.view',
    'discounts.manage',
    'support.view',
    'support.reply',
    'notifications.send',
    'audit.view',
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Admins</h1>
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-all"
        >
          New Admin
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#111118]">
        <table className="min-w-full text-sm">
          <thead className="text-slate-300 border-b border-white/[0.06] bg-[#0f0f17]">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold">Email</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">Name</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">Role</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {admins.map((a) => (
              <tr key={a.id} className="hover:bg-white/[0.02]">
                <td className="px-3 py-2 text-slate-200">{a.email}</td>
                <td className="px-3 py-2 text-slate-300">{a.fullName}</td>
                <td className="px-3 py-2">
                  <Badge label={a.role ?? 'ADMIN'} />
                </td>
                <td className="px-3 py-2 text-slate-300">
                  {a.isActive ? 'Yes' : 'No'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Admin" width="max-w-md">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Email</label>
            <input
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Full Name</label>
            <input
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Permissions</label>
            <div className="grid grid-cols-2 gap-2">
              {PERMS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(p)}
                    onChange={() => togglePermission(p)}
                    className="w-3 h-3 rounded border border-white/[0.2] bg-transparent"
                  />
                  <span>{p}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || !form.email || !form.password}
              className="px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg disabled:opacity-50 transition-all"
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

