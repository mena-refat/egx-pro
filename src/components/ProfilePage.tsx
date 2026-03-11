import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Settings, Bell, Trash2, Trophy } from 'lucide-react';
import { AccountTab, SecurityTab, PreferencesTab, NotificationsTab, DangerZoneTab, FollowersFollowingModal, ProfileCounterRow } from './features/profile';
import { usePredictionsApi } from '../hooks/usePredictionsApi';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: authUser, accessToken, updateUser, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') ?? 'account');
  const [requestStatus, setRequestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { setCounts, followersCount, followingCount } = useProfileStore();
  const navigate = useNavigate();
  const { fetchMyStats } = usePredictionsApi();
  const [predictionStats, setPredictionStats] = useState<{ rank: string; totalPredictions: number; accuracyRate?: number; totalPoints?: number; bestStreak?: number } | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && TABS.some((tb) => tb.id === tab)) setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  useEffect(() => {
    if (authUser) { setUser(authUser as unknown as ProfileUser); setLoading(false); return; }
    if (!accessToken) { setLoading(false); return; }
    let cancelled = false;
    fetch('/api/user/profile', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (!cancelled && data) setUser((data as { data?: ProfileUser }).data ?? (data as ProfileUser)); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [authUser, accessToken]);

  useEffect(() => {
    if (!user?.username || !accessToken) return;
    let cancelled = false;
    fetch(`/api/social/profile/${encodeURIComponent(user.username)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const d = data?.data ?? data;
        setCounts(d.followersCount ?? 0, d.followingCount ?? 0);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.username, accessToken, setCounts]);

  useEffect(() => {
    if (!user?.username) return;
    let cancelled = false;
    fetchMyStats(user.username).then((s) => {
      if (!cancelled && s && !('private' in s && (s as { private?: boolean }).private)) {
        setPredictionStats({
          rank: (s as { rank?: string }).rank ?? 'BEGINNER',
          totalPredictions: (s as { totalPredictions?: number }).totalPredictions ?? 0,
          accuracyRate: (s as { accuracyRate?: number }).accuracyRate,
          totalPoints: (s as { totalPoints?: number }).totalPoints,
          bestStreak: (s as { bestStreak?: number }).bestStreak,
        });
      }
    });
    return () => { cancelled = true; };
  }, [user?.username, fetchMyStats]);

  const updateProfile = async (data: Record<string, unknown>, _messages?: { success?: string; error?: string }) => {
    if (!accessToken) return;
    const res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body?.error as string) || 'Failed');
    const payload = (body as { data?: ProfileUser }).data ?? (body as Partial<ProfileUser>);
    updateUser(payload as Partial<ProfileUser>);
    if (payload && typeof payload === 'object') setUser((prev) => (prev ? { ...prev, ...payload } : (payload as ProfileUser)));
  };

  const tabProps = {
    user,
    onUpdateProfile: updateProfile,
    onLogout: logout,
    setRequestStatus,
  };

  if (loading || !user) return (
    <div className="p-6 text-center text-[var(--text-secondary)]">{t(loading ? 'profile.loading' : 'profile.loadError')}</div>
  );

  return (
    <div className="p-6 space-y-6 bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen" dir={i18n.language.startsWith('ar') ? 'rtl' : 'ltr'}>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center shrink-0">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-[var(--text-muted)]" />
            )}
          </div>
          <div>
            <span className="font-bold text-base text-[var(--text-primary)]">@{user?.username ?? ''}</span>
          </div>
        </div>
        <ProfileCounterRow
          profileUsername={user?.username ?? ''}
          followersCount={followersCount}
          followingCount={followingCount}
          canOpenModals={true}
        />
        {predictionStats && (
          <div
            className="mt-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
            role="region"
            aria-label={t('predictions.statsSection')}
          >
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-[var(--brand)]" aria-hidden />
              <span className="font-semibold text-[var(--text-primary)]">{t('predictions.statsSection')}</span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-[var(--text-secondary)] mb-2">
              <span>{t(`predictions.rank${predictionStats.rank.charAt(0)}${predictionStats.rank.slice(1).toLowerCase()}`)}</span>
              {predictionStats.accuracyRate != null && <span>{t('predictions.accuracy')}: {Math.round(predictionStats.accuracyRate)}%</span>}
              {predictionStats.totalPoints != null && <span>{predictionStats.totalPoints} {t('predictions.pointsShort')}</span>}
              <span>{predictionStats.totalPredictions} {t('predictions.predictionsCount')}</span>
              {predictionStats.bestStreak != null && predictionStats.bestStreak > 0 && (
                <span>{t('predictions.bestStreak')}: {predictionStats.bestStreak} {t('predictions.streakSuffix')}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate('/predictions')}
              className="text-sm font-medium text-[var(--brand)] hover:underline"
            >
              {t('predictions.viewAllPredictions')} →
            </button>
          </div>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
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
      <FollowersFollowingModal />
    </div>
  );
}
