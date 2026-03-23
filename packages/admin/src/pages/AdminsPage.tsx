import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Copy, Check, Eye, EyeOff } from 'lucide-react';

import { adminApi } from '../lib/adminApi';
import { useAdminStore } from '../store/adminAuthStore';
import { Modal } from '../components/Modal';

import { resolvePermToggle, getPermLabels } from '../components/admins/permissions';
import { buildPassword, getPresetRoles, ROLE_COLORS } from '../components/admins/presetRoles';
import { StepDots } from '../components/admins/StepDots';
import { PermissionsPanel } from '../components/admins/PermissionsPanel';
import { AdminTable } from '../components/admins/AdminTable';

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
  managerId: '' as string,
};

export default function AdminsPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const currentAdmin = useAdminStore((s) => s.admin);
  const PERM_LABELS = getPermLabels(t);
  const PRESET_ROLES = getPresetRoles(t);

  const [admins, setAdmins] = useState<any[]>([]);
  const [supportManagers, setSupportManagers] = useState<{ id: number; fullName: string; email: string }[]>([]);

  /* Create modal */
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [confirmPwd, setConfirmPwd] = useState('');
  const [confirmPwdError, setConfirmPwdError] = useState('');
  const [createError, setCreateError] = useState('');
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  /* Step 1 validation */
  const [step1EmailError, setStep1EmailError] = useState('');
  const [step1PhoneError, setStep1PhoneError] = useState('');
  const [step1PwdError, setStep1PwdError] = useState('');
  const [step1FullNameError, setStep1FullNameError] = useState('');

  /* Delete */
  const [delId, setDelId] = useState<string | null>(null);
  const [delError, setDelError] = useState('');
  const [delPassword, setDelPassword] = useState('');
  const [delPasswordError, setDelPasswordError] = useState('');
  const [showDelPassword, setShowDelPassword] = useState(false);

  /* Edit profile */
  const [editAdmin, setEditAdmin] = useState<{ id: string; fullName: string; email: string } | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', email: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editEmailError, setEditEmailError] = useState('');
  const [editFullNameError, setEditFullNameError] = useState('');

  /* Reset password */
  const [resetPwdId, setResetPwdId] = useState<string | null>(null);
  const [resetPwdNew, setResetPwdNew] = useState('');
  const [resetPwdConfirm, setResetPwdConfirm] = useState('');
  const [resetPwdError, setResetPwdError] = useState('');
  const [resetPwdNewError, setResetPwdNewError] = useState('');
  const [resetPwdCopied, setResetPwdCopied] = useState(false);
  const [showResetPwdConfirm, setShowResetPwdConfirm] = useState(false);

  /* Reset 2FA */
  const [reset2FAId, setReset2FAId] = useState<string | null>(null);
  const [reset2FAPwd, setReset2FAPwd] = useState('');
  const [reset2FAError, setReset2FAError] = useState('');
  const [showReset2FAPwd, setShowReset2FAPwd] = useState(false);

  /* Edit permissions */
  const [editPermAdmin, setEditPermAdmin] = useState<{ id: number; email: string; fullName: string; permissions: string[]; managerId: number | null } | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editPermManagerId, setEditPermManagerId] = useState<string>('');
  const [editPermSaving, setEditPermSaving] = useState(false);


  /* ── API ── */
  const loadAdmins = () =>
    adminApi.get('/admins').then((r) => setAdmins(r.data.data)).catch(() => setAdmins([]));

  const loadSupportManagers = () =>
    adminApi.get('/admins')
      .then((r) => setSupportManagers((r.data.data ?? []).filter((a: any) => (a.permissions ?? []).includes('support.manage'))))
      .catch(() => null);

  useEffect(() => { void loadAdmins(); }, []); // eslint-disable-line

  /* ── Validation ── */
  const validateFullName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return t('admins.fullNameRequired');
    if (!/^[a-zA-Z\s'\-]+$/.test(trimmed)) return t('admins.fullNameEnglishOnly');
    if (trimmed.split(/\s+/).filter(Boolean).length < 2) return t('admins.fullNameTwoWords');
    return '';
  };

  const validateEmail = (value: string) => {
    if (/[^\x00-\x7F]/.test(value)) return t('admins.emailNoArabic');
    if (!value.includes('@') || !value.includes('.')) return t('admins.emailInvalid');
    const domain = value.split('@')[1]?.toLowerCase() ?? '';
    const ALLOWED_DOMAINS = [
      'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'hotmail.fr',
      'live.com', 'live.co.uk', 'msn.com', 'icloud.com', 'me.com', 'mac.com',
      'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de', 'ymail.com',
      'proton.me', 'protonmail.com', 'zoho.com', 'zohomail.com', 'aol.com',
      'mail.ru', 'yandex.com', 'yandex.ru',
    ];
    if (!ALLOWED_DOMAINS.includes(domain)) return t('admins.emailDomainBlocked');
    return '';
  };

  const validatePhone = (value: string) => {
    if (!value) return '';
    if (!/^01[0-9]{9}$/.test(value)) return t('admins.phoneEgyptFormat');
    return '';
  };

  /* ── Create modal ── */
  const closeCreate = () => {
    setOpen(false); setStep(1);
    setForm({ ...EMPTY_FORM }); setConfirmPwd('');
    setConfirmPwdError(''); setCreateError('');
    setStep1EmailError(''); setStep1PhoneError('');
    setStep1PwdError(''); setStep1FullNameError('');
    setShowConfirmPwd(false);
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));
  const goNext = () => setStep((s) => Math.min(4, s + 1));

  const goNextFromStep1 = () => {
    const nameErr  = validateFullName(form.fullName);
    const emailErr = validateEmail(form.email);
    const phoneErr = validatePhone(form.phone);
    const pwdErr   = form.password && form.password.length < 18 ? 'Password must be at least 18 characters' : '';
    setStep1FullNameError(nameErr);
    setStep1EmailError(emailErr);
    setStep1PhoneError(phoneErr);
    setStep1PwdError(pwdErr);
    if (nameErr || emailErr || phoneErr || pwdErr) return;
    if (!form.email.trim() || !form.password.trim() || !form.fullName.trim()) return;
    setStep((s) => Math.min(4, s + 1));
  };

  const togglePermission = (perm: string) =>
    setForm((f) => ({ ...f, permissions: resolvePermToggle(perm, f.permissions) }));

  const handleCreate = async () => {
    if (!confirmPwd) { setConfirmPwdError(t('admins.confirmPasswordRequired')); return; }
    setSaving(true); setConfirmPwdError(''); setCreateError('');
    try {
      await adminApi.post('/admins', {
        email: form.email, phone: form.phone || undefined,
        fullName: form.fullName, password: form.password, confirmPassword: confirmPwd,
        permissions: form.permissions,
        role: form.isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN',
        managerId: form.managerId ? parseInt(form.managerId, 10) : null,
        options: {
          mustChangePassword: form.mustChangePassword, mustSetup2FA: form.mustSetup2FA,
          pwdMinLength: form.pwdMinLength, pwdUppercase: form.pwdUppercase,
          pwdLowercase: form.pwdLowercase, pwdSymbols: form.pwdSymbols,
        },
      });
      closeCreate();
      await loadAdmins();
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === 'INVALID_CREDENTIALS') setConfirmPwdError(t('admins.confirmPasswordWrong'));
      else setCreateError(t('admins.deleteFailed'));
    } finally { setSaving(false); }
  };

  /* ── Handlers ── */
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
    setEditEmailError(emailErr); setEditFullNameError(nameErr);
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
    setSaving(true); setDelError(''); setDelPasswordError('');
    try {
      await adminApi.delete(`/admins/${delId}`, { data: { confirmPassword: delPassword } });
      setDelId(null); setDelPassword('');
      await loadAdmins();
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === 'INVALID_CREDENTIALS') setDelPasswordError(t('admins.confirmPasswordWrong'));
      else setDelError(t('admins.deleteFailed'));
    } finally { setSaving(false); }
  };

  const handleSavePermissions = async () => {
    if (!editPermAdmin) return;
    setEditPermSaving(true);
    try {
      await adminApi.patch(`/admins/${editPermAdmin.id}/permissions`, {
        permissions: editPermissions,
        managerId: editPermManagerId ? parseInt(editPermManagerId, 10) : null,
      });
      setAdmins((prev) => prev.map((a) =>
        a.id === editPermAdmin.id
          ? { ...a, permissions: editPermissions, managerId: editPermManagerId ? parseInt(editPermManagerId, 10) : null }
          : a
      ));
      setEditPermAdmin(null);
    } catch { /* ignore */ }
    finally { setEditPermSaving(false); }
  };

  /* ── Step renderer ── */
  const renderStep = () => {
    switch (step) {
      case 1: return (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">{t('admins.email')}</label>
            <input
              value={form.email}
              onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value.replace(/[^\x00-\x7F]/g, '') })); setStep1EmailError(''); }}
              onBlur={() => setStep1EmailError(validateEmail(form.email))}
              placeholder="name@gmail.com"
              className={`w-full px-3 py-2 text-sm bg-[#0d0d14] border rounded-lg text-white focus:outline-none focus:border-emerald-500/50 ${step1EmailError ? 'border-red-500/50' : 'border-white/[0.08]'}`}
            />
            {step1EmailError && <p className="text-xs text-red-400 mt-1">{step1EmailError}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">{t('admins.phone')}</label>
            <input
              value={form.phone}
              onChange={(e) => { setForm((f) => ({ ...f, phone: e.target.value.replace(/[^0-9]/g, '') })); setStep1PhoneError(''); }}
              onBlur={() => setStep1PhoneError(validatePhone(form.phone))}
              placeholder="01XXXXXXXXX" maxLength={11}
              className={`w-full px-3 py-2 text-sm bg-[#0d0d14] border rounded-lg text-white focus:outline-none focus:border-emerald-500/50 ${step1PhoneError ? 'border-red-500/50' : 'border-white/[0.08]'}`}
            />
            {step1PhoneError && <p className="text-xs text-red-400 mt-1">{step1PhoneError}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">{t('admins.fullName')}</label>
            <input
              value={form.fullName}
              onChange={(e) => { setForm((f) => ({ ...f, fullName: e.target.value.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, '') })); setStep1FullNameError(''); }}
              onBlur={() => setStep1FullNameError(validateFullName(form.fullName))}
              placeholder="e.g. Ahmed Mohamed"
              className={`w-full px-3 py-2 text-sm bg-[#0d0d14] border rounded-lg text-white focus:outline-none focus:border-emerald-500/50 ${step1FullNameError ? 'border-red-500/50' : 'border-white/[0.08]'}`}
            />
            {step1FullNameError && <p className="text-xs text-red-400 mt-1">{step1FullNameError}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">{t('admins.password')}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.password}
                onChange={(e) => { setForm((f) => ({ ...f, password: e.target.value })); setStep1PwdError(''); }}
                onBlur={() => { if (form.password && form.password.length < 18) setStep1PwdError('Password must be at least 18 characters'); }}
                className={`flex-1 px-3 py-2 text-sm bg-[#0d0d14] border rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500/50 ${step1PwdError ? 'border-red-500/50' : 'border-white/[0.08]'}`}
              />
              <button type="button" onClick={() => { setForm((f) => ({ ...f, password: buildPassword(f) })); setStep1PwdError(''); }} className="px-3 py-2 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors shrink-0">
                {t('admins.generatePassword')}
              </button>
            </div>
            {step1PwdError && <p className="text-xs text-red-400 mt-1">{step1PwdError}</p>}
          </div>
          <div className="border-t border-white/[0.06] pt-3">
            <p className="text-[11px] text-slate-600 mb-1.5">{t('admins.pwdRulesLabel')}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(['pwdMinLength', 'pwdUppercase', 'pwdLowercase', 'pwdSymbols'] as const).map((key) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))} className="w-3.5 h-3.5 rounded accent-violet-500 cursor-pointer" />
                  <span className="text-xs text-slate-400 group-hover:text-white transition-colors">{t(`admins.${key}`)}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeCreate} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">{t('common.cancel')}</button>
            <button type="button" onClick={goNextFromStep1} disabled={!form.email.trim() || !form.password.trim() || !form.fullName.trim()} className="px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg disabled:opacity-50 transition-all">{t('common.next')}</button>
          </div>
        </div>
      );

      case 2: return (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">{t('admins.securityOptions')}</p>
          <div className="space-y-2">
            {(['mustChangePassword', 'mustSetup2FA'] as const).map((key) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer group rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 hover:bg-white/[0.04] transition-colors">
                <input type="checkbox" checked={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))} className="mt-0.5 w-4 h-4 rounded accent-emerald-500 cursor-pointer shrink-0" />
                <span className="text-xs text-slate-300 group-hover:text-white transition-colors leading-relaxed">{t(`admins.opt${key.charAt(0).toUpperCase() + key.slice(1)}`)}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-between gap-3 pt-2">
            <button type="button" onClick={goBack} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">{t('common.back')}</button>
            <button type="button" onClick={goNext} className="px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-all">{t('common.next')}</button>
          </div>
        </div>
      );

      case 3: return (
        <div className="space-y-3">
          <PermissionsPanel
            permissions={form.permissions}
            managerId={form.managerId}
            supportManagers={supportManagers}
            isSuperAdmin={form.isSuperAdmin}
            showSuperAdmin
            t={t}
            onPermissionToggle={togglePermission}
            onManagerChange={(id) => setForm((f) => ({ ...f, managerId: id }))}
            onSuperAdminChange={(checked) => setForm((f) => ({ ...f, isSuperAdmin: checked }))}
            onPresetSelect={(permissions) => setForm((f) => ({ ...f, permissions }))}
          />
          <div className="flex justify-between gap-3 pt-1">
            <button type="button" onClick={goBack} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">{t('common.back')}</button>
            <button type="button" onClick={goNext} className="px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-all">{t('common.next')}</button>
          </div>
        </div>
      );

      case 4: return (
        <div className="space-y-4">
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.07] p-3 space-y-1.5 text-sm">
            {[
              { label: t('admins.email'), value: form.email },
              { label: t('admins.fullName'), value: form.fullName, skip: !form.fullName },
              { label: t('admins.phone'), value: form.phone, skip: !form.phone },
            ].filter((item) => !item.skip).map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-slate-500 text-xs">{item.label}</span>
                <span className="text-slate-200 font-medium truncate ms-4 max-w-[200px]">{item.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-xs">{t('admins.role')}</span>
              <span className={`text-xs font-semibold ${form.isSuperAdmin ? 'text-amber-400' : 'text-slate-200'}`}>{form.isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN'}</span>
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
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-4 space-y-3">
            <p className="text-xs text-amber-400/90">{t('admins.confirmYourPasswordHint')}</p>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">{t('admins.confirmYourPassword')}</label>
              <div className="relative">
                <input type={showConfirmPwd ? 'text' : 'password'} placeholder="••••••••" value={confirmPwd} onChange={(e) => { setConfirmPwd(e.target.value); setConfirmPwdError(''); setCreateError(''); }} onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }} autoFocus className="w-full pr-9 px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-amber-500/50" />
                <button type="button" onClick={() => setShowConfirmPwd((v) => !v)} className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-500 hover:text-slate-300 transition-colors" tabIndex={-1}>
                  {showConfirmPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {(confirmPwdError || createError) && <p className="text-xs text-red-400 mt-1">{confirmPwdError || createError}</p>}
            </div>
          </div>
          <div className="flex justify-between gap-3 pt-1">
            <button type="button" onClick={goBack} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">{t('common.back')}</button>
            <button type="button" onClick={() => void handleCreate()} disabled={saving || !confirmPwd} className="px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg disabled:opacity-50 transition-all">
              {saving ? t('common.creating') : t('common.confirm')}
            </button>
          </div>
        </div>
      );

      default: return null;
    }
  };

  /* ─── RENDER ─────────────────────────────────────────────────── */
  const groups = [
    { slug: 'super-admins', label: t('dashboard.superAdmins'), desc: t('dashboard.superAdminsDesc'), color: 'text-amber-400', border: 'border-amber-500/15', hover: 'hover:border-amber-500/40', members: admins.filter((a) => a.role === 'SUPER_ADMIN') },
    { slug: 'managers',     label: t('dashboard.managers'),    desc: t('dashboard.managersDesc'),    color: 'text-violet-400', border: 'border-violet-500/15', hover: 'hover:border-violet-500/40', members: admins.filter((a) => a.role === 'ADMIN' && a.permissions?.includes('support.manage')) },
    { slug: 'staff',        label: t('dashboard.staff'),       desc: t('dashboard.staffDesc'),       color: 'text-blue-400',   border: 'border-blue-500/15',   hover: 'hover:border-blue-500/40',   members: admins.filter((a) => a.role === 'ADMIN' && !a.permissions?.includes('support.manage')) },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">{t('admins.title')}</h1>
        <button onClick={() => { setStep(1); setOpen(true); }} className="px-3 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-all">
          {t('admins.newAdmin')}
        </button>
      </div>

      {/* Team stats */}
      {admins.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {groups.map((g) => (
            <button key={g.label} onClick={() => nav(`/admins/group/${g.slug}`)} className={`rounded-xl border ${g.border} ${g.hover} bg-[#111118] py-4 px-3 flex flex-col items-center gap-1 transition-all cursor-pointer w-full`}>
              <span className={`text-2xl font-bold tabular-nums ${g.color}`}>{g.members.length}</span>
              <span className="text-[11px] text-slate-400 font-medium">{g.label}</span>
              <span className="text-[10px] text-slate-600 text-center leading-snug mt-0.5">{g.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Admin table */}
      <AdminTable
        admins={admins}
        currentAdminId={currentAdmin?.id}
        isSuperAdmin={currentAdmin?.role === 'SUPER_ADMIN'}
        t={t}
        onToggleActive={handleToggleActive}
        onDelete={(id) => { setDelId(id); setShowDelPassword(false); }}
        onEditProfile={(a) => { setEditAdmin({ id: String(a.id), fullName: a.fullName, email: a.email }); setEditForm({ fullName: a.fullName ?? '', email: a.email ?? '' }); setEditError(''); setEditEmailError(''); setEditFullNameError(''); }}
        onResetPassword={(id) => { setResetPwdId(id); setResetPwdNew(''); setResetPwdConfirm(''); setResetPwdError(''); setResetPwdNewError(''); setShowResetPwdConfirm(false); }}
        onReset2FA={(id) => { setReset2FAId(id); setReset2FAPwd(''); setReset2FAError(''); setShowReset2FAPwd(false); }}
        onEditPermissions={(a) => {
          setEditPermAdmin({ id: Number(a.id), email: a.email, fullName: a.fullName, permissions: a.permissions ?? [], managerId: null });
          setEditPermissions(a.permissions ?? []);
          setEditPermManagerId('');
          void loadSupportManagers();
        }}
        onViewDetails={(_id, name) => nav(`/admins/${name}`)}
      />

      {/* Delete modal */}
      <Modal open={!!delId} onClose={() => { setDelId(null); setDelPassword(''); setDelPasswordError(''); setDelError(''); setShowDelPassword(false); }} title={t('admins.deleteTitle')} width="max-w-sm">
        <p className="text-sm text-slate-400 mb-4">{t('admins.deleteMsg')}</p>
        <div className="mb-4">
          <label className="text-xs text-slate-400 block mb-1.5">{t('admins.confirmYourPassword')}</label>
          <div className="relative">
            <input type={showDelPassword ? 'text' : 'password'} placeholder="••••••••" value={delPassword} onChange={(e) => { setDelPassword(e.target.value); setDelPasswordError(''); }} onKeyDown={(e) => { if (e.key === 'Enter') void handleDelete(); }} className="w-full pr-9 px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500/50" autoFocus />
            <button type="button" onClick={() => setShowDelPassword((v) => !v)} className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-500 hover:text-slate-300 transition-colors" tabIndex={-1}>
              {showDelPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {(delPasswordError || delError) && <p className="text-xs text-red-400 mt-1">{delPasswordError || delError}</p>}
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={() => { setDelId(null); setDelPassword(''); setDelPasswordError(''); setDelError(''); setShowDelPassword(false); }} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">{t('common.cancel')}</button>
          <button onClick={() => void handleDelete()} disabled={saving || !delPassword} className="px-4 py-2 text-sm font-semibold bg-red-500 hover:bg-red-400 text-white rounded-lg disabled:opacity-50 transition-all">{saving ? t('common.loading') : t('common.delete')}</button>
        </div>
      </Modal>

      {/* Edit Profile modal */}
      <Modal open={!!editAdmin} onClose={() => { setEditAdmin(null); setEditEmailError(''); setEditFullNameError(''); }} title={t('admins.editProfile')} width="max-w-sm">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">{t('admins.fullName')}</label>
            <input value={editForm.fullName} onChange={(e) => { setEditForm((f) => ({ ...f, fullName: e.target.value })); setEditFullNameError(''); }} onBlur={() => { if (!editForm.fullName.trim()) setEditFullNameError('Full name is required'); }} className={`w-full px-3 py-2 text-sm bg-[#0d0d14] border rounded-lg text-white focus:outline-none focus:border-emerald-500/50 ${editFullNameError ? 'border-red-500/50' : 'border-white/[0.08]'}`} />
            {editFullNameError && <p className="text-xs text-red-400 mt-1">{editFullNameError}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">{t('admins.email')}</label>
            <input value={editForm.email} onChange={(e) => { setEditForm((f) => ({ ...f, email: e.target.value })); setEditEmailError(''); }} onBlur={() => setEditEmailError(validateEmail(editForm.email))} className={`w-full px-3 py-2 text-sm bg-[#0d0d14] border rounded-lg text-white focus:outline-none focus:border-emerald-500/50 ${editEmailError ? 'border-red-500/50' : 'border-white/[0.08]'}`} />
            {editEmailError && <p className="text-xs text-red-400 mt-1">{editEmailError}</p>}
          </div>
          {editError && <p className="text-xs text-red-400">{editError}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => { setEditAdmin(null); setEditEmailError(''); setEditFullNameError(''); }} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">{t('common.cancel')}</button>
            <button onClick={() => void handleEditProfile()} disabled={editSaving || !editForm.fullName.trim() || !editForm.email.trim()} className="px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg disabled:opacity-50 transition-all">{editSaving ? t('common.saving') : t('common.save')}</button>
          </div>
        </div>
      </Modal>

      {/* Reset Password modal */}
      <Modal open={!!resetPwdId} onClose={() => { setResetPwdId(null); setResetPwdNew(''); setResetPwdConfirm(''); setResetPwdError(''); setResetPwdCopied(false); setResetPwdNewError(''); setShowResetPwdConfirm(false); }} title={t('admins.resetPassword')} width="max-w-sm">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">{t('admins.newPasswordLabel')}</label>
            <div className="flex gap-2">
              <input type="text" value={resetPwdNew} onChange={(e) => { setResetPwdNew(e.target.value); setResetPwdError(''); setResetPwdCopied(false); setResetPwdNewError(''); }} onBlur={() => { if (resetPwdNew && resetPwdNew.length < 18) setResetPwdNewError('Password must be at least 18 characters'); }} className={`flex-1 min-w-0 px-3 py-2 text-sm bg-[#0d0d14] border rounded-lg text-white font-mono focus:outline-none focus:border-amber-500/50 ${resetPwdNewError ? 'border-red-500/50' : 'border-white/[0.08]'}`} />
              <button type="button" onClick={() => { const pwd = buildPassword({ pwdUppercase: true, pwdLowercase: true, pwdSymbols: true }); setResetPwdNew(pwd); setResetPwdError(''); setResetPwdCopied(false); setResetPwdNewError(''); }} className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 rounded-lg transition-colors shrink-0">
                <RefreshCw size={12} /> {t('admins.generatePassword')}
              </button>
              <button type="button" disabled={!resetPwdNew} onClick={() => { if (!resetPwdNew) return; void navigator.clipboard.writeText(resetPwdNew).then(() => { setResetPwdCopied(true); setTimeout(() => setResetPwdCopied(false), 2000); }); }} className={`flex items-center gap-1 px-2.5 py-2 text-xs font-medium border rounded-lg transition-all shrink-0 disabled:opacity-40 ${resetPwdCopied ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-white/[0.06] hover:bg-white/[0.1] border-white/[0.08] text-slate-300'}`}>
                {resetPwdCopied ? <Check size={12} /> : <Copy size={12} />} {resetPwdCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            {resetPwdNewError && <p className="text-xs text-red-400 mt-1">{resetPwdNewError}</p>}
          </div>
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 space-y-2">
            <p className="text-xs text-amber-400/80">{t('admins.confirmYourPasswordHint')}</p>
            <div className="relative">
              <input type={showResetPwdConfirm ? 'text' : 'password'} placeholder="••••••••" value={resetPwdConfirm} onChange={(e) => { setResetPwdConfirm(e.target.value); setResetPwdError(''); }} onKeyDown={(e) => { if (e.key === 'Enter') void handleResetPassword(); }} className="w-full pr-9 px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-amber-500/50" />
              <button type="button" onClick={() => setShowResetPwdConfirm((v) => !v)} className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-500 hover:text-slate-300 transition-colors" tabIndex={-1}>
                {showResetPwdConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          {resetPwdError && <p className="text-xs text-red-400">{resetPwdError}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => { setResetPwdId(null); setResetPwdNew(''); setResetPwdConfirm(''); setResetPwdError(''); setResetPwdCopied(false); setResetPwdNewError(''); setShowResetPwdConfirm(false); }} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">{t('common.cancel')}</button>
            <button onClick={() => void handleResetPassword()} disabled={saving || !resetPwdNew || !resetPwdConfirm} className="px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg disabled:opacity-50 transition-all">
              {saving ? t('common.loading') : t('admins.resetPassword')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reset 2FA modal */}
      <Modal open={!!reset2FAId} onClose={() => { setReset2FAId(null); setReset2FAPwd(''); setReset2FAError(''); setShowReset2FAPwd(false); }} title={t('admins.reset2FA')} width="max-w-sm">
        <div className="space-y-3">
          <p className="text-sm text-slate-400">{t('admins.reset2FAMsg')}</p>
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 space-y-2">
            <p className="text-xs text-amber-400/80">{t('admins.confirmYourPasswordHint')}</p>
            <div className="relative">
              <input type={showReset2FAPwd ? 'text' : 'password'} placeholder="••••••••" value={reset2FAPwd} onChange={(e) => { setReset2FAPwd(e.target.value); setReset2FAError(''); }} onKeyDown={(e) => { if (e.key === 'Enter') void handleReset2FA(); }} autoFocus className="w-full pr-9 px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-amber-500/50" />
              <button type="button" onClick={() => setShowReset2FAPwd((v) => !v)} className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-500 hover:text-slate-300 transition-colors" tabIndex={-1}>
                {showReset2FAPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          {reset2FAError && <p className="text-xs text-red-400">{reset2FAError}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => { setReset2FAId(null); setReset2FAPwd(''); setReset2FAError(''); setShowReset2FAPwd(false); }} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">{t('common.cancel')}</button>
            <button onClick={() => void handleReset2FA()} disabled={saving || !reset2FAPwd} className="px-4 py-2 text-sm font-semibold bg-violet-500 hover:bg-violet-400 text-white rounded-lg disabled:opacity-50 transition-all">
              {saving ? t('common.loading') : t('admins.reset2FA')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Permissions Modal */}
      <Modal open={!!editPermAdmin} onClose={() => setEditPermAdmin(null)} title={`Permissions — ${editPermAdmin?.fullName || editPermAdmin?.email}`}>
        {editPermAdmin && (
          <div className="space-y-3">
            <PermissionsPanel
              permissions={editPermissions}
              managerId={editPermManagerId}
              supportManagers={supportManagers}
              t={t}
              onPermissionToggle={(perm) => setEditPermissions((prev) => resolvePermToggle(perm, prev))}
              onManagerChange={setEditPermManagerId}
              onPresetSelect={setEditPermissions}
            />
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setEditPermAdmin(null)} className="px-4 py-2 text-sm text-slate-400">{t('common.cancel')}</button>
              <button onClick={() => void handleSavePermissions()} disabled={editPermSaving} className="px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg disabled:opacity-50 transition-all">
                {editPermSaving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create modal */}
      <Modal open={open} onClose={closeCreate} title={`${t('admins.newAdmin')} (${step}/4)`} width="max-w-md">
        <StepDots current={step} total={4} />
        {renderStep()}
      </Modal>
    </div>
  );
}
