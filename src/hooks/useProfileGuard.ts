import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';

export function useProfileGuard() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const isProfileComplete = Boolean(user?.onboardingCompleted);

  const guardedAction = useCallback(
    (action: () => void) => {
      if (!isProfileComplete) {
        setShowProfileModal(true);
        return;
      }
      action();
    },
    [isProfileComplete]
  );

  const profileModalProps = {
    show: showProfileModal,
    onClose: () => setShowProfileModal(false),
    onGoToProfile: () => {
      setShowProfileModal(false);
      navigate('/settings');
    },
    title: t('ai.profileRequiredTitle'),
    body: t('ai.profileRequiredBody'),
    goToProfileLabel: t('ai.goToProfile'),
    closeLabel: t('common.close'),
  };

  return { guardedAction, profileModalProps, isProfileComplete };
}
