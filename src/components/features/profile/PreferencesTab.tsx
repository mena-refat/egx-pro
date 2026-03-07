import React from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '../../ui/Button';
import type { ProfileTabProps } from './types';

export function PreferencesTab({ user, onUpdateProfile }: ProfileTabProps) {
  const { t } = useTranslation('common');

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-[var(--text-muted)]" />
          {t('settings.preferences')}
        </h3>

        <div className="space-y-6">
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-3">{t('settings.theme')}</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'dark', label: t('settings.dark'), icon: Moon },
                { key: 'system', label: t('settings.system'), icon: Monitor },
                { key: 'light', label: t('settings.light'), icon: Sun },
              ].map((opt) => {
                const active = (user.theme ?? 'system') === opt.key;
                const Icon = opt.icon;
                return (
                  <React.Fragment key={opt.key}>
                    <Button
                      type="button"
                      variant={active ? 'primary' : 'secondary'}
                      className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 ${active ? 'border-[var(--brand)] bg-[var(--brand-subtle)]' : 'border-[var(--border)]'}`}
                      onClick={() => onUpdateProfile({ theme: opt.key }, { success: '' })}
                    >
                      <Icon className="w-5 h-5 text-[var(--text-secondary)]" />
                      <span className="text-[var(--text-primary)]">{opt.label}</span>
                    </Button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs text-[var(--text-muted)] mb-3">{t('settings.language')}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={user.language === 'ar' || !user.language ? 'primary' : 'secondary'}
                className="px-3 py-2.5 rounded-xl text-sm font-medium"
                onClick={() => onUpdateProfile({ language: 'ar' }, { success: '' })}
              >
                {t('settings.arabic')}
              </Button>
              <Button
                type="button"
                variant={user.language === 'en' ? 'primary' : 'secondary'}
                className="px-3 py-2.5 rounded-xl text-sm font-medium"
                onClick={() => onUpdateProfile({ language: 'en' }, { success: '' })}
              >
                {t('settings.english')}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2 border-t border-[var(--border-subtle)]">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)]">{t('settings.shariaMode')}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{t('settings.shariaDescShort')}</p>
            </div>
            <button
              type="button"
              onClick={() => onUpdateProfile({ shariaMode: !user.shariaMode }, { success: '' })}
              className={`relative w-11 h-6 rounded-full px-1 transition-colors flex items-center shrink-0 ${user.shariaMode ? 'bg-[var(--brand)]' : 'bg-[var(--border-strong)]'}`}
            >
              <span className={`absolute w-4 h-4 rounded-full bg-white shadow transition-transform ${user.shariaMode ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
