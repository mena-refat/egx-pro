import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  User,
  Shield,
  Sliders,
  BarChart2,
  CreditCard,
  Trash2,
} from 'lucide-react';

interface TabItem {
  id: string;
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
}

const TABS: TabItem[] = [
  { id: 'account',     path: '/settings/account',     label: 'معلوماتي',            icon: User      },
  { id: 'security',    path: '/settings/security',    label: 'الأمان',              icon: Shield    },
  { id: 'investor',    path: '/settings/investor',    label: 'ملف المستثمر',        icon: BarChart2 },
  { id: 'preferences', path: '/settings/preferences', label: 'المظهر والإشعارات',  icon: Sliders   },
  { id: 'perks',       path: '/settings/perks',       label: 'الاشتراك',            icon: CreditCard},
  { id: 'danger',      path: '/settings/danger',      label: 'حذف الحساب',          icon: Trash2,   danger: true },
];

const PERKS_ALIASES = ['/settings/subscription', '/settings/referrals', '/settings/achievements', '/settings/overview'];
const PREFS_ALIASES = ['/settings/notifications'];

function isTabActive(tab: TabItem, pathname: string): boolean {
  if (pathname === tab.path) return true;
  if (tab.id === 'perks')       return PERKS_ALIASES.includes(pathname);
  if (tab.id === 'preferences') return PREFS_ALIASES.includes(pathname);
  return false;
}

export default function SettingsLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">

      {/* ── Horizontal tab bar ── */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-[var(--border)] -mx-1 px-1 scrollbar-hide">
        {TABS.map((tab) => {
          const Icon     = tab.icon;
          const isActive = isTabActive(tab, location.pathname);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigate(tab.path)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs font-medium whitespace-nowrap shrink-0
                transition-colors border-b-2 -mb-px
                ${isActive
                  ? tab.danger
                    ? 'border-[var(--danger)] text-[var(--danger)] bg-[var(--danger-bg)]'
                    : 'border-[var(--brand)] text-[var(--brand)] bg-[var(--brand)]/5'
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
