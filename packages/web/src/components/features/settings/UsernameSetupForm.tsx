import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';

type Props = {
  value: string;
  maxLength: number;
  status: 'idle' | 'checking' | 'available' | 'taken' | 'error';
  formatError: string | null;
  message: string | null;
  saving: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function UsernameSetupForm({
  value,
  maxLength,
  status,
  formatError,
  message,
  saving,
  onChange,
  onSubmit,
}: Props) {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
        <h1 className="text-xl font-bold mb-2">
          {t('settings.chooseUsername')}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          {t('settings.usernameOnce')}
        </p>
        <div className="space-y-2 mb-4">
          <Input
            label={t('settings.username')}
            value={value}
            maxLength={maxLength}
            onChange={(e) => onChange(e.target.value)}
            placeholder="egx_trader"
            aria-required="true"
            error={formatError ?? undefined}
          />
          {message && !formatError && <p className="text-xs text-[var(--danger)] mt-1" role="alert" aria-live="polite">{message}</p>}
          {status === 'available' && !formatError && !message && (
            <p className="text-xs text-[var(--success)]">
              {t('settings.usernameAvailable')}
            </p>
          )}
        </div>
        <Button
          onClick={onSubmit}
          disabled={saving || !value || Boolean(formatError) || status === 'taken'}
          className="w-full"
        >
          {saving
            ? t('common.loading')
            : t('settings.saveUsername')}
        </Button>
      </div>
    </div>
  );
}
