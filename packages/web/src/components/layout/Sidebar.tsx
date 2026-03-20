import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, PieChart, BarChart3,
  Search, Brain, Crosshair,
  Target, Calculator,
  Users, User as UserIcon,
  ChevronLeft, ChevronRight,
  Settings, LifeBuoy,
} from 'lucide-react';

export type SidebarProps = {
  activeRoute: string;
  collapsed: boolean;
  onToggle: () => void;
  supportUnreadCount?: number;
};

type NavItem = { id: string; path: string; icon: React.ElementType };

// 4 sections - each maps to a clear user mental model
const SECTIONS: { groupKey: string; items: NavItem[] }[] = [
  {
    groupKey: 'overview',
    items: [
      { id: 'dashboard', path: '/',          icon: LayoutDashboard },
      { id: 'portfolio', path: '/portfolio', icon: PieChart        },
      { id: 'market',    path: '/market',    icon: BarChart3       },
    ],
  },
  {
    groupKey: 'research',
    items: [
      { id: 'stocks',      path: '/stocks',      icon: Search    },
      { id: 'ai',          path: '/ai',          icon: Brain     },
      { id: 'predictions', path: '/predictions', icon: Crosshair },
    ],
  },
  {
    groupKey: 'planning',
    items: [
      { id: 'goals',      path: '/goals',      icon: Target     },
      { id: 'calculator', path: '/calculator', icon: Calculator },
    ],
  },
  {
    groupKey: 'social',
    items: [
      { id: 'discover', path: '/discover', icon: Users    },
      { id: 'profile',  path: '/profile',  icon: UserIcon },
    ],
  },
];

// Always pinned at bottom - separated visually from main nav
const BOTTOM_ITEMS: NavItem[] = [
  { id: 'settings', path: '/settings', icon: Settings  },
  { id: 'support',  path: '/support',          icon: LifeBuoy  },
];

function isItemActive(path: string, activeRoute: string): boolean {
  if (path === '/') return activeRoute === '/' || activeRoute === '/dashboard';
  if (path === '/settings/account') return activeRoute.startsWith('/settings');
  if (path === '/ai') return activeRoute === '/ai' || activeRoute.startsWith('/ai/');
  return activeRoute === path || activeRoute.startsWith(path + '/');
}

export function Sidebar({ activeRoute, collapsed, onToggle, supportUnreadCount = 0 }: SidebarProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  const renderItem = (item: NavItem) => {
    const isActive = isItemActive(item.path, activeRoute);
    const label = t(`nav.${item.id}`);
    const isSupportWithUnread = item.id === 'support' && supportUnreadCount > 0;

    return (
      <button
        key={item.id}
        title={collapsed ? label : undefined}
        onClick={() => navigate(item.path)}
        className={`
          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
          ${collapsed ? 'justify-center' : ''}
          ${isActive
            ? 'bg-[var(--brand)] text-[var(--text-inverse)] shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
          }
        `}
      >
        <div className="relative shrink-0">
          <item.icon className="w-[18px] h-[18px]" />
          {isSupportWithUnread && (
            <span className="absolute -top-1 -end-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[var(--bg-sidebar)]" />
          )}
        </div>
        {!collapsed && (
          <>
            <span className="flex-1 text-sm font-medium truncate text-start">{label}</span>
            {isSupportWithUnread && (
              <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {supportUnreadCount}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <aside
      className={`
        hidden md:flex
        flex-shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border)]
        flex-col transition-[width] duration-300 ease-in-out overflow-hidden
        ${collapsed ? 'md:w-[60px]' : 'md:w-56'}
      `}
    >
      {/* Logo */}
      <div className="px-3 py-4 flex items-center justify-between gap-2 border-b border-[var(--border-subtle)]">
        <div className={`flex items-center gap-2 min-w-0 overflow-hidden ${collapsed ? 'justify-center w-full' : ''}`}>
          <img src="/borsa-logo.webp" alt="" width={32} height={32} className="w-8 h-8 shrink-0 object-contain" aria-hidden loading="lazy" />
          {!collapsed && (
            <h1 className="text-lg font-bold tracking-tight truncate">{t('common.appName')}</h1>
          )}
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="shrink-0 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
            aria-label={t('nav.collapseSidebar')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto overflow-x-hidden">
        {SECTIONS.map((section, i) => (
          <div key={section.groupKey}>
            {/* Section label - hidden when collapsed */}
            {!collapsed && i > 0 && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] select-none">
                {t(`nav_group.${section.groupKey}`)}
              </p>
            )}
            {collapsed && i > 0 && (
              <div className="mx-auto w-6 h-px bg-[var(--border)] mb-3" />
            )}
            <div className="space-y-0.5">
              {section.items.map(renderItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom pinned: Settings + Support */}
      <div className="px-2 pb-3 pt-2 border-t border-[var(--border-subtle)] space-y-0.5">
        {BOTTOM_ITEMS.map(renderItem)}
        {collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="w-full flex items-center justify-center p-2 mt-1 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
            aria-label={t('nav.expandSidebar')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
