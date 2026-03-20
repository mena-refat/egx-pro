import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { useProfileStore } from '../../../store/profileStore';
import { User as UserIcon, Trophy, Settings } from 'lucide-react';
import { FollowersFollowingModal, ProfileCounterRow } from '.';
import { usePredictionsApi } from '../../../hooks/usePredictionsApi';
import type { User } from '../../../types';
import type { ProfileUser } from '.';

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

export default function ProfilePage() {
  const { t, i18n } = useTranslation('common');
  const { user: authUser, accessToken } = useAuthStore();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(() => (authUser ? userToProfileUser(authUser) : null));
  const [loading, setLoading] = useState(() => !authUser);
  const { setCounts, followersCount, followingCount } = useProfileStore();
  const navigate = useNavigate();
  const { fetchMyStats } = usePredictionsApi();
  const [predictionStats, setPredictionStats] = useState<{
    rank: string;
    totalPredictions: number;
    accuracyRate?: number;
    totalPoints?: number;
    bestStreak?: number;
  } | null>(null);

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
        if (!cancelled) setLoading(false);
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

  if (loading || !profileUser) {
    return (
      <div className="p-6 text-center text-[var(--text-secondary)]">
        {t(loading ? 'profile.loading' : 'profile.loadError')}
      </div>
    );
  }

  return (
    <div
      className="p-6 space-y-6 bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen"
      dir={i18n.language.startsWith('ar') ? 'rtl' : 'ltr'}
    >
      {/* Avatar + name + edit button */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-card)] border-2 border-[var(--border)] flex items-center justify-center shrink-0 overflow-hidden">
            {profileUser.avatarUrl ? (
              <img
                src={profileUser.avatarUrl}
                alt=""
                width={64}
                height={64}
                className="w-full h-full rounded-full object-cover"
                loading="lazy"
              />
            ) : (
              <UserIcon className="w-8 h-8 text-[var(--text-muted)]" />
            )}
          </div>
          <div>
            {profileUser.fullName && (
              <p className="font-bold text-lg text-[var(--text-primary)]">{profileUser.fullName}</p>
            )}
            <p className="text-sm text-[var(--text-muted)]">@{profileUser.username ?? ''}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/settings/account')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors shrink-0"
        >
          <Settings className="w-4 h-4" />
          {t('profile.editProfile', { defaultValue: 'تعديل البروفايل' })}
        </button>
      </div>

      {/* Followers / following */}
      <ProfileCounterRow
        profileUsername={profileUser.username ?? ''}
        followersCount={followersCount}
        followingCount={followingCount}
        canOpenModals={true}
      />

      {/* Prediction stats */}
      {predictionStats && (
        <div
          className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
          role="region"
          aria-label={t('predictions.statsSection')}
        >
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-[var(--brand)]" aria-hidden />
            <span className="font-semibold text-[var(--text-primary)]">{t('predictions.statsSection')}</span>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-[var(--text-secondary)] mb-2">
            <span>
              {t(
                `predictions.rank${predictionStats.rank.charAt(0)}${predictionStats.rank.slice(1).toLowerCase()}`
              )}
            </span>
            {predictionStats.accuracyRate != null && (
              <span>
                {t('predictions.accuracy')}: {Math.round(predictionStats.accuracyRate)}%
              </span>
            )}
            {predictionStats.totalPoints != null && (
              <span>
                {predictionStats.totalPoints} {t('predictions.pointsShort')}
              </span>
            )}
            <span>
              {predictionStats.totalPredictions} {t('predictions.predictionsCount')}
            </span>
            {predictionStats.bestStreak != null && predictionStats.bestStreak > 0 && (
              <span>
                {t('predictions.bestStreak')}: {predictionStats.bestStreak}{' '}
                {t('predictions.streakSuffix')}
              </span>
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

      <FollowersFollowingModal />
    </div>
  );
}
