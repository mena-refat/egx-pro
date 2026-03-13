import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, PieChart, Calculator, Search, Target, User as UserIcon, BarChart3, ChevronLeft, ChevronRight, Settings, Users, Crosshair, Brain } from 'lucide-react';

export type SidebarProps = {
  activeRoute: string;
  collapsed: boolean;
  onToggle: () => void;
};

const NAV_ITEMS = [
  { id: 'dashboard', path: '/', icon: LayoutDashboard },
  { id: 'ai', path: '/ai', icon: Brain },
  { id: 'portfolio', path: '/portfolio', icon: PieChart },
  { id: 'market', path: '/market', icon: BarChart3 },
  { id: 'stocks', path: '/stocks', icon: Search },
  { id: 'goals', path: '/goals', icon: Target },
  { id: 'predictions', path: '/predictions', icon: Crosshair },
  { id: 'calculator', path: '/calculator', icon: Calculator },
  { id: 'discover', path: '/discover', icon: Users },
  { id: 'profile', path: '/profile', icon: UserIcon },
  { id: 'settings', path: '/settings/account', icon: Settings },
] as const;

export function Sidebar({ activeRoute, collapsed, onToggle }: SidebarProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  return (
    <aside
      className={`
        hidden md:flex
        w-full md:flex-shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border)]
        flex-col gap-6 transition-[width] duration-300 ease-in-out overflow-hidden
        ${collapsed ? 'md:w-16' : 'md:w-60'}
      `}
    >
      <div className="p-4 flex items-center justify-between gap-2 min-w-0 bg-gradient-to-br from-[var(--brand)]/10 to-transparent rounded-br-xl">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <img src="/borsa-logo.svg" alt="" width={36} height={36} className="w-9 h-9 shrink-0 object-contain" aria-hidden loading="lazy" />
          <h1 className={`text-xl font-bold tracking-tight truncate transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>{t('common.appName')}</h1>
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
          const isActive = item.path === '/' ? (activeRoute === '/' || activeRoute === '/dashboard') : (item.path === '/settings/account' ? activeRoute.startsWith('/settings') : (item.path === '/ai' ? activeRoute === '/ai' || activeRoute.startsWith('/ai/') : (item.path === '/predictions' ? activeRoute === '/predictions' : (activeRoute === item.path || activeRoute.startsWith(item.path + '/')))));
          const label = t(`nav.${item.id}`);
          return (
            <button
              key={item.id}
              title={collapsed ? label : undefined}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-[var(--brand)] text-[var(--text-inverse)] shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'}`}
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
