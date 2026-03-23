import { useTranslation } from 'react-i18next';
import { Bell, BellOff, Loader2, BellRing } from 'lucide-react';
import type { ProfileTabProps } from './types';
import { useWebPush } from '../../../hooks/useWebPush';

const NOTIFICATION_KEYS = [
  { key: 'notifySignals',      labelKey: 'settings.notifySignals',      descKey: 'settings.notifySignalsDesc'      },
  { key: 'notifyPortfolio',    labelKey: 'settings.notifyPortfolio',    descKey: 'settings.notifyPortfolioDesc'    },
  { key: 'notifyNews',         labelKey: 'settings.notifyNews',         descKey: 'settings.notifyNewsDesc'         },
  { key: 'notifyAchievements', labelKey: 'settings.notifyAchievements', descKey: 'settings.notifyAchievementsDesc' },
  { key: 'notifyGoals',        labelKey: 'settings.notifyGoals',        descKey: 'settings.notifyGoalsDesc'        },
] as const;

type NotifKey = (typeof NOTIFICATION_KEYS)[number]['key'];

export function NotificationsTab({ user, onUpdateProfile }: ProfileTabProps) {
  const { t } = useTranslation('common');
  const { supported, isSubscribed, isDenied, isLoading, error, subscribe, unsubscribe } = useWebPush();

  const handlePushToggle = async () => {
    if (isSubscribed) await unsubscribe();
    else await subscribe();
  };

  return (
    <div className="space-y-6">

      {/* ── Push Notifications ── */}
      {supported && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
            <BellRing className="w-5 h-5 text-[var(--brand)]" />
            {t('settings.pushNotifications', { defaultValue: 'Push Notifications' })}
          </h3>

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {t('settings.pushBrowserTitle', { defaultValue: 'Browser notifications' })}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {isDenied
                  ? t('settings.pushDenied', { defaultValue: 'Blocked in browser settings — allow notifications to enable' })
                  : isSubscribed
                    ? t('settings.pushActive', { defaultValue: 'You\'ll receive alerts even when the app is closed' })
                    : t('settings.pushDesc', { defaultValue: 'Get instant alerts for trades, goals, and news' })
                }
              </p>
            </div>

            <button
              type="button"
              disabled={isLoading || isDenied}
              onClick={handlePushToggle}
              className={`relative w-11 h-6 rounded-full px-1 shrink-0 transition-colors flex items-center ${
                isDenied       ? 'bg-[var(--border-strong)] opacity-50 cursor-not-allowed'
                : isSubscribed ? 'bg-[var(--brand)]'
                : 'bg-[var(--border-strong)]'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 text-white animate-spin absolute inset-0 m-auto" />
              ) : (
                <span className={`absolute w-4 h-4 rounded-full bg-white shadow transition-transform ${isSubscribed ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-0'}`} />
              )}
            </button>
          </div>

          {isDenied && (
            <p className="mt-3 text-xs text-[var(--danger)] flex items-center gap-1.5">
              <BellOff className="w-3.5 h-3.5 shrink-0" />
              {t('settings.pushDeniedHint', { defaultValue: 'Open browser settings → Site permissions → Notifications → Allow' })}
            </p>
          )}
          {error && !isDenied && (
            <p className="mt-3 text-xs text-[var(--danger)] flex items-center gap-1.5">
              <BellOff className="w-3.5 h-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>
      )}

      {/* ── In-app Notification Preferences ── */}
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
