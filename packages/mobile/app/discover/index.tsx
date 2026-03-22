import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, ArrowRight, Search, Users, UserCheck,
  UserPlus, TrendingUp, TrendingDown, Trophy,
  Clock, CheckCircle, XCircle,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../hooks/useTheme';
import apiClient from '../../lib/api/client';
import { BRAND, FONT, WEIGHT, RADIUS, SPACE } from '../../lib/theme';

type DiscoverTab = 'community' | 'followers' | 'following' | 'requests';

interface UserItem {
  id: string;
  username: string;
  fullName?: string;
  avatarUrl?: string | null;
  followStatus?: 'none' | 'pending' | 'accepted' | 'blocked';
  rank?: string;
}

interface FeedPrediction {
  id: string;
  ticker: string;
  direction: 'UP' | 'DOWN';
  targetPrice?: number;
  status: 'PENDING' | 'CORRECT' | 'WRONG' | 'EXPIRED';
  reason?: string | null;
  likes: number;
  createdAt: string;
  user: { username: string; fullName?: string; avatarUrl?: string | null };
}

interface LeaderboardEntry {
  username: string;
  fullName?: string;
  avatarUrl?: string | null;
  rank: string;
  winRate: number;
  total: number;
  correct: number;
  points: number;
}

const RANK_LABELS: Record<string, { label: string; color: string }> = {
  BEGINNER: { label: 'مبتدئ', color: '#9ca3af' },
  ANALYST:  { label: 'محلل',  color: '#3b82f6' },
  SENIOR:   { label: 'خبير',  color: '#8b5cf6' },
  EXPERT:   { label: 'متقدم', color: '#f59e0b' },
  LEGEND:   { label: 'أسطورة', color: '#ef4444' },
};

const STATUS_CONFIG: Record<string, { color: string; icon: typeof Clock }> = {
  PENDING:  { color: '#f59e0b', icon: Clock },
  CORRECT:  { color: '#4ade80', icon: CheckCircle },
  WRONG:    { color: '#f87171', icon: XCircle },
  EXPIRED:  { color: '#9ca3af', icon: Clock },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'جارية',
  CORRECT: 'صحيحة',
  WRONG: 'خاطئة',
  EXPIRED: 'منتهية',
};

// ─── AvatarCircle (stable — defined outside component) ───────────
function AvatarCircle({ name, size = 40 }: { name?: string | null; size?: number }) {
  const { colors } = useTheme();
  void colors; // colours not needed here but keep consistent with rest of file
  const initial = (name ?? '؟').charAt(0).toUpperCase();
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: BRAND + '22', alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: BRAND, fontSize: size * 0.38, fontWeight: WEIGHT.bold }}>{initial}</Text>
    </View>
  );
}

// ─── EmptyState (stable — defined outside component) ─────────────
function EmptyState({
  icon: Icon, text,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  text: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: SPACE.md }}>
      <View style={{
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={24} color={colors.textMuted} />
      </View>
      <Text style={{ color: colors.textMuted, fontSize: FONT.sm }}>{text}</Text>
    </View>
  );
}

function UserRow({
  user, onPress, onFollow, onUnfollow, onAccept, onDecline,
  showFollowBtn = true, isRequest = false,
}: {
  user: UserItem;
  onPress: () => void;
  onFollow?: () => Promise<void>;
  onUnfollow?: () => Promise<void>;
  onAccept?: () => void;
  onDecline?: () => void;
  showFollowBtn?: boolean;
  isRequest?: boolean;
}) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState(user.followStatus ?? 'none');
  const rankInfo = user.rank ? RANK_LABELS[user.rank] : undefined;

  const handleFollow = async () => {
    if (!onFollow) return;
    setLoading(true);
    await onFollow();
    setLocalStatus('pending');
    setLoading(false);
  };

  const handleUnfollow = async () => {
    if (!onUnfollow) return;
    setLoading(true);
    await onUnfollow();
    setLocalStatus('none');
    setLoading(false);
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
        paddingHorizontal: SPACE.lg, paddingVertical: 12,
        backgroundColor: pressed ? colors.hover : 'transparent',
      })}
    >
      <AvatarCircle name={user.fullName || user.username} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.semibold }}>
          {user.fullName || user.username}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <Text style={{ color: colors.textMuted, fontSize: FONT.xs }}>@{user.username}</Text>
          {rankInfo && (
            <View style={{
              backgroundColor: rankInfo.color + '20', paddingHorizontal: 5,
              paddingVertical: 1, borderRadius: RADIUS.sm,
            }}>
              <Text style={{ color: rankInfo.color, fontSize: 10, fontWeight: WEIGHT.semibold }}>{rankInfo.label}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Follow button */}
      {showFollowBtn && !isRequest && (
        loading ? (
          <ActivityIndicator size="small" color={BRAND} />
        ) : localStatus === 'accepted' ? (
          <Pressable
            onPress={handleUnfollow}
            style={{
              borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.lg,
              paddingHorizontal: SPACE.md, paddingVertical: 6,
            }}
          >
            <Text style={{ color: colors.textSub, fontSize: FONT.xs, fontWeight: WEIGHT.semibold }}>أتابعه</Text>
          </Pressable>
        ) : localStatus === 'pending' ? (
          <View style={{
            backgroundColor: BRAND + '15', borderRadius: RADIUS.lg,
            paddingHorizontal: SPACE.md, paddingVertical: 6,
          }}>
            <Text style={{ color: BRAND, fontSize: FONT.xs, fontWeight: WEIGHT.semibold }}>في الانتظار</Text>
          </View>
        ) : (
          <Pressable
            onPress={handleFollow}
            style={{ backgroundColor: BRAND, borderRadius: RADIUS.lg, paddingHorizontal: SPACE.md, paddingVertical: 6 }}
          >
            <Text style={{ color: '#fff', fontSize: FONT.xs, fontWeight: WEIGHT.bold }}>متابعة</Text>
          </Pressable>
        )
      )}

      {/* Accept / Decline for requests */}
      {isRequest && (
        <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
          <Pressable
            onPress={onDecline}
            style={{
              borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.lg,
              paddingHorizontal: SPACE.md, paddingVertical: 6,
            }}
          >
            <Text style={{ color: colors.textSub, fontSize: FONT.xs }}>رفض</Text>
          </Pressable>
          <Pressable
            onPress={onAccept}
            style={{ backgroundColor: BRAND, borderRadius: RADIUS.lg, paddingHorizontal: SPACE.md, paddingVertical: 6 }}
          >
            <Text style={{ color: '#fff', fontSize: FONT.xs, fontWeight: WEIGHT.bold }}>قبول</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

function FeedCard({ pred }: { pred: FeedPrediction }) {
  const { colors } = useTheme();
  const router = useRouter();
  const isUp = pred.direction === 'UP';
  const st = STATUS_CONFIG[pred.status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = st.icon;

  return (
    <Pressable
      onPress={() => router.push(`/profile/${pred.user.username}` as never)}
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.hover : colors.card,
        borderColor: colors.border, borderWidth: 1,
        borderRadius: RADIUS.xl, padding: SPACE.lg, marginBottom: SPACE.sm, gap: SPACE.md,
      })}
    >
      {/* User row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
        <AvatarCircle name={pred.user.fullName || pred.user.username} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.semibold }}>
            {pred.user.fullName || pred.user.username}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: FONT.xs }}>@{pred.user.username}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <StatusIcon size={11} color={st.color} />
          <Text style={{ color: st.color, fontSize: FONT.xs }}>{STATUS_LABELS[pred.status]}</Text>
        </View>
      </View>

      {/* Prediction info */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
        <Text style={{ color: colors.text, fontSize: FONT.md, fontWeight: WEIGHT.bold }}>{pred.ticker}</Text>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 4,
          backgroundColor: isUp ? '#4ade8018' : '#f8717118',
          paddingHorizontal: SPACE.sm, paddingVertical: 3, borderRadius: RADIUS.md,
        }}>
          {isUp
            ? <TrendingUp size={11} color="#4ade80" />
            : <TrendingDown size={11} color="#f87171" />}
          <Text style={{ color: isUp ? '#4ade80' : '#f87171', fontSize: FONT.xs, fontWeight: WEIGHT.bold }}>
            {isUp ? 'صعود' : 'هبوط'}
          </Text>
        </View>
        {pred.targetPrice != null && (
          <Text style={{ color: colors.textSub, fontSize: FONT.xs }}>{pred.targetPrice} EGP</Text>
        )}
      </View>

      {pred.reason ? (
        <Text style={{ color: colors.textSub, fontSize: FONT.xs, lineHeight: 18 }} numberOfLines={2}>
          {pred.reason}
        </Text>
      ) : null}

      <Text style={{ color: colors.textMuted, fontSize: 11 }}>
        {new Date(pred.createdAt).toLocaleDateString('ar-EG')}
      </Text>
    </Pressable>
  );
}

function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const { colors } = useTheme();
  const router = useRouter();
  const rankInfo = RANK_LABELS[entry.rank] ?? RANK_LABELS.BEGINNER;
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <Pressable
      onPress={() => router.push(`/profile/${entry.username}` as never)}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
        paddingHorizontal: SPACE.lg, paddingVertical: 12,
        backgroundColor: pressed ? colors.hover : 'transparent',
        borderBottomWidth: 1, borderBottomColor: colors.border2 ?? '#243047',
      })}
    >
      <Text style={{ color: rank <= 3 ? '#f59e0b' : colors.textMuted, fontSize: FONT.sm, fontWeight: WEIGHT.extrabold, width: 28, textAlign: 'center' }}>
        {rank <= 3 ? medals[rank - 1] : rank}
      </Text>
      <AvatarCircle name={entry.fullName || entry.username} size={38} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.semibold }}>
          {entry.fullName || entry.username}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <Text style={{ color: colors.textMuted, fontSize: FONT.xs }}>@{entry.username}</Text>
          <View style={{ backgroundColor: rankInfo.color + '20', paddingHorizontal: 5, paddingVertical: 1, borderRadius: RADIUS.sm }}>
            <Text style={{ color: rankInfo.color, fontSize: 10, fontWeight: WEIGHT.semibold }}>{rankInfo.label}</Text>
          </View>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={{ color: '#4ade80', fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>{Math.round(entry.winRate)}%</Text>
        <Text style={{ color: colors.textMuted, fontSize: 11 }}>{entry.total} توقع</Text>
      </View>
    </Pressable>
  );
}

const TABS: { id: DiscoverTab; label: string; Icon: React.ComponentType<{ size: number; color: string }> }[] = [
  { id: 'community', label: 'المجتمع',    Icon: Trophy },
  { id: 'followers', label: 'المتابِعون', Icon: Users },
  { id: 'following', label: 'أتابعهم',   Icon: UserCheck },
  { id: 'requests',  label: 'الطلبات',   Icon: UserPlus },
];

export default function DiscoverPage() {
  const router = useRouter();
  const { colors, isRTL } = useTheme();
  const [activeTab, setActiveTab] = useState<DiscoverTab>('community');
  const mountedRef = useRef(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserItem[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [feed, setFeed]               = useState<FeedPrediction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [followers, setFollowers]     = useState<UserItem[]>([]);
  const [following, setFollowing]     = useState<UserItem[]>([]);
  const [requests, setRequests]       = useState<UserItem[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => () => {
    mountedRef.current = false;
    // Clear debounce timer on unmount to prevent state updates after unmount
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
  }, []);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const loadCommunity = useCallback(async (signal?: AbortSignal) => {
    if (mountedRef.current) setLoading(true);
    try {
      const [feedRes, lbRes] = await Promise.all([
        apiClient.get('/api/predictions/feed?limit=20', { signal }),
        apiClient.get('/api/predictions/leaderboard?limit=10', { signal }),
      ]);
      if (!signal?.aborted && mountedRef.current) {
        setFeed((feedRes.data as { items?: FeedPrediction[] }).items ?? []);
        setLeaderboard((lbRes.data as { items?: LeaderboardEntry[] }).items ?? []);
      }
    } catch {
      /* ignore cancelled / network errors */
    } finally {
      if (!signal?.aborted && mountedRef.current) setLoading(false);
    }
  }, []);

  const loadFollowers = useCallback(async (signal?: AbortSignal) => {
    if (mountedRef.current) setLoading(true);
    try {
      const res = await apiClient.get('/api/social/followers', { signal });
      if (!signal?.aborted && mountedRef.current)
        setFollowers((res.data as { items?: UserItem[] }).items ?? []);
    } catch { /* ignore */ } finally {
      if (!signal?.aborted && mountedRef.current) setLoading(false);
    }
  }, []);

  const loadFollowing = useCallback(async (signal?: AbortSignal) => {
    if (mountedRef.current) setLoading(true);
    try {
      const res = await apiClient.get('/api/social/following', { signal });
      if (!signal?.aborted && mountedRef.current)
        setFollowing((res.data as { items?: UserItem[] }).items ?? []);
    } catch { /* ignore */ } finally {
      if (!signal?.aborted && mountedRef.current) setLoading(false);
    }
  }, []);

  const loadRequests = useCallback(async (signal?: AbortSignal) => {
    if (mountedRef.current) setLoading(true);
    try {
      const res = await apiClient.get('/api/social/requests', { signal });
      if (!signal?.aborted && mountedRef.current)
        setRequests((res.data as { items?: UserItem[] }).items ?? []);
    } catch { /* ignore */ } finally {
      if (!signal?.aborted && mountedRef.current) setLoading(false);
    }
  }, []);

  // Load data for the active tab; cancel in-flight requests on tab switch
  useEffect(() => {
    const ctrl = new AbortController();
    if (activeTab === 'community') loadCommunity(ctrl.signal);
    if (activeTab === 'followers') loadFollowers(ctrl.signal);
    if (activeTab === 'following') loadFollowing(ctrl.signal);
    if (activeTab === 'requests')  loadRequests(ctrl.signal);
    return () => ctrl.abort();
  }, [activeTab, loadCommunity, loadFollowers, loadFollowing, loadRequests]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiClient.get(`/api/social/username-search?q=${encodeURIComponent(q.trim())}`);
        if (mountedRef.current)
          setSearchResults((res.data as { items?: UserItem[] }).items ?? []);
      } catch {
        if (mountedRef.current) setSearchResults([]);
      } finally {
        if (mountedRef.current) setSearching(false);
      }
    }, 400);
  }, []);

  const follow = async (username: string) => {
    try { await apiClient.post(`/api/social/follow/${username}`); } catch { /* ignore */ }
  };
  const unfollow = async (username: string) => {
    try { await apiClient.delete(`/api/social/unfollow/${username}`); } catch { /* ignore */ }
  };
  const acceptRequest = async (followerId: string) => {
    try {
      await apiClient.post(`/api/social/requests/${followerId}/accept`);
      if (mountedRef.current) setRequests((prev) => prev.filter((r) => r.id !== followerId));
    } catch { /* ignore */ }
  };
  const declineRequest = async (followerId: string) => {
    try {
      await apiClient.post(`/api/social/requests/${followerId}/decline`);
      if (mountedRef.current) setRequests((prev) => prev.filter((r) => r.id !== followerId));
    } catch { /* ignore */ }
  };

  return (
    <ScreenWrapper padded={false}>
      {/* ─── Header ─── */}
      <View style={{
        flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: SPACE.md,
        paddingHorizontal: SPACE.lg, paddingTop: 18, paddingBottom: 14,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 36, height: 36, borderRadius: RADIUS.xl,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: colors.hover, borderWidth: 1, borderColor: colors.border,
          }}
        >
          <BackIcon size={16} color={colors.textSub} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: WEIGHT.extrabold }}>المجتمع</Text>
          <Text style={{ color: colors.textMuted, fontSize: FONT.xs, marginTop: 2 }}>
            اكتشف المتداولين والتوقعات
          </Text>
        </View>
      </View>

      {/* ─── Search Bar ─── */}
      <View style={{ paddingHorizontal: SPACE.lg, paddingTop: SPACE.md, paddingBottom: SPACE.sm }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
          backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
          borderRadius: RADIUS.xl, paddingHorizontal: SPACE.md, height: 42,
        }}>
          <Search size={15} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="ابحث عن مستخدم بالاسم..."
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, color: colors.text, fontSize: FONT.sm, textAlign: isRTL ? 'right' : 'left' }}
          />
          {searching && <ActivityIndicator size="small" color={BRAND} />}
        </View>

        {/* Search Results Dropdown */}
        {searchQuery.trim() !== '' && (
          <View style={{
            backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
            borderRadius: RADIUS.xl, marginTop: 4, overflow: 'hidden',
          }}>
            {searchResults.length === 0 && !searching ? (
              <View style={{ padding: SPACE.lg, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: FONT.sm }}>لا نتائج</Text>
              </View>
            ) : (
              searchResults.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  onPress={() => { setSearchQuery(''); router.push(`/profile/${u.username}` as never); }}
                  onFollow={() => follow(u.username)}
                  onUnfollow={() => unfollow(u.username)}
                />
              ))
            )}
          </View>
        )}
      </View>

      {/* ─── Tabs ─── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SPACE.lg, gap: SPACE.sm, paddingBottom: SPACE.sm }}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                paddingHorizontal: SPACE.md, paddingVertical: 8, borderRadius: RADIUS.xl, borderWidth: 1,
                backgroundColor: active ? BRAND + '15' : colors.card,
                borderColor: active ? BRAND + '40' : colors.border,
              }}
            >
              <tab.Icon size={13} color={active ? BRAND : colors.textMuted} />
              <Text style={{ fontSize: FONT.xs, fontWeight: WEIGHT.semibold, color: active ? BRAND : colors.textSub }}>
                {tab.label}
                {tab.id === 'requests' && requests.length > 0 ? ` (${requests.length})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ─── Content ─── */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={BRAND} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

          {/* ── Community Tab ── */}
          {activeTab === 'community' && (
            <View style={{ paddingHorizontal: SPACE.lg, paddingTop: SPACE.md }}>
              {/* Leaderboard */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACE.sm }}>
                <Trophy size={15} color="#f59e0b" />
                <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>لوحة المتصدرين</Text>
              </View>
              <View style={{
                backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
                borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: SPACE.lg,
              }}>
                {leaderboard.length === 0 ? (
                  <EmptyState icon={Trophy} text="لا يوجد بيانات بعد" />
                ) : (
                  leaderboard.slice(0, 5).map((entry, idx) => (
                    <LeaderboardRow key={entry.username} entry={entry} rank={idx + 1} />
                  ))
                )}
              </View>

              {/* Community Feed */}
              <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold, marginBottom: SPACE.md }}>
                توقعات المجتمع
              </Text>
              {feed.length === 0 ? (
                <View style={{
                  backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
                  borderRadius: RADIUS.xl,
                }}>
                  <EmptyState icon={TrendingUp} text="لا توجد توقعات عامة بعد" />
                </View>
              ) : (
                feed.map((p) => <FeedCard key={p.id} pred={p} />)
              )}
            </View>
          )}

          {/* ── Followers Tab ── */}
          {activeTab === 'followers' && (
            <View style={{
              marginHorizontal: SPACE.lg, marginTop: SPACE.md,
              backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
              borderRadius: RADIUS.xl, overflow: 'hidden',
            }}>
              {followers.length === 0 ? (
                <EmptyState icon={Users} text="لا متابعون بعد" />
              ) : (
                followers.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    onPress={() => router.push(`/profile/${u.username}` as never)}
                    showFollowBtn={false}
                  />
                ))
              )}
            </View>
          )}

          {/* ── Following Tab ── */}
          {activeTab === 'following' && (
            <View style={{
              marginHorizontal: SPACE.lg, marginTop: SPACE.md,
              backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
              borderRadius: RADIUS.xl, overflow: 'hidden',
            }}>
              {following.length === 0 ? (
                <EmptyState icon={UserCheck} text="لا تتابع أحداً بعد — ابحث للعثور على متداولين" />
              ) : (
                following.map((u) => (
                  <UserRow
                    key={u.id}
                    user={{ ...u, followStatus: 'accepted' }}
                    onPress={() => router.push(`/profile/${u.username}` as never)}
                    onUnfollow={async () => {
                      await unfollow(u.username);
                      if (mountedRef.current) setFollowing((prev) => prev.filter((f) => f.id !== u.id));
                    }}
                  />
                ))
              )}
            </View>
          )}

          {/* ── Requests Tab ── */}
          {activeTab === 'requests' && (
            <View style={{
              marginHorizontal: SPACE.lg, marginTop: SPACE.md,
              backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
              borderRadius: RADIUS.xl, overflow: 'hidden',
            }}>
              {requests.length === 0 ? (
                <EmptyState icon={UserPlus} text="لا طلبات متابعة حالياً" />
              ) : (
                requests.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    onPress={() => router.push(`/profile/${u.username}` as never)}
                    isRequest
                    showFollowBtn={false}
                    onAccept={() => acceptRequest(u.id)}
                    onDecline={() => declineRequest(u.id)}
                  />
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}
