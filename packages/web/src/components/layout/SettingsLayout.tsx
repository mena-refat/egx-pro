import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import {
  User,
  Shield,
  Sliders,
  BarChart2,
  CreditCard,
  Trash2,
  Settings,
} from 'lucide-react';

interface TabItem {
  id: string;
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
}

const TABS: TabItem[] = [
  { id: 'account',      path: '/settings/account',      label: 'معلوماتي',           icon: User       },
  { id: 'security',     path: '/settings/security',     label: 'الأمان',             icon: Shield     },
  { id: 'investor',     path: '/settings/investor',     label: 'ملف المستثمر',       icon: BarChart2  },
  { id: 'preferences',  path: '/settings/preferences',  label: 'المظهر والإشعارات', icon: Sliders    },
  { id: 'subscription', path: '/settings/subscription', label: 'الاشتراك',           icon: CreditCard },
  { id: 'danger',       path: '/settings/danger',       label: 'حذف الحساب',         icon: Trash2,    danger: true },
];

const PREFS_ALIASES = ['/settings/notifications'];

function isTabActive(tab: TabItem, pathname: string): boolean {
  if (pathname === tab.path) return true;
  if (tab.id === 'preferences')  return PREFS_ALIASES.includes(pathname);
  if (tab.id === 'subscription') return ['/settings/perks', '/settings/overview'].includes(pathname);
  return false;
}

export default function SettingsLayout() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const plan = (user as { plan?: string } | null)?.plan ?? 'free';
  const planBadge =
    plan === 'ultra'
      ? { label: 'Ultra ✦', cls: 'bg-amber-500/15 text-amber-400 border border-amber-400/30' }
      : plan === 'pro' || plan === 'yearly'
      ? { label: 'Pro', cls: 'bg-[var(--brand)]/15 text-[var(--brand)] border border-[var(--brand)]/30' }
      : { label: t('subscription.free', { defaultValue: 'مجاني' }), cls: 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)]' };

  return (
    <div className="max-w-2xl mx-auto space-y-4" dir="rtl">

      {/* ── Hero card ── */}
      <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        {/* Gradient decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand)]/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-10 -end-10 w-40 h-40 rounded-full bg-[var(--brand)]/6 blur-3xl pointer-events-none" />

        <div className="relative p-5 flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-secondary)] border-2 border-[var(--border)] flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="" width={64} height={64} className="w-full h-full object-cover" loading="lazy" />
              : <User className="w-7 h-7 text-[var(--text-muted)]" />
            }
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {user?.fullName && (
                <h2 className="text-base font-bold text-[var(--text-primary)] leading-tight truncate">
                  {user.fullName}
                </h2>
              )}
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${planBadge.cls}`}>
                {planBadge.label}
              </span>
            </div>
            {user?.username && (
              <p className="text-sm text-[var(--text-muted)] mt-0.5">@{user.username}</p>
            )}
            {user?.email && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{user.email}</p>
            )}
          </div>

          {/* Settings icon label */}
          <div className="shrink-0 flex flex-col items-center gap-1 text-[var(--text-muted)]">
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t('settings.title', { defaultValue: 'الإعدادات' })}</span>
          </div>
        </div>
      </div>

      {/* ── Horizontal tab bar ── */}
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)] -mx-1 px-1 scrollbar-hide">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = isTabActive(tab, location.pathname);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigate(tab.path)}
              className={`
                flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap shrink-0
                transition-colors border-b-2 -mb-px
                ${isActive
                  ? tab.danger
                    ? 'border-[var(--danger)] text-[var(--danger)] bg-[var(--danger-bg)]'
                    : 'border-[var(--brand)] text-[var(--brand)]'
                  : tab.danger
                  ? 'border-transparent text-[var(--danger)]/70 hover:text-[var(--danger)] hover:bg-[var(--danger-bg)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
                }
              `}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Page content ── */}
      <Outlet />
    </div>
  );
}
