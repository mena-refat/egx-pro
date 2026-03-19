import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import {
  User,
  Shield,
  Sliders,
  Bell,
  BarChart2,
  TrendingUp,
  CreditCard,
  Gift,
  Trophy,
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
    label: 'الحساب الشخصي',
    items: [
      { id: 'account', path: '/settings/account', label: 'معلوماتي', icon: User },
      { id: 'security', path: '/settings/security', label: 'الأمان', icon: Shield },
    ],
  },
  {
    label: 'التفضيلات',
    items: [
      { id: 'preferences', path: '/settings/preferences', label: 'المظهر', icon: Sliders },
      { id: 'notifications', path: '/settings/notifications', label: 'الإشعارات', icon: Bell },
    ],
  },
  {
    label: 'الاستثمار',
    items: [
      { id: 'investor', path: '/settings/investor', label: 'ملف المستثمر', icon: BarChart2 },
      { id: 'overview', path: '/settings/overview', label: 'إحصائياتي', icon: TrendingUp },
    ],
  },
  {
    label: 'المزايا',
    items: [
      { id: 'subscription', path: '/settings/subscription', label: 'الاشتراك', icon: CreditCard },
      { id: 'referrals', path: '/settings/referrals', label: 'الإحالات', icon: Gift },
      { id: 'achievements', path: '/settings/achievements', label: 'الإنجازات', icon: Trophy },
    ],
  },
  {
    label: 'خطر',
    items: [
      { id: 'danger', path: '/settings/danger', label: 'حذف الحساب', icon: Trash2, danger: true },
    ],
  },
];

const ALL_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

export default function SettingsLayout() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const activeItem = ALL_ITEMS.find((item) => location.pathname === item.path) ?? ALL_ITEMS[0];

  return (
    <div className="max-w-5xl mx-auto flex gap-0 min-h-screen" dir="rtl">
      {/* Sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--bg-card)] rounded-r-2xl py-6 px-3 gap-1 self-start sticky top-0">
        {/* User info */}
        <div className="flex items-center gap-3 px-3 pb-5 border-b border-[var(--border)] mb-3">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center shrink-0 overflow-hidden">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <User className="w-5 h-5 text-[var(--text-muted)]" />
            )}
          </div>
          <div className="min-w-0">
            {user?.fullName && (
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {user.fullName}
              </p>
            )}
            {user?.username && (
              <p className="text-xs text-[var(--text-muted)] truncate">@{user.username}</p>
            )}
          </div>
        </div>

        {/* Nav sections */}
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-2">
            <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              {section.label}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-right ${
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

      {/* Mobile: horizontal scrollable tab bar */}
      <div className="md:hidden w-full">
        <div className="flex gap-1 overflow-x-auto pb-2 mb-4 border-b border-[var(--border)] -mx-1 px-1">
          {ALL_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
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

        {/* Mobile content */}
        <main className="flex-1 min-w-0 px-0">
          <Outlet />
        </main>
      </div>

      {/* Desktop content */}
      <main className="hidden md:block flex-1 min-w-0 px-6 py-2">
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-6">
          {t('settings.title', { defaultValue: 'الإعدادات' })}
        </h1>
        <Outlet />
      </main>
    </div>
  );
}
