import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, Lock, Settings, Bell, Trash2, Trophy } from 'lucide-react';
import { AccountTab, SecurityTab, PreferencesTab, NotificationsTab, DangerZoneTab, FollowersFollowingModal, ProfileCounterRow } from './features/profile';
import { usePredictionsApi } from '../hooks/usePredictionsApi';
import type { User } from '../types';
import type { ProfileUser } from './features/profile';

function userToProfileUser(user: User): ProfileUser {
  return {
    id: user.id,
    fullName: user.fullName ?? null,
    username: user.username ?? null,
    email: user.email ?? null,
    isEmailVerified: user.isEmailVerified,
    phone: user.phone ?? null,
    avatarUrl: user.avatarUrl ?? null,
    twoFactorEnabled: user.twoFactorEnabled,
    language: user.language,
    theme: user.theme,
    shariaMode: user.shariaMode,
    notifySignals: user.notifySignals,
    notifyPortfolio: user.notifyPortfolio,
    notifyNews: user.notifyNews,
  };
}

const TABS = [
  { id: 'account', labelKey: 'settings.accountData', icon: UserIcon },
  { id: 'security', labelKey: 'settings.securityPrivacy', icon: Lock },
  { id: 'preferences', labelKey: 'settings.preferences', icon: Settings },
  { id: 'notifications', labelKey: 'settings.notifications', icon: Bell },
  { id: 'dangerZone', labelKey: 'settings.dangerZone', icon: Trash2 },
] as const;

export default function ProfilePage() {
  const { t, i18n } = useTranslation('common');
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: authUser, accessToken, updateUser, logout } = useAuthStore();
  const resolvedTab = useMemo(() => {
    const tab = searchParams.get('tab');
    return tab && TABS.some((item) => item.id === tab) ? tab : 'account';
  }, [searchParams]);
  const [activeTab, setActiveTab] = useState(resolvedTab);
  const [requestStatus, setRequestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(() => (authUser ? userToProfileUser(authUser) : null));
  const [loading, setLoading] = useState(() => !authUser);
  const { setCounts, followersCount, followingCount } = useProfileStore();
  const navigate = useNavigate();
  const { fetchMyStats } = usePredictionsApi();
  const [predictionStats, setPredictionStats] = useState<{ rank: string; totalPredictions: number; accuracyRate?: number; totalPoints?: number; bestStreak?: number } | null>(null);

  useEffect(() => {
    if (resolvedTab !== activeTab) {
      setActiveTab(resolvedTab);
    }
  }, [activeTab, resolvedTab]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  useEffect(() => {
    if (authUser) {
      queueMicrotask(() => {
        setProfileUser(userToProfileUser(authUser));
        setLoading(false);
      });
      return;
    }
    if (!accessToken) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/user/profile', { headers: { Authorization: `Bearer ${accessToken}` } });
        const data = res.ok ? await res.json() : null;
        if (!cancelled && data) {
          setProfileUser((data as { data?: ProfileUser }).data ?? (data as ProfileUser));
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Profile fetch failed:', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser, accessToken]);

  useEffect(() => {
    if (!profileUser?.username || !accessToken) return;

    let cancelled = false;
    void fetch(`/api/social/profile/${encodeURIComponent(profileUser.username)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const payload = data?.data ?? data;
        setCounts(payload.followersCount ?? 0, payload.followingCount ?? 0);
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.error('Social profile fetch failed:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [profileUser?.username, accessToken, setCounts]);

  useEffect(() => {
    if (!profileUser?.username) return;

    let cancelled = false;
    void fetchMyStats(profileUser.username).then((stats) => {
      if (cancelled || !stats || ('private' in stats && (stats as { private?: boolean }).private)) return;
      setPredictionStats({
        rank: (stats as { rank?: string }).rank ?? 'BEGINNER',
        totalPredictions: (stats as { totalPredictions?: number }).totalPredictions ?? 0,
        accuracyRate: (stats as { accuracyRate?: number }).accuracyRate,
        totalPoints: (stats as { totalPoints?: number }).totalPoints,
        bestStreak: (stats as { bestStreak?: number }).bestStreak,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [profileUser?.username, fetchMyStats]);

  const updateProfile = async (data: Record<string, unknown>) => {
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
    if (payload && typeof payload === 'object') {
      setProfileUser((prev) => (prev ? { ...prev, ...payload } : (payload as ProfileUser)));
    }
  };

  const tabProps = {
    user: profileUser,
    onUpdateProfile: updateProfile,
    onLogout: logout,
    setRequestStatus,
  };

  if (loading || !profileUser) {
    return <div className="p-6 text-center text-[var(--text-secondary)]">{t(loading ? 'profile.loading' : 'profile.loadError')}</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen" dir={i18n.language.startsWith('ar') ? 'rtl' : 'ltr'}>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center shrink-0">
            {profileUser.avatarUrl ? (
              <img src={profileUser.avatarUrl} alt="" width={80} height={80} className="w-full h-full rounded-full object-cover" loading="lazy" />
            ) : (
              <UserIcon className="w-6 h-6 text-[var(--text-muted)]" />
            )}
          </div>
          <div>
            <span className="font-bold text-base text-[var(--text-primary)]">@{profileUser.username ?? ''}</span>
          </div>
        </div>
        <ProfileCounterRow
          profileUsername={profileUser.username ?? ''}
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
