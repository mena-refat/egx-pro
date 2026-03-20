import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, ArrowRight, Trophy, Lock, CheckCircle,
  TrendingUp, Award, Crown, Sprout,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import apiClient from '../../lib/api/client';

/* ─── Achievement definitions (mirrors website) ─── */

interface AchievementDef { id: string; backendId: string; titleAr: string; descAr: string }
interface LevelDef { level: number; titleAr: string; color: string; bg: string; iconName: string; achievements: AchievementDef[] }

const LEVELS: LevelDef[] = [
  {
    level: 1, titleAr: 'المبتدئ', color: '#4ade80', bg: '#4ade8015', iconName: 'Sprout',
    achievements: [
      { id: 'first_login',           backendId: 'first-step',       titleAr: 'الخطوة الأولى',   descAr: 'سجّل دخولك للمرة الأولى' },
      { id: 'complete_profile',      backendId: 'profile-complete', titleAr: 'الملف المكتمل',   descAr: 'أكمل بياناتك الشخصية' },
      { id: 'investment_personality',backendId: 'know-yourself',    titleAr: 'اعرف نفسك',       descAr: 'حدّد شخصيتك الاستثمارية' },
      { id: 'first_watchlist',       backendId: 'watcher',          titleAr: 'المراقب',          descAr: 'أضف أول سهم لقائمة المراقبة' },
    ],
  },
  {
    level: 2, titleAr: 'المستثمر', color: '#8b5cf6', bg: '#8b5cf615', iconName: 'TrendingUp',
    achievements: [
      { id: 'first_ai_analysis', backendId: 'first-look', titleAr: 'أول نظرة',        descAr: 'حلّل أول سهم بالذكاء الاصطناعي' },
      { id: 'first_portfolio',   backendId: 'investor',   titleAr: 'المحفظة الأولى',  descAr: 'أضف أول سهم لمحفظتك' },
      { id: 'first_goal',        backendId: 'dreamer',    titleAr: 'صاحب الهدف',      descAr: 'حدد أول هدف مالي لك' },
      { id: 'use_calculator',    backendId: 'first-look', titleAr: 'الحاسب الذكي',    descAr: 'استخدم الحاسبة الاستثمارية' },
    ],
  },
  {
    level: 3, titleAr: 'المحترف', color: '#f59e0b', bg: '#f59e0b15', iconName: 'Award',
    achievements: [
      { id: 'watchlist_5',       backendId: 'long-list',         titleAr: 'قائمة المراقبة',  descAr: 'تابع 5 أسهم في قائمة المراقبة' },
      { id: 'portfolio_diverse', backendId: 'diversified',       titleAr: 'التنويع الذكي',   descAr: 'امتلك 3 أسهم من قطاعات مختلفة' },
      { id: 'ai_analysis_5',    backendId: 'active-analyst',    titleAr: 'المحلل المتمرس',  descAr: 'حلّل 5 أسهم بالذكاء الاصطناعي' },
      { id: 'goal_progress_50', backendId: 'first-goal-achieved',titleAr: 'في المنتصف',     descAr: 'وصّل هدفاً لـ 50% من المستهدف' },
    ],
  },
  {
    level: 4, titleAr: 'الخبير', color: '#f87171', bg: '#f8717115', iconName: 'Crown',
    achievements: [
      { id: 'referral_15',     backendId: 'network',       titleAr: 'السفير',              descAr: 'ادعُ 15 صديقاً للمنصة' },
      { id: 'goal_complete',   backendId: 'strategist',    titleAr: 'المنجز',              descAr: 'أكمل هدفاً مالياً بالكامل' },
      { id: 'pro_subscriber',  backendId: 'subscriber',    titleAr: 'المستثمر الحقيقي',   descAr: 'اشترك في الخطة الاحترافية' },
      { id: 'portfolio_profit',backendId: 'wealth-builder',titleAr: 'الربح الأول',         descAr: 'حقق ربحاً في محفظتك' },
    ],
  },
];

const ALL: AchievementDef[] = LEVELS.flatMap((l) => l.achievements);
const TOTAL = ALL.length;

interface BackendAchievement { id: string; completed?: boolean; date?: string | null }

function LevelIconComp({ name, color }: { name: string; color: string }) {
  const props = { size: 18, color };
  if (name === 'Sprout')    return <Sprout {...props} />;
  if (name === 'TrendingUp') return <TrendingUp {...props} />;
  if (name === 'Award')     return <Award {...props} />;
  return <Crown {...props} />;
}

export default function AchievementsPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [unlockedAt, setUnlockedAt] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const ArrowIcon = I18nManager.isRTL ? ArrowRight : ArrowLeft;

  useEffect(() => () => { mountedRef.current = false; }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(null);
      const res = await apiClient.get('/api/user/achievements', { signal });
      const raw: BackendAchievement[] = Array.isArray(res.data)
        ? res.data
        : Array.isArray((res.data as { data?: BackendAchievement[] }).data)
        ? (res.data as { data: BackendAchievement[] }).data
        : [];
      const completedSet = new Set(raw.filter((a) => a.completed).map((a) => a.id));
      const dates: Record<string, string> = {};
      raw.filter((a) => a.completed && a.date).forEach((a) => { dates[a.id] = String(a.date); });
      const ids = new Set<string>();
      const ats: Record<string, string> = {};
      ALL.forEach((ach) => {
        if (completedSet.has(ach.backendId)) {
          ids.add(ach.id);
          if (dates[ach.backendId]) ats[ach.id] = dates[ach.backendId];
        }
      });
      if (!signal?.aborted && mountedRef.current) {
        setUnlocked(ids);
        setUnlockedAt(ats);
      }
    } catch {
      if (!signal?.aborted && mountedRef.current) setError('فشل تحميل الإنجازات. حاول مرة أخرى.');
    } finally {
      if (!signal?.aborted && mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const unlockedCount = unlocked.size;
  const percent = TOTAL > 0 ? Math.round((unlockedCount / TOTAL) * 100) : 0;

  return (
    <ScreenWrapper padded={false}>
      {/* Header */}
      <View
        style={{ borderBottomColor: colors.border, borderBottomWidth: 1 }}
        className="flex-row items-center gap-3 px-4 pt-5 pb-4"
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ backgroundColor: colors.hover, borderColor: colors.border }}
          className="w-9 h-9 rounded-xl border items-center justify-center"
        >
          <ArrowIcon size={16} color={colors.textSub} />
        </Pressable>
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-xl items-center justify-center" style={{ backgroundColor: '#f59e0b18' }}>
            <Trophy size={15} color="#f59e0b" />
          </View>
          <Text style={{ color: colors.text }} className="text-base font-bold">الإنجازات</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 36 }}>
        {error ? (
          <View style={{ gap: 12, paddingTop: 8 }}>
            <View
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 14,
                gap: 10,
              }}
            >
              <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>{error}</Text>
              <Pressable
                onPress={() => {
                  setLoading(true);
                  const ctrl = new AbortController();
                  void load(ctrl.signal);
                }}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? colors.hover : colors.inputBg,
                  borderRadius: 12,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.border,
                })}
              >
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>إعادة المحاولة</Text>
              </Pressable>
            </View>
          </View>
        ) : loading ? (
          <View style={{ gap: 16 }}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={{ gap: 8 }}>
                <Skeleton.Line height={16} width="33%" />
                <View style={{ gap: 8 }}>
                  {[1, 2, 3, 4].map((j) => <Skeleton.Box key={j} height={64} radius={12} />)}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <>
            {/* Overall progress */}
            <View className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 gap-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Trophy size={16} color="#f59e0b" />
                  <Text style={{ color: colors.text }} className="text-sm font-bold">إجمالي الإنجازات</Text>
                </View>
                <Text
                  className="text-sm font-bold text-amber-400"
                  style={{ fontVariant: ['tabular-nums'] }}
                  numberOfLines={1}
                >
                  {unlockedCount}/{TOTAL} ({percent}%)
                </Text>
              </View>
              <View style={{ backgroundColor: colors.hover }} className="h-2 rounded-full overflow-hidden">
                <View
                  className="h-full rounded-full"
                  style={{ width: `${(unlockedCount / TOTAL) * 100}%`, backgroundColor: '#f59e0b' }}
                />
              </View>
              <Text style={{ color: colors.textMuted }} className="text-xs">
                {unlockedCount === TOTAL
                  ? 'أكملت جميع الإنجازات!'
                  : `متبقى ${TOTAL - unlockedCount} إنجازات لتكمل المجموعة`}
              </Text>
            </View>

            {/* Levels */}
            {LEVELS.map((level) => {
              const levelUnlocked = level.achievements.filter((a) => unlocked.has(a.id)).length;
              const levelTotal = level.achievements.length;
              const levelComplete = levelUnlocked === levelTotal;

              return (
                <View key={level.level} className="gap-2">
                  {/* Level header */}
                  <View className="flex-row items-center justify-between px-1">
                    <View className="flex-row items-center gap-2">
                      <View className="w-7 h-7 rounded-lg items-center justify-center" style={{ backgroundColor: level.bg }}>
                        <LevelIconComp name={level.iconName} color={level.color} />
                      </View>
                      <Text style={{ color: colors.text }} className="text-sm font-bold">
                        المستوى {level.level} — {level.titleAr}
                      </Text>
                    </View>
                    <Text className="text-xs font-semibold" style={{ color: level.color }}>
                      {levelUnlocked}/{levelTotal}
                    </Text>
                  </View>

                  {/* Achievement cards */}
                  <View
                    style={{ backgroundColor: colors.card, borderColor: levelComplete ? `${level.color}40` : colors.border }}
                    className="border rounded-2xl overflow-hidden"
                  >
                    {level.achievements.map((ach, i) => {
                      const isUnlocked = unlocked.has(ach.id);
                      const unlockedDate = unlockedAt[ach.id];
                      return (
                        <View
                          key={ach.id}
                          style={[
                            { borderBottomColor: colors.border2 },
                            i < level.achievements.length - 1 && { borderBottomWidth: 1 },
                          ]}
                          className="flex-row items-center gap-3 px-4 py-3.5"
                        >
                          {/* Icon */}
                          <View
                            className="w-10 h-10 rounded-xl items-center justify-center shrink-0"
                            style={{ backgroundColor: isUnlocked ? level.bg : colors.hover }}
                          >
                            {isUnlocked
                              ? <CheckCircle size={18} color={level.color} />
                              : <Lock size={16} color={colors.textMuted} />}
                          </View>

                          {/* Text */}
                          <View className="flex-1">
                            <Text
                              style={{ color: isUnlocked ? colors.text : colors.textSub }}
                              className="text-sm font-semibold"
                              numberOfLines={1}
                            >
                              {ach.titleAr}
                            </Text>
                            <Text
                              style={{ color: colors.textMuted }}
                              className="text-xs mt-0.5 leading-4"
                              numberOfLines={2}
                              ellipsizeMode="tail"
                            >
                              {ach.descAr}
                            </Text>
                            {isUnlocked && unlockedDate && (
                              <Text
                                style={{ color: level.color }}
                                className="text-[10px] mt-1 font-medium"
                                numberOfLines={1}
                              >
                                ✓ {new Date(unlockedDate).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </Text>
                            )}
                          </View>

                          {/* Status */}
                          {isUnlocked ? (
                            <View style={{ backgroundColor: level.bg }} className="px-2 py-0.5 rounded-lg">
                              <Text className="text-[10px] font-bold" style={{ color: level.color }}>مكتمل</Text>
                            </View>
                          ) : (
                            <View style={{ backgroundColor: colors.hover }} className="px-2 py-0.5 rounded-lg">
                              <Text style={{ color: colors.textMuted }} className="text-[10px]">مقفل</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
