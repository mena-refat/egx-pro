import { memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  BriefcaseBusiness,
  TrendingUp,
  Target,
  BarChart2,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/portfolio', labelKey: 'nav.portfolio', icon: BriefcaseBusiness },
  { path: '/market', labelKey: 'nav.market', icon: TrendingUp },
  { path: '/stocks', labelKey: 'nav.stocks', icon: BarChart2 },
  { path: '/goals', labelKey: 'nav.goals', icon: Target },
];

const BottomNav = memo(function BottomNav() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-50
        bg-[var(--bg-sidebar)] border-t border-[var(--border)]
        flex items-center justify-around
        h-16 px-2
        md:hidden
        safe-area-inset-bottom
      "
      aria-label={t('nav.bottomNavLabel')}
    >
      {NAV_ITEMS.map(({ path, labelKey, icon: Icon }) => {
        const isActive =
          path === '/dashboard'
            ? pathname === '/' || pathname === '/dashboard'
            : pathname === path || pathname.startsWith(path + '/');

        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            aria-label={t(labelKey)}
            aria-current={isActive ? 'page' : undefined}
            className={`
              flex flex-col items-center justify-center gap-1
              flex-1 h-full min-w-0 transition-colors
              ${isActive ? 'text-[var(--brand)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}
            `}
          >
            <Icon
              className={`w-5 h-5 transition-transform shrink-0 ${isActive ? 'scale-110' : ''}`}
              aria-hidden="true"
            />
            <span className="text-[10px] font-medium truncate w-full text-center">
              {t(labelKey)}
            </span>
          </button>
        );
      })}
    </nav>
  );
});

export default BottomNav;
