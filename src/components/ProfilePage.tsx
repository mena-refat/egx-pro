import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'motion/react';
import { User, Lock, Settings, Bell, Trash2 } from 'lucide-react';
import { AccountTab, SecurityTab, PreferencesTab, NotificationsTab, DangerZoneTab } from './features/profile';
import type { ProfileUser } from './features/profile';

const TABS = [
  { id: 'account', labelKey: 'settings.accountData', icon: User },
  { id: 'security', labelKey: 'settings.securityPrivacy', icon: Lock },
  { id: 'preferences', labelKey: 'settings.preferences', icon: Settings },
  { id: 'notifications', labelKey: 'settings.notifications', icon: Bell },
  { id: 'dangerZone', labelKey: 'settings.dangerZone', icon: Trash2 },
] as const;

export default function ProfilePage() {
  const { t, i18n } = useTranslation('common');
  const { user: authUser, accessToken, updateUser, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('account');
  const [requestStatus, setRequestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tab = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null;
    if (tab && TABS.some((t) => t.id === tab)) setActiveTab(tab);
  }, []);

  useEffect(() => {
    if (authUser) { setUser(authUser as unknown as ProfileUser); setLoading(false); return; }
    if (!accessToken) { setLoading(false); return; }
    let cancelled = false;
    fetch('/api/user/profile', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (!cancelled && data) setUser(data as ProfileUser); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [authUser, accessToken]);

  const updateProfile = async (data: Record<string, unknown>, _messages?: { success?: string; error?: string }) => {
    if (!accessToken) return;
    const res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body?.error as string) || 'Failed');
    updateUser(body as Partial<ProfileUser>);
    if (body && typeof body === 'object') setUser((prev) => (prev ? { ...prev, ...body } : (body as ProfileUser)));
  };

  const tabProps = {
    user: user!,
    accessToken,
    onUpdateProfile: updateProfile,
    onLogout: logout,
    setRequestStatus,
  };

  if (loading || !user) return (
    <div className="p-6 text-center text-[var(--text-secondary)]">{t(loading ? 'profile.loading' : 'profile.loadError')}</div>
  );

  return (
    <div className="p-6 space-y-6 bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen" dir={i18n.language.startsWith('ar') ? 'rtl' : 'ltr'}>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
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

      {requestStatus && (
        <div className={`p-3 rounded-xl text-sm mb-4 ${requestStatus.type === 'success' ? 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]' : 'bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]'}`}>
          {requestStatus.message}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
          {activeTab === 'account' && <AccountTab {...tabProps} />}
          {activeTab === 'security' && <SecurityTab {...tabProps} />}
          {activeTab === 'preferences' && <PreferencesTab {...tabProps} />}
          {activeTab === 'notifications' && <NotificationsTab {...tabProps} />}
          {activeTab === 'dangerZone' && <DangerZoneTab {...tabProps} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
