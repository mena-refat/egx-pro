import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/adminApi';
import { useAdminStore } from '../store/adminAuthStore';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

const PERMS = [
  'users.view',
  'discounts.view',
  'discounts.manage',
  'support.view',
  'support.reply',
  'notifications.send',
  'audit.view',
];

const EMPTY_FORM = {
  email: '',
  phone: '',
  fullName: '',
  password: '',
  permissions: [] as string[],
  isSuperAdmin: false,
  mustChangePassword: true,
  mustSetup2FA: true,
  pwdMinLength: true,
  pwdUppercase: true,
  pwdLowercase: true,
  pwdSymbols: true,
};

function buildPassword(rules: { pwdUppercase: boolean; pwdLowercase: boolean; pwdSymbols: boolean }): string {
  const upper   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower   = 'abcdefghijklmnopqrstuvwxyz';
  const digits  = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.?';

  let pool = digits;
  const required: string[] = [];

  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];

  if (rules.pwdUppercase) { pool += upper;   required.push(pick(upper)); }
  if (rules.pwdLowercase) { pool += lower;   required.push(pick(lower)); }
  if (rules.pwdSymbols)   { pool += symbols; required.push(pick(symbols)); }
  if (!rules.pwdUppercase && !rules.pwdLowercase) pool += lower; // fallback

  const chars: string[] = [...required];
  while (chars.length < 18) chars.push(pick(pool));

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export default function AdminsPage() {
  const { t } = useTranslation();
  const currentAdmin = useAdminStore((s) => s.admin);
  const [admins, setAdmins] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // Step 2: confirmation card state
  const [confirmStep, setConfirmStep] = useState(false);
  const [confirmPwd, setConfirmPwd] = useState('');
  const [confirmPwdError, setConfirmPwdError] = useState('');
  const [createError, setCreateError] = useState('');

  // Delete state
  const [delId, setDelId] = useState<string | null>(null);
  const [delError, setDelError] = useState('');
  const [delPassword, setDelPassword] = useState('');
  const [delPasswordError, setDelPasswordError] = useState('');

  const loadAdmins = () =>
    adminApi.get('/admins').then((res) => setAdmins(res.data.data)).catch(() => setAdmins([]));

  useEffect(() => { void loadAdmins(); }, []); // eslint-disable-line

  const closeCreate = () => {
    setOpen(false);
    setConfirmStep(false);
    setConfirmPwd('');
    setConfirmPwdError('');
    setCreateError('');
    setForm({ ...EMPTY_FORM });
  };

  // Step 1 → Step 2
  const goToConfirm = () => {
    if (!form.email.trim() || !form.password) return;
    setConfirmPwd('');
    setConfirmPwdError('');
    setCreateError('');
    setConfirmStep(true);
  };

  // Step 2 → submit
  const handleCreate = async () => {
    if (!confirmPwd) { setConfirmPwdError(t('admins.confirmPasswordRequired')); return; }
    setSaving(true);
    setConfirmPwdError('');
    setCreateError('');
    try {
      await adminApi.post('/admins', {
        email: form.email,
        phone: form.phone || undefined,
        fullName: form.fullName,
        password: form.password,
        confirmPassword: confirmPwd,
        permissions: form.permissions,
        role: form.isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN',
        options: {
          mustChangePassword: form.mustChangePassword,
          mustSetup2FA:       form.mustSetup2FA,
          pwdMinLength:       form.pwdMinLength,
          pwdUppercase:       form.pwdUppercase,
          pwdLowercase:       form.pwdLowercase,
          pwdSymbols:         form.pwdSymbols,
        },
      });
      closeCreate();
      await loadAdmins();
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === 'INVALID_CREDENTIALS') setConfirmPwdError(t('admins.confirmPasswordWrong'));
      else setCreateError(t('admins.deleteFailed'));
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (perm: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter((p) => p !== perm)
        : [...f.permissions, perm],
    }));
  };

  const handleToggleActive = async (id: string, currentlyActive: boolean) => {
    try {
      await adminApi.patch(`/admins/${id}/permissions`, { isActive: !currentlyActive });
      setAdmins((prev) => prev.map((a) => a.id === id ? { ...a, isActive: !currentlyActive } : a));
    } catch {
      // silently ignore
    }
  };

  const handleDelete = async () => {
    if (!delId) return;
    if (!delPassword) { setDelPasswordError(t('admins.confirmPasswordRequired')); return; }
    setSaving(true);
    setDelError('');
    setDelPasswordError('');
    try {
      await adminApi.delete(`/admins/${delId}`, { data: { confirmPassword: delPassword } });
      setDelId(null);
      setDelPassword('');
      await loadAdmins();
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === 'INVALID_CREDENTIALS') setDelPasswordError(t('admins.confirmPasswordWrong'));
      else setDelError(t('admins.deleteFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">{t('admins.title')}</h1>
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-all"
        >
          {t('admins.newAdmin')}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#111118]">
        <table className="min-w-full text-sm">
          <thead className="text-slate-300 border-b border-white/[0.06] bg-[#0f0f17]">
            <tr>
              <th className="px-3 py-2 text-start text-xs font-semibold">{t('admins.email')}</th>
              <th className="px-3 py-2 text-start text-xs font-semibold">{t('admins.name')}</th>
              <th className="px-3 py-2 text-start text-xs font-semibold">{t('admins.role')}</th>
              <th className="px-3 py-2 text-start text-xs font-semibold">{t('admins.active')}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {admins.map((a) => (
              <tr key={a.id} className="hover:bg-white/[0.02]">
                <td className="px-3 py-2 text-slate-200">{a.email}</td>
                <td className="px-3 py-2 text-slate-300">{a.fullName}</td>
                <td className="px-3 py-2"><Badge label={a.role ?? 'ADMIN'} /></td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${
                    a.isActive
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-slate-500/10 text-slate-500'
                  }`}>
                    {a.isActive ? t('common.yes') : t('common.no')}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {a.id !== currentAdmin?.id && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void handleToggleActive(a.id, a.isActive)}
                        title={a.isActive ? t('admins.deactivate') : t('admins.activate')}
                        className={`transition-colors ${
                          a.isActive
                            ? 'text-emerald-500/60 hover:text-amber-400'
                            : 'text-slate-600 hover:text-emerald-400'
                        }`}
                      >
                        {a.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                      <button
                        onClick={() => setDelId(a.id)}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete modal */}
      <Modal
        open={!!delId}
        onClose={() => { setDelId(null); setDelPassword(''); setDelPasswordError(''); setDelError(''); }}
        title={t('admins.deleteTitle')}
        width="max-w-sm"
      >
        <p className="text-sm text-slate-400 mb-4">{t('admins.deleteMsg')}</p>
        <div className="mb-4">
          <label className="text-xs text-slate-400 block mb-1.5">{t('admins.confirmYourPassword')}</label>
          <input
            type="password"
            placeholder="••••••••"
            value={delPassword}
            onChange={(e) => { setDelPassword(e.target.value); setDelPasswordError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleDelete(); }}
            className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500/50"
            autoFocus
          />
          {(delPasswordError || delError) && (
            <p className="text-xs text-red-400 mt-1">{delPasswordError || delError}</p>
          )}
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => { setDelId(null); setDelPassword(''); setDelPasswordError(''); setDelError(''); }}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleDelete}
            disabled={saving || !delPassword}
            className="px-4 py-2 text-sm font-semibold bg-red-500 hover:bg-red-400 text-white rounded-lg disabled:opacity-50 transition-all"
          >
            {saving ? t('common.loading') : t('common.delete')}
          </button>
        </div>
      </Modal>

      {/* Create modal — two steps */}
      <Modal
        open={open}
        onClose={closeCreate}
        title={t('admins.newAdmin')}
        width="max-w-md"
      >
        {!confirmStep ? (
          /* ── Step 1: form ── */
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">{t('admins.email')}</label>
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">{t('admins.phone')}</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+201XXXXXXXXX"
                className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">{t('admins.fullName')}</label>
              <input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">{t('admins.password')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="flex-1 px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, password: buildPassword(f) }))}
                  className="px-3 py-2 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors shrink-0"
                >
                  {t('admins.generatePassword')}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">{t('admins.permissions')}</label>
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
            <div className="pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={form.isSuperAdmin}
                  onChange={(e) => setForm((f) => ({ ...f, isSuperAdmin: e.target.checked }))}
                  className="w-3 h-3 rounded border border-white/[0.2] bg-transparent"
                />
                <span>{t('admins.superAdmin')}</span>
              </label>
              <p className="mt-1 text-[11px] text-slate-500">{t('admins.superAdminNote')}</p>
            </div>

            <div className="border-t border-white/[0.06] pt-3 space-y-3">
              <p className="text-xs text-slate-500">{t('admins.securityOptions')}</p>

              <div className="space-y-1.5">
                {([
                  ['mustChangePassword', t('admins.optMustChangePassword')],
                  ['mustSetup2FA',       t('admins.optMustSetup2FA')],
                ] as [keyof typeof form, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={form[key] as boolean}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer" />
                    <span className="text-xs text-slate-300 group-hover:text-white transition-colors">{label}</span>
                  </label>
                ))}
              </div>

              <div>
                <p className="text-[11px] text-slate-600 mb-1.5">{t('admins.pwdRulesLabel')}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    ['pwdMinLength', t('admins.pwdMinLength')],
                    ['pwdUppercase', t('admins.pwdUppercase')],
                    ['pwdLowercase', t('admins.pwdLowercase')],
                    ['pwdSymbols',   t('admins.pwdSymbols')],
                  ] as [keyof typeof form, string][]).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={form[key] as boolean}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                        className="w-3.5 h-3.5 rounded accent-violet-500 cursor-pointer" />
                      <span className="text-xs text-slate-400 group-hover:text-white transition-colors">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeCreate}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={goToConfirm}
                disabled={!form.email || !form.password}
                className="px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg disabled:opacity-50 transition-all"
              >
                {t('common.create')}
              </button>
            </div>
          </div>
        ) : (
          /* ── Step 2: final confirmation ── */
          <div className="space-y-4">
            {/* Summary card */}
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.07] p-3 space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs">{t('admins.email')}</span>
                <span className="text-slate-200 font-medium">{form.email}</span>
              </div>
              {form.fullName && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">{t('admins.fullName')}</span>
                  <span className="text-slate-200">{form.fullName}</span>
                </div>
              )}
              {form.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">{t('admins.phone')}</span>
                  <span className="text-slate-200">{form.phone}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs">{t('admins.role')}</span>
                <span className="text-slate-200">{form.isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN'}</span>
              </div>
            </div>

            {/* Password confirmation */}
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-4 space-y-3">
              <p className="text-xs text-amber-400/90">{t('admins.confirmYourPasswordHint')}</p>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">{t('admins.confirmYourPassword')}</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPwd}
                  onChange={(e) => { setConfirmPwd(e.target.value); setConfirmPwdError(''); setCreateError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
                  autoFocus
                  className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                />
                {(confirmPwdError || createError) && (
                  <p className="text-xs text-red-400 mt-1">{confirmPwdError || createError}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => { setConfirmStep(false); setConfirmPwd(''); setConfirmPwdError(''); setCreateError(''); }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">
                {t('common.back')}
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving || !confirmPwd}
                className="px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg disabled:opacity-50 transition-all"
              >
                {saving ? t('common.creating') : t('common.confirm')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
