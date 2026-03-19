import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/adminApi';
import { useAdminStore } from '../store/adminAuthStore';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { Trash2, ToggleLeft, ToggleRight, Pencil, KeyRound, ShieldOff, Copy, RefreshCw, Check, Eye, EyeOff, Sliders } from 'lucide-react';

const PERMS = [
  'users.view',
  'users.edit',
  'users.delete',
  'discounts.view',
  'discounts.manage',
  'support.view',
  'support.reply',
  'support.assign',
  'support.manage',
  'analytics.view',
  'blocklist.manage',
  'notifications.send',
];

function getPermLabels(t: (k: string) => string): Record<string, string> {
  return {
    'users.view':         t('admins.permUsersView'),
    'users.edit':         t('admins.permUsersEdit'),
    'users.delete':       t('admins.permUsersDelete'),
    'discounts.view':     t('admins.permDiscountsView'),
    'discounts.manage':   t('admins.permDiscountsManage'),
    'support.view':       t('admins.permSupportView'),
    'support.reply':      t('admins.permSupportReply'),
    'support.assign':     t('admins.permSupportAssign'),
    'support.manage':     t('admins.permSupportManage'),
    'analytics.view':     t('admins.permAnalyticsView'),
    'blocklist.manage':   t('admins.permBlocklistManage'),
    'notifications.send': t('admins.permNotificationsSend'),
  };
}

function getPermGroups(t: (k: string) => string): { label: string; perms: string[] }[] {
  return [
    { label: t('admins.permGroupUsers'),     perms: ['users.view', 'users.edit', 'users.delete'] },
    { label: t('admins.permGroupDiscounts'), perms: ['discounts.view', 'discounts.manage'] },
    { label: t('admins.permGroupSupport'),   perms: ['support.view', 'support.reply', 'support.assign', 'support.manage'] },
    { label: t('admins.permGroupOther'),     perms: ['analytics.view', 'blocklist.manage', 'notifications.send'] },
  ];
}

// Enabling a permission auto-enables these prerequisites
const PERM_REQUIRES: Record<string, string[]> = {
  'users.edit':       ['users.view'],
  'users.delete':     ['users.view', 'users.edit'],
  'discounts.manage': ['discounts.view'],
  'support.reply':    ['support.view'],
  'support.assign':   ['support.view'],
  'support.manage':   ['support.view', 'support.reply', 'support.assign'],
};

// Disabling a permission auto-disables permissions that need it
const PERM_BLOCKS: Record<string, string[]> = {
  'users.view':     ['users.edit', 'users.delete'],
  'users.edit':     ['users.delete'],
  'discounts.view': ['discounts.manage'],
  'support.view':   ['support.reply', 'support.assign', 'support.manage'],
  'support.reply':  ['support.manage'],
  'support.assign': ['support.manage'],
};

// Only removes — never enables anything
function disablePerm(perm: string, current: string[]): string[] {
  if (!current.includes(perm)) return current;
  const result = current.filter((p) => p !== perm);
  return (PERM_BLOCKS[perm] ?? []).reduce((acc, blocked) => disablePerm(blocked, acc), result);
}

// Only adds — never removes anything
function enablePerm(perm: string, current: string[]): string[] {
  if (current.includes(perm)) return current;
  const withDeps = (PERM_REQUIRES[perm] ?? []).reduce(
    (acc, req) => enablePerm(req, acc),
    [...current]
  );
  return [...new Set([...withDeps, perm])];
}

function resolvePermToggle(perm: string, current: string[]): string[] {
  return current.includes(perm) ? disablePerm(perm, current) : enablePerm(perm, current);
}

// ── Preset roles ────────────────────────────────────────────────
type PresetRole = { label: string; color: string; desc: string; permissions: string[] };
function getPresetRoles(t: (k: string) => string): PresetRole[] {
  return [
    {
      label: t('admins.presetSupportAgent'),
      color: 'blue',
      desc: t('admins.presetSupportAgentDesc'),
      permissions: ['support.view', 'support.reply'],
    },
    {
      label: t('admins.presetSupportManager'),
      color: 'violet',
      desc: t('admins.presetSupportManagerDesc'),
      permissions: ['support.view', 'support.reply', 'support.assign', 'support.manage'],
    },
    {
      label: t('admins.presetContentManager'),
      color: 'amber',
      desc: t('admins.presetContentManagerDesc'),
      permissions: ['discounts.view', 'discounts.manage', 'notifications.send'],
    },
    {
      label: t('admins.presetAnalyst'),
      color: 'emerald',
      desc: t('admins.presetAnalystDesc'),
      permissions: ['users.view', 'analytics.view'],
    },
    {
      label: t('admins.presetAuditor'),
      color: 'rose',
      desc: t('admins.presetAuditorDesc'),
      permissions: ['users.view', 'analytics.view'],
    },
    {
      label: t('admins.presetModerator'),
      color: 'orange',
      desc: t('admins.presetModeratorDesc'),
      permissions: ['users.view', 'users.edit', 'support.view', 'support.reply'],
    },
  ];
}

const ROLE_COLORS: Record<string, string> = {
  blue:    'bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20',
  violet:  'bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20',
  amber:   'bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20',
  rose:    'bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20',
  orange:  'bg-orange-500/10 text-orange-300 border border-orange-500/20 hover:bg-orange-500/20',
};

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
  if (!rules.pwdUppercase && !rules.pwdLowercase) pool += lower;

  const chars: string[] = [...required];
  while (chars.length < 18) chars.push(pick(pool));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

// Step indicator
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all ${
            i + 1 === current
              ? 'w-5 h-1.5 bg-emerald-400'
              : i + 1 < current
              ? 'w-1.5 h-1.5 bg-emerald-600'
              : 'w-1.5 h-1.5 bg-white/10'
          }`}
        />
      ))}
    </div>
  );
}

export default function AdminsPage() {
  const { t } = useTranslation();
  const currentAdmin = useAdminStore((s) => s.admin);
  const PERM_LABELS = getPermLabels(t);
  const PERM_GROUPS = getPermGroups(t);
  const PRESET_ROLES = getPresetRoles(t);
  const [admins, setAdmins] = useState<any[]>([]);

  // Create modal state
  const [open, setOpen]     = useState(false);
  const [step, setStep]     = useState(1);   // 1..4
  const [saving, setSaving] = useState(false);
  const [form, setForm]     = useState({ ...EMPTY_FORM });
  const [confirmPwd, setConfirmPwd]         = useState('');
  const [confirmPwdError, setConfirmPwdError] = useState('');
  const [createError, setCreateError]       = useState('');

  // Eye toggle states
  const [showConfirmPwd, setShowConfirmPwd]       = useState(false);
  const [showDelPassword, setShowDelPassword]     = useState(false);
  const [showResetPwdConfirm, setShowResetPwdConfirm] = useState(false);
  const [showReset2FAPwd, setShowReset2FAPwd]     = useState(false);

  // Step 1 validation errors
  const [step1EmailError, setStep1EmailError]   = useState('');
  const [step1PhoneError, setStep1PhoneError]   = useState('');
  const [step1PwdError, setStep1PwdError]       = useState('');

  // Edit profile validation errors
  const [editEmailError, setEditEmailError]     = useState('');
  const [editFullNameError, setEditFullNameError] = useState('');

  // Reset password new value validation
  const [resetPwdNewError, setResetPwdNewError] = useState('');

  // Delete state
  const [delId, setDelId]               = useState<string | null>(null);
  const [delError, setDelError]         = useState('');
  const [delPassword, setDelPassword]   = useState('');
  const [delPasswordError, setDelPasswordError] = useState('');

  // Edit profile state
  const [editAdmin, setEditAdmin] = useState<{ id: string; fullName: string; email: string } | null>(null);
  const [editForm, setEditForm]   = useState({ fullName: '', email: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState('');

  // Reset password state
  const [resetPwdId, setResetPwdId]   = useState<string | null>(null);
  const [resetPwdNew, setResetPwdNew] = useState('');
  const [resetPwdConfirm, setResetPwdConfirm] = useState('');
  const [resetPwdError, setResetPwdError] = useState('');
  const [resetPwdCopied, setResetPwdCopied] = useState(false);

  // Reset 2FA state
  const [reset2FAId, setReset2FAId]   = useState<string | null>(null);
  const [reset2FAPwd, setReset2FAPwd] = useState('');
  const [reset2FAError, setReset2FAError] = useState('');

  // Edit permissions state
  const [editPermAdmin, setEditPermAdmin] = useState<{ id: number; email: string; fullName: string; permissions: string[]; managerId: number | null } | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editPermManagerId, setEditPermManagerId] = useState<string>('');
  const [editPermSaving, setEditPermSaving] = useState(false);

  // Team group modal
  const [teamGroup, setTeamGroup] = useState<{ label: string; desc: string; color: string; members: any[] } | null>(null);
  const [supportManagers, setSupportManagers] = useState<{ id: number; fullName: string; email: string }[]>([]);

  const loadAdmins = () =>
    adminApi.get('/admins').then((r) => setAdmins(r.data.data)).catch(() => setAdmins([]));

  const loadSupportManagers = () =>
    adminApi.get('/admins')
      .then((r) => setSupportManagers((r.data.data ?? []).filter((a: any) => (a.permissions ?? []).includes('support.manage'))))
      .catch(() => null);

  const handleSavePermissions = async () => {
    if (!editPermAdmin) return;
    setEditPermSaving(true);
    try {
      await adminApi.patch(`/admins/${editPermAdmin.id}/permissions`, {
        permissions: editPermissions,
        managerId: editPermManagerId ? parseInt(editPermManagerId, 10) : null,
      });
      setAdmins((prev) =>
        prev.map((a) =>
          a.id === editPermAdmin.id
            ? { ...a, permissions: editPermissions, managerId: editPermManagerId ? parseInt(editPermManagerId, 10) : null }
            : a
        )
      );
      setEditPermAdmin(null);
    } catch { /* ignore */ }
    finally { setEditPermSaving(false); }
  };

  const toggleEditPermission = (perm: string) =>
    setEditPermissions((prev) => resolvePermToggle(perm, prev));

  useEffect(() => { void loadAdmins(); }, []); // eslint-disable-line

  /* ── validation helpers ── */
  const validateEmail = (value: string) => {
    if (!value.includes('@') || !value.includes('.')) return t('admins.emailInvalid');
    const domain = value.split('@')[1]?.toLowerCase() ?? '';
    const ALLOWED_DOMAINS = [
      // Google
      'gmail.com', 'googlemail.com',
      // Microsoft
      'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'hotmail.fr',
      'live.com', 'live.co.uk', 'msn.com',
      // Apple
      'icloud.com', 'me.com', 'mac.com',
      // Yahoo
      'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de', 'ymail.com',
      // ProtonMail
      'proton.me', 'protonmail.com',
      // Zoho
      'zoho.com', 'zohomail.com',
      // AOL
      'aol.com',
      // Arabic/regional
      'mail.ru', 'yandex.com', 'yandex.ru',
    ];
    if (!ALLOWED_DOMAINS.includes(domain)) return t('admins.emailDomainBlocked');
    return '';
  };

  const validatePhone = (value: string) => {
    if (value && !/^[+]?[0-9\s\-()]{7,15}$/.test(value)) return 'Invalid phone number';
    return '';
  };

  /* ── helpers ── */
  const closeCreate = () => {
    setOpen(false);
    setStep(1);
    setForm({ ...EMPTY_FORM });
    setConfirmPwd('');
    setConfirmPwdError('');
    setCreateError('');
    setStep1EmailError('');
    setStep1PhoneError('');
    setStep1PwdError('');
    setShowConfirmPwd(false);
  };

  const goBack  = () => setStep((s) => Math.max(1, s - 1));

  const goNextFromStep1 = () => {
    const emailErr = validateEmail(form.email);
    const phoneErr = validatePhone(form.phone);
    const pwdErr   = form.password && form.password.length < 18 ? 'Password must be at least 18 characters' : '';
    setStep1EmailError(emailErr);
    setStep1PhoneError(phoneErr);
    setStep1PwdError(pwdErr);
    if (emailErr || phoneErr || pwdErr) return;
    if (!form.email.trim() || !form.password.trim()) return;
    setStep((s) => Math.min(4, s + 1));
  };

  const goNext  = () => setStep((s) => Math.min(4, s + 1));

  const togglePermission = (perm: string) =>
    setForm((f) => ({ ...f, permissions: resolvePermToggle(perm, f.permissions) }));

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

  const handleToggleActive = async (id: string, currentlyActive: boolean) => {
    try {
      await adminApi.patch(`/admins/${id}/permissions`, { isActive: !currentlyActive });
      setAdmins((prev) => prev.map((a) => a.id === id ? { ...a, isActive: !currentlyActive } : a));
    } catch { /* ignore */ }
  };

  const handleEditProfile = async () => {
    if (!editAdmin) return;
    const emailErr = validateEmail(editForm.email);
    const nameErr  = !editForm.fullName.trim() ? 'Full name is required' : '';
    setEditEmailError(emailErr);
    setEditFullNameError(nameErr);
    if (emailErr || nameErr) return;

    setEditSaving(true); setEditError('');
    try {
      const res = await adminApi.patch(`/admins/${editAdmin.id}/profile`, editForm);
      setAdmins((prev) => prev.map((a) => a.id === editAdmin.id ? { ...a, ...res.data.data } : a));
      setEditAdmin(null);
    } catch (err: any) {
      const code = err?.response?.data?.error;
      setEditError(code === 'EMAIL_ALREADY_EXISTS' ? t('admins.emailExists') : (code ?? 'Failed'));
    } finally { setEditSaving(false); }
  };

  const handleResetPassword = async () => {
    if (!resetPwdId) return;
    if (!resetPwdNew || resetPwdNew.length < 18) { setResetPwdError(t('account.passwordTooWeak')); return; }
    setSaving(true); setResetPwdError('');
    try {
      await adminApi.post(`/admins/${resetPwdId}/reset-password`, { newPassword: resetPwdNew, confirmPassword: resetPwdConfirm });
      setResetPwdId(null); setResetPwdNew(''); setResetPwdConfirm('');
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === 'INVALID_CREDENTIALS') setResetPwdError(t('admins.confirmPasswordWrong'));
      else setResetPwdError(code ?? 'Failed');
    } finally { setSaving(false); }
  };

  const handleReset2FA = async () => {
    if (!reset2FAId) return;
    setSaving(true); setReset2FAError('');
    try {
      await adminApi.post(`/admins/${reset2FAId}/reset-2fa`, { confirmPassword: reset2FAPwd });
      setAdmins((prev) => prev.map((a) => a.id === reset2FAId ? { ...a, twoFactorEnabled: false } : a));
      setReset2FAId(null); setReset2FAPwd('');
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === 'INVALID_CREDENTIALS') setReset2FAError(t('admins.confirmPasswordWrong'));
      else setReset2FAError(code ?? 'Failed');
    } finally { setSaving(false); }
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

  /* ── step content ── */
  const renderStep = () => {
    switch (step) {
      /* ─── Step 1: basic info + password ─── */
      case 1:
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">{t('admins.email')}</label>
              <input
                value={form.email}
                onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); setStep1EmailError(''); }}
                onBlur={() => setStep1EmailError(validateEmail(form.email))}
                className={`w-full px-3 py-2 text-sm bg-[#0d0d14] border rounded-lg text-white focus:outline-none focus:border-emerald-500/50 ${step1EmailError ? 'border-red-500/50' : 'border-white/[0.08]'}`}
              />
              {step1EmailError && <p className="text-xs text-red-400 mt-1">{step1EmailError}</p>}
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">{t('admins.phone')}</label>
              <input
                value={form.phone}
                onChange={(e) => { setForm((f) => ({ ...f, phone: e.target.value })); setStep1PhoneError(''); }}
                onBlur={() => setStep1PhoneError(validatePhone(form.phone))}
                placeholder="+201XXXXXXXXX"
                className={`w-full px-3 py-2 text-sm bg-[#0d0d14] border rounded-lg text-white focus:outline-none focus:border-emerald-500/50 ${step1PhoneError ? 'border-red-500/50' : 'border-white/[0.08]'}`}
              />
              {step1PhoneError && <p className="text-xs text-red-400 mt-1">{step1PhoneError}</p>}
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
                  onChange={(e) => { setForm((f) => ({ ...f, password: e.target.value })); setStep1PwdError(''); }}
                  onBlur={() => {
                    if (form.password && form.password.length < 18) {
                      setStep1PwdError('Password must be at least 18 characters');
                    }
                  }}
                  className={`flex-1 px-3 py-2 text-sm bg-[#0d0d14] border rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500/50 ${step1PwdError ? 'border-red-500/50' : 'border-white/[0.08]'}`}
                />
                <button
                  type="button"
                  onClick={() => { setForm((f) => ({ ...f, password: buildPassword(f) })); setStep1PwdError(''); }}
                  className="px-3 py-2 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors shrink-0"
                >
                  {t('admins.generatePassword')}
                </button>
              </div>
              {step1PwdError && <p className="text-xs text-red-400 mt-1">{step1PwdError}</p>}
            </div>
            {/* password rules (inline preview) */}
            <div className="border-t border-white/[0.06] pt-3">
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

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeCreate}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={goNextFromStep1}
                disabled={!form.email.trim() || !form.password.trim()}
                className="px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg disabled:opacity-50 transition-all"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        );

      /* ─── Step 2: security policy ─── */
      case 2:
        return (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">{t('admins.securityOptions')}</p>
            <div className="space-y-2">
              {([
                ['mustChangePassword', t('admins.optMustChangePassword')],
                ['mustSetup2FA',       t('admins.optMustSetup2FA')],
              ] as [keyof typeof form, string][]).map(([key, label]) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer group rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 hover:bg-white/[0.04] transition-colors">
                  <input type="checkbox" checked={form[key] as boolean}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 rounded accent-emerald-500 cursor-pointer shrink-0" />
                  <span className="text-xs text-slate-300 group-hover:text-white transition-colors leading-relaxed">{label}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-between gap-3 pt-2">
              <button type="button" onClick={goBack}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">
                {t('common.back')}
              </button>
              <button type="button" onClick={goNext}
                className="px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-all">
                {t('common.next')}
              </button>
            </div>
          </div>
        );

      /* ─── Step 3: permissions ─── */
      case 3:
        return (
          <div className="space-y-3">
            {/* Quick preset roles */}
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">{t('admins.quickPresets')}</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_ROLES.map((role) => (
                  <button
                    key={role.label}
                    type="button"
                    title={role.desc}
                    onClick={() => setForm((f) => ({ ...f, permissions: [...role.permissions] }))}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${ROLE_COLORS[role.color]}`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Permission groups grid */}
            <div className="grid grid-cols-2 gap-2">
              {PERM_GROUPS.map((group) => (
                <div key={group.label} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2.5">{group.label}</p>
                  <div className="space-y-2">
                    {group.perms.map((p) => {
                      const isRequired = Object.entries(PERM_REQUIRES).some(
                        ([higher, deps]) => deps.includes(p) && form.permissions.includes(higher)
                      );
                      return (
                        <label key={p} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={form.permissions.includes(p)}
                            onChange={() => togglePermission(p)}
                            disabled={isRequired}
                            className="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer disabled:opacity-40 shrink-0"
                          />
                          <span className={`text-xs leading-tight transition-colors ${isRequired ? 'text-emerald-500/60' : 'text-slate-400 group-hover:text-white'}`}>
                            {PERM_LABELS[p] ?? p}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Super Admin */}
            <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl px-3 py-2.5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isSuperAdmin}
                  onChange={(e) => setForm((f) => ({ ...f, isSuperAdmin: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded accent-amber-400 cursor-pointer shrink-0"
                />
                <div>
                  <span className="text-xs font-semibold text-amber-300">{t('admins.superAdmin')}</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">{t('admins.superAdminNote')}</p>
                </div>
              </label>
            </div>

            <div className="flex justify-between gap-3 pt-1">
              <button type="button" onClick={goBack} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">
                {t('common.back')}
              </button>
              <button type="button" onClick={goNext} className="px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-all">
                {t('common.next')}
              </button>
            </div>
          </div>
        );

      /* ─── Step 4: confirm ─── */
      case 4:
        return (
          <div className="space-y-4">
            {/* summary */}
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.07] p-3 space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs">{t('admins.email')}</span>
                <span className="text-slate-200 font-medium truncate ms-4 max-w-[200px]">{form.email}</span>
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
                <span className={`text-xs font-semibold ${form.isSuperAdmin ? 'text-amber-400' : 'text-slate-200'}`}>
                  {form.isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN'}
                </span>
              </div>
              {form.permissions.length > 0 && (
                <div className="flex items-start justify-between gap-2 pt-0.5">
                  <span className="text-slate-500 text-xs shrink-0">{t('admins.permissions')}</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {form.permissions.map((p) => (
                      <span key={p} className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">{p}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* password confirm */}
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-4 space-y-3">
              <p className="text-xs text-amber-400/90">{t('admins.confirmYourPasswordHint')}</p>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">{t('admins.confirmYourPassword')}</label>
                <div className="relative">
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPwd}
                    onChange={(e) => { setConfirmPwd(e.target.value); setConfirmPwdError(''); setCreateError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
                    autoFocus
                    className="w-full pr-9 px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd((v) => !v)}
                    className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {(confirmPwdError || createError) && (
                  <p className="text-xs text-red-400 mt-1">{confirmPwdError || createError}</p>
                )}
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-1">
              <button type="button" onClick={goBack}
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
        );

      default: return null;
    }
  };

  /* ── render ── */
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">{t('admins.title')}</h1>
        <button
          onClick={() => { setStep(1); setOpen(true); }}
          className="px-3 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-all"
        >
          {t('admins.newAdmin')}
        </button>
      </div>

      {/* Team stats */}
      {admins.length > 0 && (() => {
        const groups = [
          {
            label:   t('dashboard.superAdmins'),
            desc:    t('dashboard.superAdminsDesc'),
            color:   'text-amber-400',
            border:  'border-amber-500/15',
            hover:   'hover:border-amber-500/40',
            members: admins.filter((a) => a.role === 'SUPER_ADMIN'),
          },
          {
            label:   t('dashboard.managers'),
            desc:    t('dashboard.managersDesc'),
            color:   'text-violet-400',
            border:  'border-violet-500/15',
            hover:   'hover:border-violet-500/40',
            members: admins.filter((a) => a.role === 'ADMIN' && a.permissions?.includes('support.manage')),
          },
          {
            label:   t('dashboard.staff'),
            desc:    t('dashboard.staffDesc'),
            color:   'text-blue-400',
            border:  'border-blue-500/15',
            hover:   'hover:border-blue-500/40',
            members: admins.filter((a) => a.role === 'ADMIN' && !a.permissions?.includes('support.manage')),
          },
        ];
        return (
          <div className="grid grid-cols-3 gap-3">
            {groups.map((g) => (
              <button
                key={g.label}
                onClick={() => setTeamGroup(g)}
                className={`rounded-xl border ${g.border} ${g.hover} bg-[#111118] py-4 px-3 flex flex-col items-center gap-1 transition-all cursor-pointer w-full`}
              >
                <span className={`text-2xl font-bold tabular-nums ${g.color}`}>{g.members.length}</span>
                <span className="text-[11px] text-slate-400 font-medium">{g.label}</span>
                <span className="text-[10px] text-slate-600 text-center leading-snug mt-0.5">{g.desc}</span>
              </button>
            ))}
          </div>
        );
      })()}

      {/* Team group modal */}
      <Modal
        open={!!teamGroup}
        title={teamGroup?.label ?? ''}
        onClose={() => setTeamGroup(null)}
      >
        {/* Group description */}
        {teamGroup?.desc && (
          <p className="text-xs text-slate-400 bg-white/[0.03] border border-white/[0.05] rounded-lg px-3 py-2 mb-3">
            {teamGroup.desc}
          </p>
        )}
        {teamGroup?.members.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">لا يوجد أحد في هذه المجموعة</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(teamGroup?.members ?? []).map((a) => {
              const permLabels = getPermLabels(t);
              const visiblePerms = (a.permissions ?? [])
                .filter((p: string) => permLabels[p])
                .slice(0, 3);
              return (
                <div key={a.id} className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                      {(a.fullName?.[0] ?? a.email?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">{a.fullName || '—'}</p>
                      <p className="text-[11px] text-slate-500 truncate">{a.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${a.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {a.isActive ? t('admins.active') : t('admins.deactivate')}
                      </span>
                      {a.lastLoginAt && (
                        <span className="text-[10px] text-slate-600">
                          {new Date(a.lastLoginAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Permissions row for non-super-admins */}
                  {a.role !== 'SUPER_ADMIN' && visiblePerms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 ps-10">
                      {visiblePerms.map((p: string) => (
                        <span key={p} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-400 border border-white/[0.06]">
                          {permLabels[p]}
                        </span>
                      ))}
                      {(a.permissions ?? []).filter((p: string) => permLabels[p]).length > 3 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-500 border border-white/[0.06]">
                          +{(a.permissions ?? []).filter((p: string) => permLabels[p]).length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  {a.role === 'SUPER_ADMIN' && (
                    <div className="mt-2 ps-10">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {t('admins.superAdmin')}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>

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
                      {currentAdmin?.role === 'SUPER_ADMIN' && (
                        <>
                          <button
                            onClick={() => { setEditAdmin({ id: a.id, fullName: a.fullName, email: a.email }); setEditForm({ fullName: a.fullName ?? '', email: a.email ?? '' }); setEditError(''); setEditEmailError(''); setEditFullNameError(''); }}
                            title={t('admins.editProfile')}
                            className="text-slate-600 hover:text-blue-400 transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => { setResetPwdId(a.id); setResetPwdNew(''); setResetPwdConfirm(''); setResetPwdError(''); setResetPwdNewError(''); setShowResetPwdConfirm(false); }}
                            title={t('admins.resetPassword')}
                            className="text-slate-600 hover:text-amber-400 transition-colors"
                          >
                            <KeyRound size={13} />
                          </button>
                          <button
                            onClick={() => { setReset2FAId(a.id); setReset2FAPwd(''); setReset2FAError(''); setShowReset2FAPwd(false); }}
                            title={t('admins.reset2FA')}
                            className="text-slate-600 hover:text-violet-400 transition-colors"
                          >
                            <ShieldOff size={13} />
                          </button>
                          <button
                            onClick={() => {
                              setEditPermAdmin({ id: a.id, email: a.email, fullName: a.fullName, permissions: a.permissions ?? [], managerId: a.managerId ?? null });
                              setEditPermissions(a.permissions ?? []);
                              setEditPermManagerId(a.managerId ? String(a.managerId) : '');
                              void loadSupportManagers();
                            }}
                            title="Edit Permissions"
                            className="text-slate-600 hover:text-emerald-400 transition-colors"
                          >
                            <Sliders size={13} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => void handleToggleActive(a.id, a.isActive)}
                        title={a.isActive ? t('admins.deactivate') : t('admins.activate')}
                        className={`transition-colors ${a.isActive ? 'text-emerald-500/60 hover:text-amber-400' : 'text-slate-600 hover:text-emerald-400'}`}
                      >
                        {a.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                      <button onClick={() => { setDelId(a.id); setShowDelPassword(false); }} className="text-slate-600 hover:text-red-400 transition-colors">
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
        onClose={() => { setDelId(null); setDelPassword(''); setDelPasswordError(''); setDelError(''); setShowDelPassword(false); }}
        title={t('admins.deleteTitle')}
        width="max-w-sm"
      >
        <p className="text-sm text-slate-400 mb-4">{t('admins.deleteMsg')}</p>
        <div className="mb-4">
          <label className="text-xs text-slate-400 block mb-1.5">{t('admins.confirmYourPassword')}</label>
          <div className="relative">
            <input
              type={showDelPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={delPassword}
              onChange={(e) => { setDelPassword(e.target.value); setDelPasswordError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleDelete(); }}
              className="w-full pr-9 px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500/50"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowDelPassword((v) => !v)}
              className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-500 hover:text-slate-300 transition-colors"
              tabIndex={-1}
            >
              {showDelPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {(delPasswordError || delError) && (
            <p className="text-xs text-red-400 mt-1">{delPasswordError || delError}</p>
          )}
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => { setDelId(null); setDelPassword(''); setDelPasswordError(''); setDelError(''); setShowDelPassword(false); }}
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

      {/* Edit Profile modal */}
      <Modal
        open={!!editAdmin}
        onClose={() => { setEditAdmin(null); setEditEmailError(''); setEditFullNameError(''); }}
        title={t('admins.editProfile')}
        width="max-w-sm"
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">{t('admins.fullName')}</label>
            <input
              value={editForm.fullName}
              onChange={(e) => { setEditForm((f) => ({ ...f, fullName: e.target.value })); setEditFullNameError(''); }}
              onBlur={() => { if (!editForm.fullName.trim()) setEditFullNameError('Full name is required'); }}
              className={`w-full px-3 py-2 text-sm bg-[#0d0d14] border rounded-lg text-white focus:outline-none focus:border-emerald-500/50 ${editFullNameError ? 'border-red-500/50' : 'border-white/[0.08]'}`}
            />
            {editFullNameError && <p className="text-xs text-red-400 mt-1">{editFullNameError}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">{t('admins.email')}</label>
            <input
              value={editForm.email}
              onChange={(e) => { setEditForm((f) => ({ ...f, email: e.target.value })); setEditEmailError(''); }}
              onBlur={() => setEditEmailError(validateEmail(editForm.email))}
              className={`w-full px-3 py-2 text-sm bg-[#0d0d14] border rounded-lg text-white focus:outline-none focus:border-emerald-500/50 ${editEmailError ? 'border-red-500/50' : 'border-white/[0.08]'}`}
            />
            {editEmailError && <p className="text-xs text-red-400 mt-1">{editEmailError}</p>}
          </div>
          {editError && <p className="text-xs text-red-400">{editError}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => { setEditAdmin(null); setEditEmailError(''); setEditFullNameError(''); }} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">{t('common.cancel')}</button>
            <button
              onClick={handleEditProfile}
              disabled={editSaving || !editForm.fullName.trim() || !editForm.email.trim()}
              className="px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg disabled:opacity-50 transition-all"
            >
              {editSaving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reset Password modal */}
      <Modal
        open={!!resetPwdId}
        onClose={() => { setResetPwdId(null); setResetPwdNew(''); setResetPwdConfirm(''); setResetPwdError(''); setResetPwdCopied(false); setResetPwdNewError(''); setShowResetPwdConfirm(false); }}
        title={t('admins.resetPassword')}
        width="max-w-sm"
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">{t('admins.newPasswordLabel')}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={resetPwdNew}
                onChange={(e) => { setResetPwdNew(e.target.value); setResetPwdError(''); setResetPwdCopied(false); setResetPwdNewError(''); }}
                onBlur={() => {
                  if (resetPwdNew && resetPwdNew.length < 18) {
                    setResetPwdNewError('Password must be at least 18 characters');
                  }
                }}
                className={`flex-1 min-w-0 px-3 py-2 text-sm bg-[#0d0d14] border rounded-lg text-white font-mono focus:outline-none focus:border-amber-500/50 ${resetPwdNewError ? 'border-red-500/50' : 'border-white/[0.08]'}`}
              />
              {/* Generate */}
              <button
                type="button"
                title="Generate password"
                onClick={() => {
                  const pwd = buildPassword({ pwdUppercase: true, pwdLowercase: true, pwdSymbols: true });
                  setResetPwdNew(pwd);
                  setResetPwdError('');
                  setResetPwdCopied(false);
                  setResetPwdNewError('');
                }}
                className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 rounded-lg transition-colors shrink-0"
              >
                <RefreshCw size={12} /> {t('admins.generatePassword')}
              </button>
              {/* Copy */}
              <button
                type="button"
                title="Copy password"
                disabled={!resetPwdNew}
                onClick={() => {
                  if (!resetPwdNew) return;
                  void navigator.clipboard.writeText(resetPwdNew).then(() => {
                    setResetPwdCopied(true);
                    setTimeout(() => setResetPwdCopied(false), 2000);
                  });
                }}
                className={`flex items-center gap-1 px-2.5 py-2 text-xs font-medium border rounded-lg transition-all shrink-0 disabled:opacity-40 ${
                  resetPwdCopied
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-white/[0.06] hover:bg-white/[0.1] border-white/[0.08] text-slate-300'
                }`}
              >
                {resetPwdCopied ? <Check size={12} /> : <Copy size={12} />}
                {resetPwdCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            {resetPwdNewError && <p className="text-xs text-red-400 mt-1">{resetPwdNewError}</p>}
          </div>

          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 space-y-2">
            <p className="text-xs text-amber-400/80">{t('admins.confirmYourPasswordHint')}</p>
            <div className="relative">
              <input
                type={showResetPwdConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                value={resetPwdConfirm}
                onChange={(e) => { setResetPwdConfirm(e.target.value); setResetPwdError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleResetPassword(); }}
                className="w-full pr-9 px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-amber-500/50"
              />
              <button
                type="button"
                onClick={() => setShowResetPwdConfirm((v) => !v)}
                className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-500 hover:text-slate-300 transition-colors"
                tabIndex={-1}
              >
                {showResetPwdConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {resetPwdError && <p className="text-xs text-red-400">{resetPwdError}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={() => { setResetPwdId(null); setResetPwdNew(''); setResetPwdConfirm(''); setResetPwdError(''); setResetPwdCopied(false); setResetPwdNewError(''); setShowResetPwdConfirm(false); }}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleResetPassword}
              disabled={saving || !resetPwdNew || !resetPwdConfirm}
              className="px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg disabled:opacity-50 transition-all"
            >
              {saving ? t('common.loading') : t('admins.resetPassword')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reset 2FA modal */}
      <Modal
        open={!!reset2FAId}
        onClose={() => { setReset2FAId(null); setReset2FAPwd(''); setReset2FAError(''); setShowReset2FAPwd(false); }}
        title={t('admins.reset2FA')}
        width="max-w-sm"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-400">{t('admins.reset2FAMsg')}</p>
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 space-y-2">
            <p className="text-xs text-amber-400/80">{t('admins.confirmYourPasswordHint')}</p>
            <div className="relative">
              <input
                type={showReset2FAPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={reset2FAPwd}
                onChange={(e) => { setReset2FAPwd(e.target.value); setReset2FAError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleReset2FA(); }}
                autoFocus
                className="w-full pr-9 px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-amber-500/50"
              />
              <button
                type="button"
                onClick={() => setShowReset2FAPwd((v) => !v)}
                className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-500 hover:text-slate-300 transition-colors"
                tabIndex={-1}
              >
                {showReset2FAPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          {reset2FAError && <p className="text-xs text-red-400">{reset2FAError}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => { setReset2FAId(null); setReset2FAPwd(''); setReset2FAError(''); setShowReset2FAPwd(false); }} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">{t('common.cancel')}</button>
            <button
              onClick={handleReset2FA}
              disabled={saving || !reset2FAPwd}
              className="px-4 py-2 text-sm font-semibold bg-violet-500 hover:bg-violet-400 text-white rounded-lg disabled:opacity-50 transition-all"
            >
              {saving ? t('common.loading') : t('admins.reset2FA')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Permissions Modal */}
      <Modal
        open={!!editPermAdmin}
        onClose={() => setEditPermAdmin(null)}
        title={`Permissions — ${editPermAdmin?.fullName || editPermAdmin?.email}`}
      >
        {editPermAdmin && (
          <div className="space-y-3">
            {/* Quick preset roles */}
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">{t('admins.quickPresets')}</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_ROLES.map((role) => (
                  <button
                    key={role.label}
                    type="button"
                    title={role.desc}
                    onClick={() => setEditPermissions([...role.permissions])}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${ROLE_COLORS[role.color]}`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {PERM_GROUPS.map((group) => (
                <div key={group.label} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2.5">{group.label}</p>
                  <div className="space-y-2">
                    {group.perms.map((p) => {
                      const isRequired = Object.entries(PERM_REQUIRES).some(
                        ([higher, deps]) => deps.includes(p) && editPermissions.includes(higher)
                      );
                      return (
                        <label key={p} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={editPermissions.includes(p)}
                            onChange={() => toggleEditPermission(p)}
                            disabled={isRequired}
                            className="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer disabled:opacity-40 shrink-0"
                          />
                          <span className={`text-xs leading-tight transition-colors ${isRequired ? 'text-emerald-500/60' : 'text-slate-400 group-hover:text-white'}`}>
                            {PERM_LABELS[p] ?? p}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Manager assignment — shown when admin has support.reply but not support.manage */}
            {editPermissions.includes('support.reply') && !editPermissions.includes('support.manage') && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-3 py-3">
                <label className="text-xs text-slate-400 block mb-1.5">Reports to Support Manager</label>
                <select
                  value={editPermManagerId}
                  onChange={(e) => setEditPermManagerId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none focus:border-blue-500/40"
                >
                  <option value="">— No manager assigned —</option>
                  {supportManagers.map((m) => (
                    <option key={m.id} value={String(m.id)}>{m.fullName || m.email}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setEditPermAdmin(null)} className="px-4 py-2 text-sm text-slate-400">
                {t('common.cancel')}
              </button>
              <button
                onClick={() => void handleSavePermissions()}
                disabled={editPermSaving}
                className="px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg disabled:opacity-50 transition-all"
              >
                {editPermSaving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create modal — 4 steps */}
      <Modal
        open={open}
        onClose={closeCreate}
        title={`${t('admins.newAdmin')} (${step}/4)`}
        width="max-w-md"
      >
        <StepDots current={step} total={4} />
        {renderStep()}
      </Modal>
    </div>
  );
}
