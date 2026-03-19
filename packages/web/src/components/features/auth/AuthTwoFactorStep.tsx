import React from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone } from 'lucide-react';
import { Button } from '../../ui/Button';
import { OTPInput } from '../../ui/OTPInput';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onComplete: (code: string) => void;
  onBack: () => void;
  error: string | null;
};

export function AuthTwoFactorStep({ value, onChange, onComplete, onBack, error }: Props) {
  const { t } = useTranslation('common');

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="bg-[var(--brand-subtle)] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Smartphone className="w-8 h-8 text-[var(--brand)]" />
        </div>
        <h3 className="text-xl font-bold mb-2">{t('auth.enterVerificationCode')}</h3>
        <p className="text-[var(--text-muted)] text-sm">{t('auth.twoFactorDesc')}</p>
      </div>
      <OTPInput value={value} onChange={onChange} onComplete={onComplete} error={!!error} />
      {error && (
        <p className="text-[var(--danger)] text-sm bg-[var(--danger-bg)] p-3 rounded-xl border border-[var(--danger)]/20 text-center">
          {error}
        </p>
      )}
      <Button type="button" variant="ghost" fullWidth onClick={onBack}>
        ← {t('auth.backToLogin')}
      </Button>
    </div>
  );
}
