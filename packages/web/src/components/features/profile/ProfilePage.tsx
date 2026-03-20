import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { useProfileStore } from '../../../store/profileStore';
import {
  User as UserIcon,
  Trophy,
  Settings,
  BarChart2,
  CalendarCheck,
  Wallet,
  Star,
  Crosshair,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { FollowersFollowingModal, ProfileCounterRow } from '.';
import { usePredictionsApi } from '../../../hooks/usePredictionsApi';
import api from '../../../lib/api';
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

interface ProfileStats {
  analysesCount?: number;
  watchlistCount?: number;
  portfolioValue?: number;
  daysSinceJoined?: number;
}

interface CompletionData {
  percentage?: number;
  missing?: { field: string; route: string }[];
}

function fieldLabel(field: string): string {
  const map: Record<string, string> = {
    email: 'البريد الإلكتروني',
    phone: 'رقم الهاتف',
    username: 'اسم المستخدم',
    goal: 'هدفك الاستثماري',
    watchlist: 'قائمة المتابعة',
    fullName: 'الاسم الكامل',
  };
  return map[field] ?? field;
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation('common');
  const { user: authUser, accessToken } = useAuthStore();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(
    () => (authUser ? userToProfileUser(authUser) : null)
  );
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

  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [completion, setCompletion] = useState<CompletionData | null>(null);

  const isRtl = i18n.language.startsWith('ar');

  // Load profile user
  useEffect(() => {
    if (authUser) {
      queueMicrotask(() => { setProfileUser(userToProfileUser(authUser)); setLoading(false); });
      return;
    }
    if (!accessToken) { queueMicrotask(() => setLoading(false)); return; }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/user/profile', { headers: { Authorization: `Bearer ${accessToken}` } });
        const data = res.ok ? await res.json() : null;
        if (!cancelled && data) setProfileUser((data as { data?: ProfileUser }).data ?? (data as ProfileUser));
      } catch { /* silent */ } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authUser, accessToken]);

  // Load social counts
  useEffect(() => {
    if (!profileUser?.username || !accessToken) return;
    let cancelled = false;
    void fetch(`/api/social/profile/${encodeURIComponent(profileUser.username)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const p = data?.data ?? data;
        setCounts(p.followersCount ?? 0, p.followingCount ?? 0);
      })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [profileUser?.username, accessToken, setCounts]);

  // Load prediction stats
  useEffect(() => {
    if (!profileUser?.username) return;
    let cancelled = false;
    void fetchMyStats(profileUser.username).then((s) => {
      if (cancelled || !s || ('private' in s && (s as { private?: boolean }).private)) return;
      setPredictionStats({
        rank: (s as { rank?: string }).rank ?? 'BEGINNER',
        totalPredictions: (s as { totalPredictions?: number }).totalPredictions ?? 0,
        accuracyRate: (s as { accuracyRate?: number }).accuracyRate,
        totalPoints: (s as { totalPoints?: number }).totalPoints,
        bestStreak: (s as { bestStreak?: number }).bestStreak,
      });
    });
    return () => { cancelled = true; };
  }, [profileUser?.username, fetchMyStats]);

  // Load profile stats + completion
  useEffect(() => {
    if (!accessToken) return;
    const ctrl = new AbortController();
    Promise.all([
      api.get('/user/profile/stats', { signal: ctrl.signal })
        .then((r) => (r.data as { data?: ProfileStats })?.data ?? (r.data as ProfileStats))
        .catch(() => null),
      api.get('/profile/completion', { signal: ctrl.signal })
        .then((r) => (r.data as { data?: CompletionData })?.data ?? (r.data as CompletionData))
        .catch(() => null),
    ]).then(([s, c]) => {
      if (!ctrl.signal.aborted) { setStats(s); setCompletion(c); }
    });
    return () => ctrl.abort();
  }, [accessToken]);

  if (loading || !profileUser) {
    return (
      <div className="p-6 text-center text-[var(--text-secondary)]">
        {t(loading ? 'profile.loading' : 'profile.loadError')}
      </div>
    );
  }

  // Plan badge
  const plan = (authUser as { plan?: string } | null)?.plan ?? 'free';
  const planBadge = plan === 'ultra'
    ? { label: 'Ultra ✦', cls: 'bg-amber-500/15 text-amber-400 border border-amber-400/30' }
    : (plan === 'pro' || plan === 'yearly')
    ? { label: 'Pro', cls: 'bg-[var(--brand)]/15 text-[var(--brand)] border border-[var(--brand)]/30' }
    : { label: t('subscription.free', { defaultValue: 'مجاني' }), cls: 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)]' };

  const ChevronEnd = isRtl ? ChevronLeft : ChevronRight;

  // Prediction rank label
  const rankKey = predictionStats
    ? `predictions.rank${predictionStats.rank.charAt(0)}${predictionStats.rank.slice(1).toLowerCase()}`
    : '';

  return (
    <div className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── Hero card ── */}
      <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        {/* Decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand)]/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-10 -end-10 w-40 h-40 rounded-full bg-[var(--brand)]/6 blur-3xl pointer-events-none" />

        <div className="relative p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">

            {/* Avatar + info */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-[var(--bg-secondary)] border-2 border-[var(--border)] flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                {profileUser.avatarUrl
                  ? <img src={profileUser.avatarUrl} alt="" width={80} height={80} className="w-full h-full object-cover" loading="lazy" />
                  : <UserIcon className="w-9 h-9 text-[var(--text-muted)]" />
                }
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {profileUser.fullName && (
                    <h2 className="text-xl font-bold text-[var(--text-primary)] leading-tight">{profileUser.fullName}</h2>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${planBadge.cls}`}>
                    {planBadge.label}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">@{profileUser.username ?? '—'}</p>
                {stats?.daysSinceJoined != null && (
                  <p className="text-xs text-[var(--text-muted)] mt-1.5 flex items-center gap-1">
                    <CalendarCheck className="w-3.5 h-3.5" />
                    عضو منذ {stats.daysSinceJoined} يوم
                  </p>
                )}
              </div>
            </div>

            {/* Edit button */}
            <button
              type="button"
              onClick={() => navigate('/settings/account')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors shrink-0"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تعديل</span>
            </button>
          </div>

          {/* Followers / following */}
          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
            <ProfileCounterRow
              profileUsername={profileUser.username ?? ''}
              followersCount={followersCount}
              followingCount={followingCount}
              canOpenModals={true}
            />
          </div>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'قيمة المحفظة',
            value: stats?.portfolioValue ? `${Math.round(stats.portfolioValue).toLocaleString('en-US')}` : '—',
            unit: stats?.portfolioValue ? 'EGP' : undefined,
            icon: Wallet,
            color: 'text-[var(--brand)]',
            bg: 'bg-[var(--brand)]/8',
          },
          {
            label: 'تحليلات AI',
            value: stats?.analysesCount ?? '—',
            icon: BarChart2,
            color: 'text-violet-400',
            bg: 'bg-violet-400/8',
          },
          {
            label: 'المراقبة',
            value: stats?.watchlistCount ?? '—',
            icon: Star,
            color: 'text-amber-400',
            bg: 'bg-amber-400/8',
          },
          {
            label: 'إجمالي التوقعات',
            value: predictionStats?.totalPredictions ?? '—',
            icon: Crosshair,
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/8',
          },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] flex flex-col items-center text-center gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg}`}>
              <s.icon className={`w-4.5 h-4.5 ${s.color}`} style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--text-primary)] leading-tight">
                {s.value}
                {s.unit && <span className="text-xs text-[var(--text-muted)] font-normal ms-1">{s.unit}</span>}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Profile completion ── */}
      {completion?.percentage != null && completion.percentage < 100 && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/8 p-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-sm font-semibold text-amber-400">أكمل ملفك الشخصي</span>
            <span className="text-sm font-bold text-amber-400">{completion.percentage}%</span>
          </div>
          <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-amber-400 rounded-full transition-[width]"
              style={{ width: `${completion.percentage}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {completion.missing?.map((m) => (
              <button
                key={m.field}
                type="button"
                onClick={() => navigate(m.route)}
                className="text-xs px-2.5 py-1 rounded-lg bg-amber-400/15 text-amber-400 hover:bg-amber-400/25 transition-colors font-medium"
              >
                + {fieldLabel(m.field)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Prediction stats ── */}
      {predictionStats && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--brand)]/10 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-[var(--brand)]" />
              </div>
              <span className="font-semibold text-[var(--text-primary)] text-sm">إحصائيات التوقعات</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/predictions')}
              className="text-xs text-[var(--brand)] hover:underline flex items-center gap-0.5"
            >
              عرض الكل
              <ChevronEnd className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { label: 'المستوى', value: t(rankKey, { defaultValue: predictionStats.rank }) },
              { label: 'الدقة', value: predictionStats.accuracyRate != null ? `${Math.round(predictionStats.accuracyRate)}%` : '—' },
              { label: 'النقاط', value: predictionStats.totalPoints != null ? predictionStats.totalPoints.toLocaleString('en-US') : '—' },
              { label: 'أفضل سلسلة', value: predictionStats.bestStreak ? `${predictionStats.bestStreak} ✓` : '—' },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-xl bg-[var(--bg-secondary)] text-center">
                <p className="text-base font-bold text-[var(--text-primary)]">{item.value}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <FollowersFollowingModal />
    </div>
  );
}
