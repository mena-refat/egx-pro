import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Gift, Award, User } from 'lucide-react';
import { SubscriptionTab, ReferralTab, AchievementsTab, AccountOverviewTab } from './features/settings';

const TABS = [
  { id: 'overview', labelKey: 'settings.accountOverview', icon: User },
  { id: 'subscription', labelKey: 'settings.subscription', icon: CreditCard },
  { id: 'referral', labelKey: 'settings.referral', icon: Gift },
  { id: 'achievements', labelKey: 'achievements.tabLabel', icon: Award },
] as const;

export function SettingsTabContent() {
  const { t, i18n } = useTranslation('common');
  const [activeTab, setActiveTab] = useState<string>('overview');

  return (
    <div className="space-y-6" dir={i18n.language.startsWith('ar') ? 'rtl' : 'ltr'}>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id ? 'bg-[var(--brand)] text-[var(--text-primary)]' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] border border-[var(--border)]'
            }`}
          >
            <tab.icon size={16} />
            {t(tab.labelKey, { defaultValue: tab.id })}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {activeTab === 'overview' && <AccountOverviewTab />}
          {activeTab === 'subscription' && <SubscriptionTab />}
          {activeTab === 'referral' && <ReferralTab />}
          {activeTab === 'achievements' && <AchievementsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
