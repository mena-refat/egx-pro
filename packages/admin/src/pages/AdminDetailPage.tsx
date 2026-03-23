import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Shield, ShieldCheck, ShieldOff, Monitor, MapPin,
  Clock, Globe, User, Mail, Phone, Calendar, Activity,
} from 'lucide-react';
import { adminApi } from '../lib/adminApi';
import { Badge } from '../components/Badge';

/* ── helpers ─────────────────────────────────────────────────── */
function timeAgo(dateStr: string | null | undefined, locale: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (locale.startsWith('ar')) {
    if (s < 60) return 'الآن';
    if (m < 60) return `منذ ${m} دقيقة`;
    if (h < 24) return `منذ ${h} ساعة`;
    return `منذ ${d} يوم`;
  }
  if (s < 60) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

function parseDevice(ua: string | null): string {
  if (!ua) return '';
  // Simple parse: OS + browser
  const os = /Windows/i.test(ua) ? 'Windows'
    : /Mac OS X/i.test(ua) ? 'macOS'
    : /Android/i.test(ua) ? 'Android'
    : /iPhone|iPad/i.test(ua) ? 'iOS'
    : /Linux/i.test(ua) ? 'Linux'
    : 'Unknown OS';
  const browser = /Edg\//i.test(ua) ? 'Edge'
    : /Chrome/i.test(ua) ? 'Chrome'
    : /Firefox/i.test(ua) ? 'Firefox'
    : /Safari/i.test(ua) ? 'Safari'
    : 'Browser';
  return `${browser} on ${os}`;
}

const ACTION_LABELS: Record<string, { en: string; ar: string; color: string }> = {
  ADMIN_LOGIN:               { en: 'Logged in',               ar: 'تسجيل دخول',           color: 'text-emerald-400' },
  ADMIN_LOGOUT:              { en: 'Logged out',              ar: 'تسجيل خروج',           color: 'text-slate-400' },
  ADMIN_PASSWORD_CHANGED:    { en: 'Password changed',        ar: 'تغيير كلمة المرور',    color: 'text-amber-400' },
  ADMIN_2FA_ENABLED:         { en: '2FA enabled',             ar: 'تفعيل المصادقة الثنائية', color: 'text-blue-400' },
  ADMIN_2FA_DISABLED:        { en: '2FA disabled',            ar: 'تعطيل المصادقة الثنائية', color: 'text-orange-400' },
  ADMIN_CREATED:             { en: 'Admin created',           ar: 'إنشاء مشرف',           color: 'text-violet-400' },
  ADMIN_DELETED:             { en: 'Admin deleted',           ar: 'حذف مشرف',             color: 'text-red-400' },
  ADMIN_RESET_PASSWORD:      { en: 'Password reset',         ar: 'إعادة تعيين كلمة المرور', color: 'text-amber-400' },
  ADMIN_RESET_2FA:           { en: '2FA reset',               ar: 'إعادة تعيين المصادقة الثنائية', color: 'text-orange-400' },
  ADMIN_PERMISSIONS_UPDATED: { en: 'Permissions updated',    ar: 'تحديث الصلاحيات',      color: 'text-blue-400' },
  ADMIN_PROFILE_UPDATED:     { en: 'Profile updated',        ar: 'تحديث الملف الشخصي',   color: 'text-sky-400' },
};

const ACTION_GROUPS: Record<string, string[]> = {
  login:    ['ADMIN_LOGIN', 'ADMIN_LOGOUT'],
  security: ['ADMIN_PASSWORD_CHANGED', 'ADMIN_2FA_ENABLED', 'ADMIN_2FA_DISABLED', 'ADMIN_RESET_PASSWORD', 'ADMIN_RESET_2FA'],
  admin:    ['ADMIN_CREATED', 'ADMIN_DELETED', 'ADMIN_PERMISSIONS_UPDATED', 'ADMIN_PROFILE_UPDATED'],
};

/* ── component ───────────────────────────────────────────────── */
interface AdminDetail {
  id: number;
  email: string;
  phone: string | null;
  fullName: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  twoFactorEnabled: boolean;
  mustChangePassword: boolean;
  mustSetup2FA: boolean;
  managerId: number | null;
  createdBy: number | null;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  lastLoginDevice: string | null;
  lastLoginCity: string | null;
  createdAt: string;
  manager: { id: number; fullName: string; email: string } | null;
  recentActivity: {
    id: string;
    action: string;
    target: string | null;
    details: string | null;
    city: string | null;
    createdAt: string;
  }[];
}

export default function AdminDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const locale = `${i18n.language}-u-nu-latn`;
  const isRtl = locale.startsWith('ar');

  const [admin, setAdmin] = useState<AdminDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'login' | 'security' | 'admin'>('all');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await adminApi.get(`/admins/${id}`);
      setAdmin(res.data.data);
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const filteredActivity = (admin?.recentActivity ?? []).filter((a) => {
    if (filter === 'all') return true;
    return ACTION_GROUPS[filter]?.includes(a.action);
  });

  const actionLabel = (action: string) => {
    const entry = ACTION_LABELS[action];
    if (!entry) return action;
    return isRtl ? entry.ar : entry.en;
  };

  const actionColor = (action: string) => ACTION_LABELS[action]?.color ?? 'text-slate-400';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center text-slate-500 text-sm">
        Admin not found.
        <button onClick={() => nav('/admins')} className="block mx-auto mt-4 text-emerald-400 hover:underline text-xs">
          {t('adminDetail.backToAdmins')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Back */}
      <button
        onClick={() => nav('/admins')}
        className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft size={13} />
        {t('adminDetail.backToAdmins')}
      </button>

      {/* Header */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111118] px-5 py-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600/50 to-slate-700/50 border border-white/[0.08] flex items-center justify-center text-lg font-bold text-slate-300 shrink-0">
          {admin.fullName?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white">{admin.fullName}</p>
            <Badge label={admin.role} />
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              admin.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-500'
            }`}>
              {admin.isActive ? t('adminDetail.active') : t('adminDetail.inactive')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{admin.email}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-slate-600">{t('adminDetail.createdAt')}</p>
          <p className="text-xs text-slate-400">
            {new Date(admin.createdAt).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Profile */}
        <div className="rounded-xl border border-white/[0.08] bg-[#111118] p-4 space-y-3">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <User size={11} /> {t('adminDetail.profile')}
          </p>
          <InfoRow icon={<Mail size={11} />} label={t('adminDetail.email')} value={admin.email} />
          <InfoRow icon={<Phone size={11} />} label={t('adminDetail.phone')} value={admin.phone ?? t('adminDetail.notSet')} dim={!admin.phone} />
          <InfoRow icon={<User size={11} />} label={t('adminDetail.manager')} value={
            admin.manager ? `${admin.manager.fullName} (${admin.manager.email})` : t('adminDetail.noManager')
          } dim={!admin.manager} />
          <InfoRow icon={<Calendar size={11} />} label={t('adminDetail.createdAt')} value={
            new Date(admin.createdAt).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })
          } />
        </div>

        {/* Security */}
        <div className="rounded-xl border border-white/[0.08] bg-[#111118] p-4 space-y-3">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <Shield size={11} /> {t('adminDetail.security')}
          </p>
          <InfoRow
            icon={admin.twoFactorEnabled ? <ShieldCheck size={11} className="text-emerald-400" /> : <ShieldOff size={11} className="text-red-400" />}
            label={t('adminDetail.twoFactor')}
            value={admin.twoFactorEnabled ? t('adminDetail.enabled') : t('adminDetail.disabled')}
            valueClass={admin.twoFactorEnabled ? 'text-emerald-400' : 'text-red-400'}
          />
          <InfoRow
            icon={<Shield size={11} />}
            label={t('adminDetail.mustChangePassword')}
            value={admin.mustChangePassword ? t('adminDetail.yes') : t('adminDetail.no')}
            valueClass={admin.mustChangePassword ? 'text-amber-400' : 'text-slate-400'}
          />
          <InfoRow
            icon={<Shield size={11} />}
            label={t('adminDetail.mustSetup2FA')}
            value={admin.mustSetup2FA ? t('adminDetail.yes') : t('adminDetail.no')}
            valueClass={admin.mustSetup2FA ? 'text-amber-400' : 'text-slate-400'}
          />
        </div>
      </div>

      {/* Last Login */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111118] p-4">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-3">
          <Clock size={11} /> {t('adminDetail.lastLogin')}
        </p>
        {admin.lastLoginAt ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <LoginCard icon={<Clock size={12} className="text-emerald-400" />} label={t('adminDetail.lastLoginTime')}>
              <p className="text-xs text-white font-medium">{timeAgo(admin.lastLoginAt, locale)}</p>
              <p className="text-[10px] text-slate-500">
                {new Date(admin.lastLoginAt).toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </LoginCard>
            <LoginCard icon={<Globe size={12} className="text-blue-400" />} label={t('adminDetail.lastLoginIp')}>
              <p className="text-xs text-white font-medium font-mono">{admin.lastLoginIp ?? t('adminDetail.unknown')}</p>
            </LoginCard>
            <LoginCard icon={<Monitor size={12} className="text-violet-400" />} label={t('adminDetail.lastLoginDevice')}>
              <p className="text-xs text-white font-medium">
                {admin.lastLoginDevice ? parseDevice(admin.lastLoginDevice) : t('adminDetail.unknown')}
              </p>
            </LoginCard>
            <LoginCard icon={<MapPin size={12} className="text-amber-400" />} label={t('adminDetail.lastLoginLocation')}>
              <p className="text-xs text-white font-medium">{admin.lastLoginCity ?? t('adminDetail.unknown')}</p>
            </LoginCard>
          </div>
        ) : (
          <p className="text-xs text-slate-600">{t('adminDetail.never')}</p>
        )}
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111118] p-4">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <Activity size={11} /> {t('adminDetail.recentActivity')}
          </p>
          <div className="flex items-center gap-1.5">
            {(['all', 'login', 'security', 'admin'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 text-[10px] rounded-lg border transition-all ${
                  filter === f
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : 'border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/[0.1]'
                }`}
              >
                {t(`adminDetail.filter${f.charAt(0).toUpperCase()}${f.slice(1)}` as any)}
              </button>
            ))}
          </div>
        </div>

        {filteredActivity.length === 0 ? (
          <p className="text-xs text-slate-600 py-4 text-center">{t('adminDetail.noActivity')}</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filteredActivity.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 py-2.5">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${actionColor(entry.action).replace('text-', 'bg-')}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${actionColor(entry.action)}`}>{actionLabel(entry.action)}</p>
                  {entry.details && (
                    <p className="text-[10px] text-slate-600 truncate mt-0.5">{entry.details}</p>
                  )}
                </div>
                <div className="shrink-0 text-end">
                  <p className="text-[10px] text-slate-500">{timeAgo(entry.createdAt, locale)}</p>
                  {entry.city && (
                    <p className="text-[10px] text-slate-600 flex items-center gap-0.5 justify-end mt-0.5">
                      <MapPin size={8} /> {entry.city}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── sub-components ──────────────────────────────────────────── */
function InfoRow({
  icon, label, value, dim, valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  dim?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-slate-600 mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-600">{label}</p>
        <p className={`text-xs truncate ${valueClass ?? (dim ? 'text-slate-600' : 'text-slate-300')}`}>{value}</p>
      </div>
    </div>
  );
}

function LoginCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <p className="text-[10px] text-slate-500">{label}</p>
      </div>
      {children}
    </div>
  );
}
