import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import type { ProfileTabProps } from './types';

const NOTIFICATION_KEYS = [
  { key: 'notifySignals', labelKey: 'settings.notifySignals', descKey: 'settings.notifySignalsDesc' },
  { key: 'notifyPortfolio', labelKey: 'settings.notifyPortfolio', descKey: 'settings.notifyPortfolioDesc' },
  { key: 'notifyNews', labelKey: 'settings.notifyNews', descKey: 'settings.notifyNewsDesc' },
  { key: 'notifyAchievements', labelKey: 'settings.notifyAchievements', descKey: 'settings.notifyAchievementsDesc' },
  { key: 'notifyGoals', labelKey: 'settings.notifyGoals', descKey: 'settings.notifyGoalsDesc' },
] as const;

type NotifKey = (typeof NOTIFICATION_KEYS)[number]['key'];

export function NotificationsTab({ user, onUpdateProfile }: ProfileTabProps) {
  const { t } = useTranslation('common');

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-[var(--text-muted)]" />
          {t('settings.notifications')}
        </h3>

        <div className="space-y-0 divide-y divide-[var(--border-subtle)]">
          {NOTIFICATION_KEYS.map(({ key, labelKey, descKey }) => {
            const value = user[key as NotifKey] ?? true;
            return (
              <div key={key} className="flex items-center justify-between gap-4 py-4 first:pt-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{t(labelKey)}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{t(descKey)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateProfile({ [key]: !value }, { success: '' })}
                  className={`relative w-11 h-6 rounded-full px-1 transition-colors flex items-center shrink-0 ${value ? 'bg-[var(--brand)]' : 'bg-[var(--border-strong)]'}`}
                >
                  <span className={`absolute w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
