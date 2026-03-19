import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../ui/Button';

type Props = {
  isLogin: boolean;
  onLogin: () => void;
  onRegister: () => void;
};

export function AuthCardTabs({ isLogin, onLogin, onRegister }: Props) {
  const { t } = useTranslation('common');

  return (
    <div className="flex gap-4 mb-8 p-1 bg-[var(--bg-secondary)] rounded-2xl">
      <Button fullWidth variant={isLogin ? 'primary' : 'ghost'} size="md" onClick={onLogin}>
        {t('auth.login')}
      </Button>
      <Button fullWidth variant={!isLogin ? 'primary' : 'ghost'} size="md" onClick={onRegister}>
        {t('auth.register')}
      </Button>
    </div>
  );
}
