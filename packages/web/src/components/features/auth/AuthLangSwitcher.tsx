import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../ui/Button';

type Props = { onChangeLanguage: (lng: string) => void };

export function AuthLangSwitcher({ onChangeLanguage }: Props) {
  const { i18n } = useTranslation('common');

  return (
    <div className="mt-8 pt-8 border-t border-[var(--border)] flex justify-center gap-4">
      <Button
        variant="link"
        size="sm"
        onClick={() => onChangeLanguage('ar')}
        className={i18n.language.startsWith('ar') ? 'font-bold' : ''}
      >
        العربية
      </Button>
      <Button
        variant="link"
        size="sm"
        onClick={() => onChangeLanguage('en')}
        className={i18n.language === 'en' ? 'font-bold' : ''}
      >
        English
      </Button>
    </div>
  );
}
