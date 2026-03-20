import { useTranslation } from 'react-i18next';
import { SubscriptionTab, ReferralTab, AchievementsTab } from '.';

export function SettingsTabContent() {
  const { i18n } = useTranslation('common');

  return (
    <div className="space-y-6" dir={i18n.language.startsWith('ar') ? 'rtl' : 'ltr'}>
      <SubscriptionTab />
      <ReferralTab />
      <AchievementsTab />
    </div>
  );
}
