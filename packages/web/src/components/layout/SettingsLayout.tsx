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
} from 'lucide-react';

interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'الحساب',
    items: [
      { id: 'account',  path: '/settings/account',  label: 'معلوماتي',         icon: User     },
      { id: 'security', path: '/settings/security', label: 'الأمان',           icon: Shield   },
      { id: 'investor', path: '/settings/investor', label: 'ملف المستثمر',     icon: BarChart2 },
    ],
  },
  {
    label: 'التطبيق',
    items: [
      { id: 'preferences', path: '/settings/preferences', label: 'المظهر والإشعارات', icon: Sliders },
    ],
  },
  {
    label: 'المزايا',
    items: [
      { id: 'perks', path: '/settings/perks', label: 'الاشتراك والمزايا', icon: CreditCard },
    ],
  },
  {
    label: 'خطر',
    items: [
      { id: 'danger', path: '/settings/danger', label: 'حذف الحساب', icon: Trash2, danger: true },
    ],
  },
];

// Old routes that now redirect — used for active-state matching
const PERKS_ALIASES = ['/settings/subscription', '/settings/referrals', '/settings/achievements', '/settings/overview'];
const PREFS_ALIASES = ['/settings/notifications'];

const ALL_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

function isItemActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.path) return true;
  if (item.id === 'perks')       return PERKS_ALIASES.includes(pathname);
  if (item.id === 'preferences') return PREFS_ALIASES.includes(pathname);
  return false;
}

export default function SettingsLayout() {
  const { t } = useTranslation('common');
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = useAuthStore((s) => s.user);

  return (
    <div className="max-w-5xl mx-auto flex gap-0" dir="rtl">

      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--bg-card)] rounded-r-2xl py-5 px-2.5 gap-0.5">

        {/* User pill */}
        <div className="flex items-center gap-2.5 px-2 pb-4 mb-1 border-b border-[var(--border)]">
          <div className="w-9 h-9 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center shrink-0 overflow-hidden">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
              : <User className="w-4 h-4 text-[var(--text-muted)]" />
            }
          </div>
          <div className="min-w-0">
            {user?.fullName && (
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate leading-tight">{user.fullName}</p>
            )}
            {user?.username && (
              <p className="text-xs text-[var(--text-muted)] truncate">@{user.username}</p>
            )}
          </div>
        </div>

        {/* Nav sections */}
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-3">
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              {section.label}
            </p>
            {section.items.map((item) => {
              const Icon     = item.icon;
              const isActive = isItemActive(item, location.pathname);
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-right ${
                    isActive
                      ? 'bg-[var(--brand)] text-white'
                      : item.danger
                      ? 'text-[var(--danger)] hover:bg-[var(--danger-bg)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </aside>

      {/* ── Mobile horizontal tabs ── */}
      <div className="md:hidden w-full">
        <div className="flex gap-1 overflow-x-auto pb-2 mb-4 border-b border-[var(--border)] -mx-1 px-1">
          {ALL_ITEMS.map((item) => {
            const Icon     = item.icon;
            const isActive = isItemActive(item, location.pathname);
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-[var(--brand)] text-white'
                    : item.danger
                    ? 'text-[var(--danger)] bg-[var(--bg-card)] border border-[var(--border)]'
                    : 'text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>
        <main className="flex-1 min-w-0 px-0">
          <Outlet />
        </main>
      </div>

      {/* ── Desktop content ── */}
      <main className="hidden md:block flex-1 min-w-0 px-6 py-2">
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-5">
          {t('settings.title', { defaultValue: 'الإعدادات' })}
        </h1>
        <Outlet />
      </main>

    </div>
  );
}
