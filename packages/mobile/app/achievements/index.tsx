import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, ArrowRight, Trophy, Lock, CheckCircle,
  TrendingUp, Award, Crown, Sprout, ChevronLeft, ChevronRight,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import apiClient from '../../lib/api/client';
import { markAchievementsSeen, getUnseenIds } from '../../hooks/useNewAchievementsCount';
import { AchievementCongratsCard } from '../../components/features/achievements/AchievementCongratsCard';

/* ─── Achievement definitions (mirrors website) ─── */

interface AchievementDef { id: string; backendId: string; titleAr: string; descAr: string; titleEn: string; descEn: string }
interface LevelDef { level: number; titleAr: string; titleEn: string; color: string; bg: string; iconName: string; achievements: AchievementDef[] }

const LEVELS: LevelDef[] = [
  {
    level: 1, titleAr: 'المبتدئ', titleEn: 'Beginner', color: '#4ade80', bg: '#4ade8015', iconName: 'Sprout',
    achievements: [
      { id: 'first_login',           backendId: 'first-step',       titleAr: 'الخطوة الأولى',   descAr: 'سجّل دخولك للمرة الأولى',       titleEn: 'First Step',       descEn: 'Log in for the first time' },
      { id: 'complete_profile',      backendId: 'profile-complete', titleAr: 'الملف المكتمل',   descAr: 'أكمل بياناتك الشخصية',           titleEn: 'Complete Profile', descEn: 'Fill in your personal info' },
      { id: 'investment_personality',backendId: 'know-yourself',    titleAr: 'اعرف نفسك',       descAr: 'حدّد شخصيتك الاستثمارية',       titleEn: 'Know Yourself',    descEn: 'Set your investment personality' },
      { id: 'first_watchlist',       backendId: 'watcher',          titleAr: 'المراقب',          descAr: 'أضف أول سهم لقائمة المراقبة',   titleEn: 'Watcher',          descEn: 'Add your first stock to watchlist' },
    ],
  },
  {
    level: 2, titleAr: 'المستثمر', titleEn: 'Investor', color: '#8b5cf6', bg: '#8b5cf615', iconName: 'TrendingUp',
    achievements: [
      { id: 'first_ai_analysis', backendId: 'first-look', titleAr: 'أول نظرة',        descAr: 'حلّل أول سهم بالذكاء الاصطناعي', titleEn: 'First Look',       descEn: 'Analyze your first stock with AI' },
      { id: 'first_portfolio',   backendId: 'investor',   titleAr: 'المحفظة الأولى',  descAr: 'أضف أول سهم لمحفظتك',            titleEn: 'First Portfolio',  descEn: 'Add your first stock to portfolio' },
      { id: 'first_goal',        backendId: 'dreamer',    titleAr: 'صاحب الهدف',      descAr: 'حدد أول هدف مالي لك',            titleEn: 'Goal Setter',      descEn: 'Set your first financial goal' },
      { id: 'use_calculator',    backendId: 'first-look', titleAr: 'الحاسب الذكي',    descAr: 'استخدم الحاسبة الاستثمارية',     titleEn: 'Smart Calculator', descEn: 'Use the investment calculator' },
    ],
  },
  {
    level: 3, titleAr: 'المحترف', titleEn: 'Professional', color: '#f59e0b', bg: '#f59e0b15', iconName: 'Award',
    achievements: [
      { id: 'watchlist_5',       backendId: 'long-list',          titleAr: 'قائمة المراقبة',  descAr: 'تابع 5 أسهم في قائمة المراقبة',      titleEn: 'Watchlist',         descEn: 'Track 5 stocks in your watchlist' },
      { id: 'portfolio_diverse', backendId: 'diversified',        titleAr: 'التنويع الذكي',   descAr: 'امتلك 3 أسهم من قطاعات مختلفة',      titleEn: 'Smart Diversifier', descEn: 'Own stocks from 3 different sectors' },
      { id: 'ai_analysis_5',    backendId: 'active-analyst',     titleAr: 'المحلل المتمرس',  descAr: 'حلّل 5 أسهم بالذكاء الاصطناعي',      titleEn: 'Seasoned Analyst',  descEn: 'Analyze 5 stocks with AI' },
      { id: 'goal_progress_50', backendId: 'first-goal-achieved', titleAr: 'في المنتصف',     descAr: 'وصّل هدفاً لـ 50% من المستهدف',      titleEn: 'Halfway There',     descEn: 'Reach 50% of a financial goal' },
    ],
  },
  {
    level: 4, titleAr: 'الخبير', titleEn: 'Expert', color: '#f87171', bg: '#f8717115', iconName: 'Crown',
    achievements: [
      { id: 'referral_15',     backendId: 'network',        titleAr: 'السفير',              descAr: 'ادعُ 15 صديقاً للمنصة',          titleEn: 'Ambassador',    descEn: 'Invite 15 friends to the platform' },
      { id: 'goal_complete',   backendId: 'strategist',     titleAr: 'المنجز',              descAr: 'أكمل هدفاً مالياً بالكامل',      titleEn: 'Achiever',      descEn: 'Complete a financial goal' },
      { id: 'pro_subscriber',  backendId: 'subscriber',     titleAr: 'المستثمر الحقيقي',   descAr: 'اشترك في الخطة الاحترافية',      titleEn: 'True Investor', descEn: 'Subscribe to the Pro plan' },
      { id: 'portfolio_profit',backendId: 'wealth-builder', titleAr: 'الربح الأول',         descAr: 'حقق ربحاً في محفظتك',            titleEn: 'First Profit',  descEn: 'Earn a profit in your portfolio' },
    ],
  },
];

const ALL: AchievementDef[] = LEVELS.flatMap((l) => l.achievements);
const TOTAL = ALL.length;

/** Where to take the user to complete each achievement (null = no action needed) */
const ACHIEVEMENT_ROUTES: Record<string, string | null> = {
  first_login:             null,
  complete_profile:        '/settings/account',
  investment_personality:  '/onboarding',
  first_watchlist:         '/(tabs)/market',
  first_ai_analysis:       '/ai/analyze',
  first_portfolio:         '/(tabs)/portfolio',
  first_goal:              '/goals',
  use_calculator:          '/calculator',
  watchlist_5:             '/(tabs)/market',
  portfolio_diverse:       '/(tabs)/portfolio',
  ai_analysis_5:           '/ai/analyze',
  goal_progress_50:        '/goals',
  referral_15:             '/referral',
  goal_complete:           '/goals',
  pro_subscriber:          '/settings/subscription',
  portfolio_profit:        '/(tabs)/portfolio',
};

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
  const { colors, isRTL } = useTheme();
  const { t } = useTranslation();
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [unlockedAt, setUnlockedAt] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const ArrowIcon = isRTL ? ArrowRight : ArrowLeft;

  // ─── Celebration state ───────────────────────────────────────────
  const [celebrationQueue, setCelebrationQueue] = useState<AchievementDef[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const completedBackendIdsRef = useRef<string[]>([]);

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

      const completedBackendIds = raw.filter((a) => a.completed).map((a) => a.id);
      const unseenBackendIds    = await getUnseenIds(completedBackendIds);
      const queue               = unseenBackendIds
        .map((bid) => ALL.find((a) => a.backendId === bid))
        .filter(Boolean) as AchievementDef[];

      if (!signal?.aborted && mountedRef.current) {
        setUnlocked(ids);
        setUnlockedAt(ats);
        completedBackendIdsRef.current = completedBackendIds;
        if (queue.length > 0) {
          // Show celebration cards first; markAchievementsSeen is called after.
          setCelebrationQueue(queue);
          setCardIndex(0);
        } else {
          void markAchievementsSeen(completedBackendIds);
        }
      }
    } catch {
      if (!signal?.aborted && mountedRef.current) setError(t('achievements.loadError'));
    } finally {
      if (!signal?.aborted && mountedRef.current) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const unlockedCount = unlocked.size;
  const percent = TOTAL > 0 ? Math.round((unlockedCount / TOTAL) * 100) : 0;

  // ─── Celebration handler ─────────────────────────────────────────
  const handleCardComplete = useCallback(() => {
    if (cardIndex < celebrationQueue.length - 1) {
      setCardIndex((i) => i + 1);
    } else {
      // All cards shown — mark as seen and clear queue
      void markAchievementsSeen(completedBackendIdsRef.current);
      setCelebrationQueue([]);
    }
  }, [cardIndex, celebrationQueue.length]);

  // ─── Render celebration card on top of everything ───────────────
  const currentCard = celebrationQueue[cardIndex];

  return (
    <ScreenWrapper padded={false}>
      {/* Header */}
      <View
        style={{ borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: isRTL ? 'row-reverse' : 'row' }}
        className="items-center gap-3 px-4 pt-5 pb-4"
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
          <Text style={{ color: colors.text }} className="text-base font-bold">{t('achievements.title')}</Text>
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
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{t('common.retry')}</Text>
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
                  <Text style={{ color: colors.text }} className="text-sm font-bold">{t('achievements.total')}</Text>
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
                  ? t('achievements.allDone')
                  : t('achievements.remaining', { count: TOTAL - unlockedCount })}
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
                        {t('achievements.levelLabel', { level: level.level, title: isRTL ? level.titleAr : level.titleEn })}
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
                      const isUnlocked  = unlocked.has(ach.id);
                      const unlockedDate = unlockedAt[ach.id];
                      const route       = ACHIEVEMENT_ROUTES[ach.id] ?? null;
                      const GoChevron   = isRTL ? ChevronLeft : ChevronRight;
                      const canNavigate = !isUnlocked && route !== null;

                      const rowStyle = [
                        { borderBottomColor: colors.border2 },
                        i < level.achievements.length - 1 && { borderBottomWidth: 1 },
                      ];

                      const inner = (
                        <>
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
                              {isRTL ? ach.titleAr : ach.titleEn}
                            </Text>
                            <Text
                              style={{ color: colors.textMuted }}
                              className="text-xs mt-0.5 leading-4"
                              numberOfLines={2}
                              ellipsizeMode="tail"
                            >
                              {isRTL ? ach.descAr : ach.descEn}
                            </Text>
                            {isUnlocked && unlockedDate && (
                              <Text
                                style={{ color: level.color }}
                                className="text-[10px] mt-1 font-medium"
                                numberOfLines={1}
                              >
                                ✓ {new Date(unlockedDate).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </Text>
                            )}
                          </View>

                          {/* Status / Action */}
                          {isUnlocked ? (
                            <View style={{ backgroundColor: level.bg }} className="px-2 py-0.5 rounded-lg">
                              <Text className="text-[10px] font-bold" style={{ color: level.color }}>{t('achievements.unlocked')}</Text>
                            </View>
                          ) : canNavigate ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#3b82f618', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                              <Text style={{ color: '#3b82f6', fontSize: 10, fontWeight: '700' }}>{t('achievements.goNow')}</Text>
                              <GoChevron size={10} color="#3b82f6" />
                            </View>
                          ) : (
                            <View style={{ backgroundColor: colors.hover }} className="px-2 py-0.5 rounded-lg">
                              <Text style={{ color: colors.textMuted }} className="text-[10px]">{t('achievements.locked')}</Text>
                            </View>
                          )}
                        </>
                      );

                      return canNavigate ? (
                        <Pressable
                          key={ach.id}
                          onPress={() => router.push(route as never)}
                          style={({ pressed }) => [
                            ...rowStyle,
                            { backgroundColor: pressed ? colors.hover : 'transparent' },
                          ]}
                          className="flex-row items-center gap-3 px-4 py-3.5"
                        >
                          {inner}
                        </Pressable>
                      ) : (
                        <View
                          key={ach.id}
                          style={rowStyle}
                          className="flex-row items-center gap-3 px-4 py-3.5"
                        >
                          {inner}
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

      {/* ── Celebration overlay ──────────────────────────────── */}
      {currentCard && (
        <AchievementCongratsCard
          key={currentCard.id}
          title={isRTL ? currentCard.titleAr : currentCard.titleEn}
          description={isRTL ? currentCard.descAr : currentCard.descEn}
          onComplete={handleCardComplete}
        />
      )}
    </ScreenWrapper>
  );
}
