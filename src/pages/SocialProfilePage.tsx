import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { Lock, User as UserIcon, Users, Loader2 } from 'lucide-react';

type SocialProfile = {
  username?: string | null;
  joinDate?: string;
  followersCount?: number;
  followingCount?: number;
  isPrivate?: boolean;
  showPortfolio?: boolean;
  myFollowStatus?: 'none' | 'pending' | 'following';
  portfolio?: Array<{ ticker: string; percentage: number }>;
  watchlist?: Array<{ ticker: string }>;
};

const DONUT_COLORS = [
  'var(--brand)',
  '#22c55e',
  '#eab308',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#ec4899',
];

function PortfolioDonut({ items }: { items: Array<{ ticker: string; percentage: number }> }) {
  if (items.length === 0) return null;
  const total = items.reduce((s, i) => s + i.percentage, 0);
  if (total <= 0) return null;
  let acc = 0;
  const segments = items.map((item, i) => {
    const start = (acc / 100) * 360;
    acc += item.percentage;
    const end = (acc / 100) * 360;
    return { ...item, start, end, color: DONUT_COLORS[i % DONUT_COLORS.length] };
  });
  const conic = segments
    .map((s) => `${s.color} ${s.start}deg ${s.end}deg`)
    .join(', ');
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div
        className="w-24 h-24 rounded-full shrink-0"
        style={{
          background: `conic-gradient(${conic})`,
        }}
      />
      <div className="space-y-1 text-sm min-w-0">
        {items.map((p, i) => (
          <div key={p.ticker} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
            />
            <span className="font-medium truncate">{p.ticker}</span>
            <span className="text-[var(--text-secondary)]">{p.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SocialProfilePage() {
  const { t } = useTranslation('common');
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { accessToken, user: authUser } = useAuthStore();
  const [data, setData] = useState<SocialProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = authUser && username && authUser.username === username;

  const fetchProfile = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/social/profile/${encodeURIComponent(username)}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || 'NOT_FOUND');
        setData(null);
        return;
      }
      const payload = (body as { data?: SocialProfile }).data ?? (body as SocialProfile);
      setData(payload);
    } catch {
      setError('LOAD_ERROR');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [username, accessToken]);

  useEffect(() => {
    if (!username || isOwnProfile) return;
    let cancelled = false;
    fetchProfile();
    return () => { cancelled = true; };
  }, [username, accessToken, isOwnProfile, fetchProfile]);

  if (isOwnProfile && username) {
    navigate('/profile', { replace: true });
    return null;
  }

  const handleFollow = async () => {
    if (!username || !accessToken) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/social/follow/${encodeURIComponent(username)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        const status = body?.data?.status;
        setData((prev) =>
          prev
            ? {
                ...prev,
                myFollowStatus: status === 'ACCEPTED' ? 'following' : 'pending',
              }
            : null
        );
      }
    } catch {
      // ignore
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!username || !accessToken) return;
    setFollowLoading(true);
    try {
      await fetch(`/api/social/unfollow/${encodeURIComponent(username)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setData((prev) =>
        prev ? { ...prev, myFollowStatus: 'none' as const } : null
      );
    } catch {
      // ignore
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-[var(--text-secondary)]">
        {t('profile.loading', { defaultValue: 'Loading profile...' })}
      </div>
    );
  }

  if (error === 'NOT_FOUND' || !data) {
    return (
      <div className="p-6 text-center text-[var(--text-secondary)]">
        {t('profile.notFound', { defaultValue: 'User not found.' })}
      </div>
    );
  }

  const isPrivateBlocked =
    data.isPrivate && !data.portfolio && !data.watchlist && !isOwnProfile;
  const joined = data.joinDate ? new Date(data.joinDate).toLocaleDateString() : null;

  if (isPrivateBlocked) {
    return (
      <div className="p-6 space-y-6 bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-[var(--text-muted)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base">@{data.username ?? username}</span>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-[var(--bg-card)] text-[var(--text-secondary)] text-[11px]">
                <Lock className="w-3 h-3" />
                {t('social.private', { defaultValue: 'Private' })}
              </span>
            </div>
            {joined && (
              <p className="text-xs text-[var(--text-secondary)]">
                {t('social.joined', { defaultValue: 'Joined' })} {joined}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-4 text-sm text-[var(--text-secondary)]">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span className="font-bold text-[var(--text-primary)]">{data.followersCount ?? 0}</span>
            <span>{t('social.followers', { defaultValue: 'Followers' })}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-bold text-[var(--text-primary)]">{data.followingCount ?? 0}</span>
            <span>{t('social.following', { defaultValue: 'Following' })}</span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center text-center text-[var(--text-secondary)] py-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <Lock className="w-10 h-10 mb-3 text-[var(--text-muted)]" />
          <p className="font-bold mb-1">
            {t('social.privateAccountTitle', { defaultValue: 'This account is private' })}
          </p>
          <p className="text-sm mb-4">
            {t('social.privateAccountBody', {
              defaultValue: 'Only approved followers can see this portfolio and watchlist.',
            })}
          </p>
          {data.myFollowStatus === 'none' && (
            <button
              type="button"
              disabled={followLoading}
              onClick={handleFollow}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand)] text-[var(--text-inverse)] font-medium disabled:opacity-60"
            >
              {followLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('social.requestToFollow', { defaultValue: 'Request to Follow' })
              )}
            </button>
          )}
          {data.myFollowStatus === 'pending' && (
            <div className="flex items-center gap-2">
              <span className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                {t('social.requestPending', { defaultValue: 'Request Pending' })}
              </span>
              <button
                type="button"
                disabled={followLoading}
                onClick={handleUnfollow}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-60"
              >
                {t('social.cancelRequest', { defaultValue: 'Cancel' })}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] flex items-center justify-center shrink-0">
            <UserIcon className="w-6 h-6 text-[var(--text-muted)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base">@{data.username ?? username}</span>
              {data.isPrivate && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-[var(--bg-card)] text-[var(--text-secondary)] text-[11px]">
                  <Lock className="w-3 h-3" />
                  {t('social.private', { defaultValue: 'Private' })}
                </span>
              )}
            </div>
            {joined && (
              <p className="text-xs text-[var(--text-secondary)]">
                {t('social.joined', { defaultValue: 'Joined' })} {joined}
              </p>
            )}
          </div>
        </div>
        {!isOwnProfile && accessToken && (
          <div className="shrink-0">
            {data.myFollowStatus === 'none' && (
              <button
                type="button"
                disabled={followLoading}
                onClick={handleFollow}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand)] text-[var(--text-inverse)] text-sm font-medium disabled:opacity-60"
              >
                {followLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t('social.follow', { defaultValue: 'Follow' })
                )}
              </button>
            )}
            {data.myFollowStatus === 'pending' && (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm">
                {t('social.requestPending', { defaultValue: 'Request Pending' })}
                <button
                  type="button"
                  disabled={followLoading}
                  onClick={handleUnfollow}
                  className="text-[var(--text-muted)] hover:text-[var(--danger)] text-xs"
                >
                  {t('social.cancelRequest', { defaultValue: 'Cancel' })}
                </button>
              </span>
            )}
            {data.myFollowStatus === 'following' && (
              <button
                type="button"
                disabled={followLoading}
                onClick={handleUnfollow}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-secondary)] disabled:opacity-60"
              >
                {followLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t('social.unfollow', { defaultValue: 'Unfollow' })
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-4 text-sm text-[var(--text-secondary)]">
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span className="font-bold text-[var(--text-primary)]">{data.followersCount ?? 0}</span>
          <span>{t('social.followers', { defaultValue: 'Followers' })}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-bold text-[var(--text-primary)]">{data.followingCount ?? 0}</span>
          <span>{t('social.following', { defaultValue: 'Following' })}</span>
        </div>
      </div>

      {data.portfolio && data.portfolio.length > 0 && data.showPortfolio !== false && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <h3 className="text-sm font-bold mb-3">
            {t('social.portfolioAllocation', { defaultValue: 'Portfolio allocation (%)' })}
          </h3>
          <PortfolioDonut items={data.portfolio} />
        </div>
      )}

      {data.watchlist && data.watchlist.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <h3 className="text-sm font-bold mb-3">
            {t('social.watchlist', { defaultValue: 'Watchlist' })}
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.watchlist.map((w) => (
              <span
                key={w.ticker}
                className="px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-xs font-medium"
              >
                {w.ticker}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
