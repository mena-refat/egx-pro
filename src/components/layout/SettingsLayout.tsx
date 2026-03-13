import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User,
  CreditCard,
  Gift,
  Trophy,
} from 'lucide-react';

const SETTINGS_TABS = [
  { id: 'account', path: '/settings/account', labelKey: 'settings.account', icon: User },
  { id: 'subscription', path: '/settings/subscription', labelKey: 'settings.subscription', icon: CreditCard },
  { id: 'referrals', path: '/settings/referrals', labelKey: 'settings.referrals', icon: Gift },
  { id: 'achievements', path: '/settings/achievements', labelKey: 'settings.achievements', icon: Trophy },
];

export default function SettingsLayout() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="max-w-4xl mx-auto w-full min-w-0">
      <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-4 sm:mb-6">
        {t('settings.title')}
      </h1>

      <div className="flex gap-1 border-b border-[var(--border)] mb-4 sm:mb-6 overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                border-b-2 transition-colors
                ${isActive
                  ? 'border-[var(--brand)] text-[var(--brand)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      <Outlet />
    </div>
  );
}
