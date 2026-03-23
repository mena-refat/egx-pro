import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft, ArrowRight, Lock, UserCheck, UserPlus,
  TrendingUp, TrendingDown, Star, BarChart2, Eye,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../hooks/useTheme';
import apiClient from '../../lib/api/client';
import { useAuthStore } from '../../store/authStore';
import { BRAND, FONT, WEIGHT, RADIUS, SPACE } from '../../lib/theme';

interface SocialProfile {
  id: string;
  username: string;
  fullName?: string;
  avatarUrl?: string | null;
  isPrivate: boolean;
  showPortfolio: boolean;
  followStatus: 'none' | 'pending' | 'accepted' | 'blocked';
  followersCount: number;
  followingCount: number;
  portfolio?: Array<{ ticker: string; shares: number; avgPrice: number }>;
  watchlist?: Array<{ ticker: string; targetPrice?: number; targetDir?: string }>;
  predictionStats?: {
    total: number;
    correct: number;
    wrong: number;
    winRate: number;
    rank: string;
    points: number;
  };
}

const RANK_LABELS: Record<string, { label: string; color: string }> = {
  BEGINNER: { label: 'مبتدئ',  color: '#9ca3af' },
  ANALYST:  { label: 'محلل',   color: '#3b82f6' },
  SENIOR:   { label: 'خبير',   color: '#8b5cf6' },
  EXPERT:   { label: 'متقدم',  color: '#f59e0b' },
  LEGEND:   { label: 'أسطورة', color: '#ef4444' },
};

function AvatarCircle({ name, size = 64 }: { name?: string | null; size?: number }) {
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

function StatBox({ value, label, color }: { value: string | number; label: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: SPACE.md }}>
      <Text style={{ color: color ?? colors.text, fontSize: FONT.lg, fontWeight: WEIGHT.bold }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontSize: FONT.xs, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={{ width: 1, backgroundColor: colors.border, alignSelf: 'stretch' }} />;
}

export default function SocialProfilePage() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router   = useRouter();
  const { colors, isRTL } = useTheme();
  const { user: authUser } = useAuthStore();

  const [profile, setProfile]           = useState<SocialProfile | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<'not_found' | 'error' | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const isOwnProfile = authUser?.username === username;

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/api/social/profile/${username}`);
      setProfile(res.data as SocialProfile);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(code === 'NOT_FOUND' || code === 'USER_NOT_FOUND' ? 'not_found' : 'error');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (isOwnProfile) {
      router.replace('/(tabs)/profile');
      return;
    }
    void loadProfile();
  }, [isOwnProfile, loadProfile, router]);

  const handleFollow = async () => {
    if (!profile) return;
    setFollowLoading(true);
    try {
      await apiClient.post(`/api/social/follow/${username}`);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              followStatus: prev.isPrivate ? 'pending' : 'accepted',
              followersCount: prev.followersCount + (prev.isPrivate ? 0 : 1),
            }
          : prev,
      );
    } catch { /* ignore */ } finally { setFollowLoading(false); }
  };

  const handleUnfollow = async () => {
    if (!profile) return;
    setFollowLoading(true);
    try {
      await apiClient.delete(`/api/social/unfollow/${username}`);
      setProfile((prev) =>
        prev
          ? { ...prev, followStatus: 'none', followersCount: Math.max(0, prev.followersCount - 1) }
          : prev,
      );
    } catch { /* ignore */ } finally { setFollowLoading(false); }
  };

  const rankInfo = profile?.predictionStats?.rank
    ? (RANK_LABELS[profile.predictionStats.rank] ?? RANK_LABELS.BEGINNER)
    : null;

  const isPrivateBlocked =
    !!profile?.isPrivate &&
    profile.followStatus !== 'accepted' &&
    !isOwnProfile;

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
        <Text style={{ color: colors.text, fontSize: FONT.md, fontWeight: WEIGHT.bold }}>
          {username ? `@${username}` : 'الملف الشخصي'}
        </Text>
      </View>

      {/* ─── Loading ─── */}
      {loading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={BRAND} size="large" />
        </View>
      )}

      {/* ─── Not Found ─── */}
      {!loading && error === 'not_found' && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACE.md, paddingHorizontal: SPACE.xl }}>
          <Text style={{ fontSize: 48 }}>😕</Text>
          <Text style={{ color: colors.text, fontSize: FONT.md, fontWeight: WEIGHT.bold }}>المستخدم غير موجود</Text>
          <Text style={{ color: colors.textMuted, fontSize: FONT.sm, textAlign: 'center', lineHeight: 20 }}>
            هذا الحساب غير موجود أو تم حذفه
          </Text>
        </View>
      )}

      {/* ─── Generic Error ─── */}
      {!loading && error === 'error' && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACE.md }}>
          <Text style={{ color: colors.textMuted, fontSize: FONT.sm }}>حدث خطأ في التحميل</Text>
          <Pressable
            onPress={loadProfile}
            style={{ backgroundColor: BRAND, borderRadius: RADIUS.xl, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm }}
          >
            <Text style={{ color: '#fff', fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      )}

      {/* ─── Profile Content ─── */}
      {!loading && !error && profile && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

          {/* ── Profile Card ── */}
          <View style={{
            margin: SPACE.lg, backgroundColor: colors.card,
            borderColor: colors.border, borderWidth: 1, borderRadius: RADIUS.xl,
            padding: SPACE.lg, gap: SPACE.md,
          }}>
            {/* Avatar + Name + Follow */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md }}>
              <AvatarCircle name={profile.fullName || profile.username} size={64} />

              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: FONT.lg, fontWeight: WEIGHT.bold }}>
                  {profile.fullName || profile.username}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: FONT.sm, marginTop: 2 }}>@{profile.username}</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  {rankInfo && (
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                      backgroundColor: rankInfo.color + '20', borderRadius: RADIUS.md,
                      paddingHorizontal: SPACE.sm, paddingVertical: 3,
                    }}>
                      <Star size={10} color={rankInfo.color} />
                      <Text style={{ color: rankInfo.color, fontSize: FONT.xs, fontWeight: WEIGHT.semibold }}>
                        {rankInfo.label}
                      </Text>
                    </View>
                  )}
                  {profile.isPrivate && (
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                      backgroundColor: colors.hover, borderRadius: RADIUS.md,
                      paddingHorizontal: SPACE.sm, paddingVertical: 3,
                    }}>
                      <Lock size={10} color={colors.textMuted} />
                      <Text style={{ color: colors.textMuted, fontSize: FONT.xs }}>خاص</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Follow Button */}
              {!isOwnProfile && (
                followLoading ? (
                  <ActivityIndicator color={BRAND} size="small" style={{ marginTop: 8 }} />
                ) : profile.followStatus === 'accepted' ? (
                  <Pressable
                    onPress={handleUnfollow}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 5,
                      borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.xl,
                      paddingHorizontal: SPACE.md, paddingVertical: 8, marginTop: 4,
                    }}
                  >
                    <UserCheck size={13} color={colors.textSub} />
                    <Text style={{ color: colors.textSub, fontSize: FONT.xs, fontWeight: WEIGHT.semibold }}>أتابعه</Text>
                  </Pressable>
                ) : profile.followStatus === 'pending' ? (
                  <Pressable
                    onPress={handleUnfollow}
                    style={{
                      backgroundColor: BRAND + '15', borderRadius: RADIUS.xl,
                      paddingHorizontal: SPACE.md, paddingVertical: 8, marginTop: 4,
                    }}
                  >
                    <Text style={{ color: BRAND, fontSize: FONT.xs, fontWeight: WEIGHT.semibold }}>في الانتظار</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={handleFollow}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 5,
                      backgroundColor: BRAND, borderRadius: RADIUS.xl,
                      paddingHorizontal: SPACE.md, paddingVertical: 8, marginTop: 4,
                    }}
                  >
                    <UserPlus size={13} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: FONT.xs, fontWeight: WEIGHT.bold }}>متابعة</Text>
                  </Pressable>
                )
              )}
            </View>

            {/* Stats Row */}
            <View style={{
              flexDirection: 'row', backgroundColor: colors.bg,
              borderRadius: RADIUS.xl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
            }}>
              <StatBox value={profile.followersCount} label="متابِع" />
              <Divider />
              <StatBox value={profile.followingCount} label="يتابع" />
              {profile.predictionStats && (
                <>
                  <Divider />
                  <StatBox
                    value={`${Math.round(profile.predictionStats.winRate)}%`}
                    label="دقة التوقعات"
                    color="#4ade80"
                  />
                </>
              )}
            </View>
          </View>

          {/* ── Private / Locked ── */}
          {isPrivateBlocked && (
            <View style={{
              marginHorizontal: SPACE.lg, backgroundColor: colors.card,
              borderColor: colors.border, borderWidth: 1, borderRadius: RADIUS.xl,
              padding: SPACE.xl, alignItems: 'center', gap: SPACE.md,
            }}>
              <View style={{
                width: 60, height: 60, borderRadius: 30,
                backgroundColor: colors.hover, alignItems: 'center', justifyContent: 'center',
              }}>
                <Lock size={26} color={colors.textMuted} />
              </View>
              <Text style={{ color: colors.text, fontSize: FONT.md, fontWeight: WEIGHT.bold }}>
                هذا الحساب خاص
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: FONT.sm, textAlign: 'center', lineHeight: 20 }}>
                {profile.followStatus === 'pending'
                  ? 'طلب المتابعة قيد الانتظار — ستتمكن من رؤية المحتوى بعد القبول'
                  : 'تابع هذا الحساب لرؤية محفظته وتوقعاته'}
              </Text>
            </View>
          )}

          {/* ── Prediction Stats (visible if public or following) ── */}
          {!isPrivateBlocked && profile.predictionStats && (
            <View style={{
              marginHorizontal: SPACE.lg, marginBottom: SPACE.sm,
              backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
              borderRadius: RADIUS.xl, overflow: 'hidden',
            }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
                borderBottomWidth: 1, borderBottomColor: colors.border,
              }}>
                <TrendingUp size={14} color="#3b82f6" />
                <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>
                  إحصائيات التوقعات
                </Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <StatBox value={profile.predictionStats.total}   label="إجمالي" />
                <Divider />
                <StatBox value={profile.predictionStats.correct} label="صحيحة" color="#4ade80" />
                <Divider />
                <StatBox value={profile.predictionStats.wrong}   label="خاطئة"  color="#f87171" />
                <Divider />
                <StatBox value={profile.predictionStats.points}  label="نقاط"   color={BRAND} />
              </View>
            </View>
          )}

          {/* ── Portfolio ── */}
          {!isPrivateBlocked && profile.showPortfolio && !!profile.portfolio?.length && (
            <View style={{
              marginHorizontal: SPACE.lg, marginBottom: SPACE.sm,
              backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
              borderRadius: RADIUS.xl, overflow: 'hidden',
            }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
                borderBottomWidth: 1, borderBottomColor: colors.border,
              }}>
                <BarChart2 size={14} color={BRAND} />
                <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>المحفظة</Text>
              </View>
              {profile.portfolio.slice(0, 6).map((h, i) => (
                <Pressable
                  key={h.ticker}
                  onPress={() => router.push(`/stocks/${h.ticker}` as never)}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
                    backgroundColor: pressed ? colors.hover : 'transparent',
                    borderBottomWidth: i < profile.portfolio!.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  })}
                >
                  <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>{h.ticker}</Text>
                  <Text style={{ color: colors.textSub, fontSize: FONT.xs }}>{h.shares} سهم</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* ── Watchlist ── */}
          {!isPrivateBlocked && !!profile.watchlist?.length && (
            <View style={{
              marginHorizontal: SPACE.lg, marginBottom: SPACE.sm,
              backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
              borderRadius: RADIUS.xl, padding: SPACE.lg,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACE.md }}>
                <Eye size={14} color="#3b82f6" />
                <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>قائمة المتابعة</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
                {profile.watchlist.map((w) => (
                  <Pressable
                    key={w.ticker}
                    onPress={() => router.push(`/stocks/${w.ticker}` as never)}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? BRAND + '25' : BRAND + '15',
                      borderRadius: RADIUS.lg,
                      paddingHorizontal: SPACE.md, paddingVertical: 6,
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                    })}
                  >
                    {w.targetDir === 'UP'
                      ? <TrendingUp size={11} color={BRAND} />
                      : w.targetDir === 'DOWN'
                      ? <TrendingDown size={11} color={BRAND} />
                      : null}
                    <Text style={{ color: BRAND, fontSize: FONT.xs, fontWeight: WEIGHT.bold }}>{w.ticker}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Empty state when public but no data */}
          {!isPrivateBlocked && !profile.predictionStats && !profile.portfolio?.length && !profile.watchlist?.length && (
            <View style={{
              marginHorizontal: SPACE.lg, backgroundColor: colors.card,
              borderColor: colors.border, borderWidth: 1, borderRadius: RADIUS.xl,
              padding: SPACE.xl, alignItems: 'center', gap: SPACE.sm,
            }}>
              <Text style={{ color: colors.textMuted, fontSize: FONT.sm }}>
                لا يوجد محتوى عام لهذا المستخدم بعد
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}
