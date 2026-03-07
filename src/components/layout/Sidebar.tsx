import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, LayoutDashboard, PieChart, Calculator, Search, Target, User as UserIcon, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';

export type SidebarProps = {
  activeRoute: string;
  onNavigate: (path: string) => void;
  collapsed: boolean;
  onToggle: () => void;
};

const NAV_ITEMS = [
  { id: 'dashboard', path: '/', icon: LayoutDashboard },
  { id: 'portfolio', path: '/portfolio', icon: PieChart },
  { id: 'stocks', path: '/stocks', icon: Search },
  { id: 'market', path: '/market', icon: BarChart3 },
  { id: 'calculator', path: '/calculator', icon: Calculator },
  { id: 'goals', path: '/goals', icon: Target },
  { id: 'profile', path: '/settings', icon: UserIcon },
] as const;

export function Sidebar({ activeRoute, onNavigate, collapsed, onToggle }: SidebarProps) {
  const { t } = useTranslation('common');

  return (
    <aside
      className={`w-full md:flex-shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border)] flex flex-col gap-6 transition-[width] duration-200 ease-in-out overflow-hidden ${collapsed ? 'md:w-16' : 'md:w-60'}`}
    >
      <div className="p-4 flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <TrendingUp className="text-[var(--brand)] w-8 h-8 shrink-0" />
          <h1 className={`text-xl font-bold tracking-tight truncate transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>EGX Pro</h1>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
          aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.path === '/' ? (activeRoute === '/' || activeRoute === '/dashboard') : (activeRoute === item.path || activeRoute.startsWith(item.path + '/'));
          const label = t(`nav.${item.id}`);
          return (
            <button
              key={item.id}
              title={collapsed ? label : undefined}
              onClick={() => onNavigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-[var(--brand)] text-[var(--text-inverse)] shadow-lg shadow-violet-600/20' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'}`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className={`font-medium truncate transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
