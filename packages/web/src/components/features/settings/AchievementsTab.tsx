import React, { memo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Trophy,
  CheckCircle2,
  Lock,
  X,
  ChevronRight,
  Sprout,
  TrendingUp,
  Award,
  Crown,
} from 'lucide-react';
import api from '../../../lib/api';
import { Button } from '../../ui/Button';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACHIEVEMENTS DATA — 4 LEVELS (backendId maps to API /user/achievements)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface AchievementDef {
  id: string;
  backendId: string; // id in backend API response
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  howToAr: string;
  howToEn: string;
  navigateTo: string | null;
}

interface LevelDef {
  level: number;
  titleAr: string;
  titleEn: string;
  color: string;
  bg: string;
  icon: string;
  achievements: AchievementDef[];
}

const ACHIEVEMENT_LEVELS: LevelDef[] = [
  {
    level: 1,
    titleAr: 'المبتدئ',
    titleEn: 'Beginner',
    color: 'var(--success)',
    bg: 'var(--success-bg)',
    icon: 'Sprout',
    achievements: [
      { id: 'first_login', backendId: 'first-step', titleAr: 'الخطوة الأولى', titleEn: 'First Step', descAr: 'أول خطواتك في عالم الاستثمار', descEn: 'Your first step into investing', howToAr: 'سجّل دخولك للمرة الأولى', howToEn: 'Log in for the first time', navigateTo: null },
      { id: 'complete_profile', backendId: 'profile-complete', titleAr: 'الملف المكتمل', titleEn: 'Complete Profile', descAr: 'أكمل بياناتك وابدأ رحلتك', descEn: 'Complete your profile data', howToAr: 'اذهب لحسابي وأكمل بياناتك', howToEn: 'Go to profile and complete your info', navigateTo: '/profile' },
      { id: 'investment_personality', backendId: 'know-yourself', titleAr: 'اعرف نفسك', titleEn: 'Know Yourself', descAr: 'حدّد شخصيتك الاستثمارية', descEn: 'Define your investment personality', howToAr: 'أكمل الـ Onboarding Wizard', howToEn: 'Complete the Onboarding Wizard', navigateTo: '/dashboard' },
      { id: 'first_watchlist', backendId: 'watcher', titleAr: 'المراقب', titleEn: 'The Watcher', descAr: 'أضف أول سهم لقائمة المراقبة', descEn: 'Add your first stock to watchlist', howToAr: 'افتح أي سهم واضغط على النجمة', howToEn: 'Open any stock and click the star', navigateTo: '/stocks' },
    ],
  },
  {
    level: 2,
    titleAr: 'المستثمر',
    titleEn: 'Investor',
    color: 'var(--brand)',
    bg: 'var(--brand-subtle)',
    icon: 'TrendingUp',
    achievements: [
      { id: 'first_ai_analysis', backendId: 'first-look', titleAr: 'أول نظرة', titleEn: 'First Glance', descAr: 'حلّل أول سهم بالذكاء الاصطناعي', descEn: 'Analyze your first stock with AI', howToAr: 'افتح أي سهم واضغط "تحليل ذكي"', howToEn: 'Open any stock and press "AI Analysis"', navigateTo: '/stocks' },
      { id: 'first_portfolio', backendId: 'investor', titleAr: 'المحفظة الأولى', titleEn: 'First Portfolio', descAr: 'أضف أول سهم لمحفظتك', descEn: 'Add your first stock to portfolio', howToAr: 'اذهب لمحفظتي وأضف سهمك الأول', howToEn: 'Go to portfolio and add your first stock', navigateTo: '/portfolio' },
      { id: 'first_goal', backendId: 'dreamer', titleAr: 'صاحب الهدف', titleEn: 'Goal Setter', descAr: 'حدد أول هدف مالي لك', descEn: 'Set your first financial goal', howToAr: 'اذهب لأهدافي وأنشئ هدفاً جديداً', howToEn: 'Go to goals and create a new goal', navigateTo: '/goals' },
      { id: 'use_calculator', backendId: 'first-look', titleAr: 'الحاسب الذكي', titleEn: 'Smart Calculator', descAr: 'استخدم الحاسبة الاستثمارية', descEn: 'Use the investment calculator', howToAr: 'افتح الحاسبة وجرّب حساباً', howToEn: 'Open the calculator and try a calculation', navigateTo: '/calculator' },
    ],
  },
  {
    level: 3,
    titleAr: 'المحترف',
    titleEn: 'Professional',
    color: 'var(--warning)',
    bg: 'var(--warning-bg)',
    icon: 'Award',
    achievements: [
      { id: 'watchlist_5', backendId: 'long-list', titleAr: 'قائمة المراقبة', titleEn: 'Watchlist Master', descAr: 'تابع 5 أسهم في قائمة المراقبة', descEn: 'Follow 5 stocks in your watchlist', howToAr: 'أضف 5 أسهم مختلفة لقائمة المراقبة', howToEn: 'Add 5 different stocks to watchlist', navigateTo: '/stocks' },
      { id: 'portfolio_diverse', backendId: 'diversified', titleAr: 'التنويع الذكي', titleEn: 'Smart Diversification', descAr: 'امتلك 3 أسهم من قطاعات مختلفة', descEn: 'Own 3 stocks from different sectors', howToAr: 'أضف أسهم من قطاعات مختلفة لمحفظتك', howToEn: 'Add stocks from different sectors', navigateTo: '/portfolio' },
      { id: 'ai_analysis_5', backendId: 'active-analyst', titleAr: 'المحلل المتمرس', titleEn: 'Seasoned Analyst', descAr: 'حلّل 5 أسهم بالذكاء الاصطناعي', descEn: 'Analyze 5 stocks with AI', howToAr: 'استخدم التحليل الذكي على 5 أسهم مختلفة', howToEn: 'Use AI analysis on 5 different stocks', navigateTo: '/stocks' },
      { id: 'goal_progress_50', backendId: 'first-goal-achieved', titleAr: 'في المنتصف', titleEn: 'Halfway There', descAr: 'وصل هدف مالي لـ 50% من المستهدف', descEn: 'Reach 50% of a financial goal', howToAr: 'أضف مبالغ لهدفك المالي حتى تصل 50%', howToEn: 'Add amounts to your goal until you reach 50%', navigateTo: '/goals' },
    ],
  },
  {
    level: 4,
    titleAr: 'الخبير',
    titleEn: 'Expert',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    icon: 'Crown',
    achievements: [
      { id: 'referral_15', backendId: 'network', titleAr: 'السفير', titleEn: 'Ambassador', descAr: 'ادعُ 15 صديقاً وانضموا للمنصة واحصل على شهر Pro مجاناً', descEn: 'Invite 15 friends who join the platform and get 1 free Pro month', howToAr: 'شارك كود دعوتك مع أصدقائك', howToEn: 'Share your referral code with friends', navigateTo: '/profile?tab=referral' },
      { id: 'goal_complete', backendId: 'strategist', titleAr: 'المنجز', titleEn: 'Achiever', descAr: 'أكمل هدفاً مالياً بالكامل', descEn: 'Complete a financial goal 100%', howToAr: 'حقق هدفاً مالياً حتى 100%', howToEn: 'Reach 100% of a financial goal', navigateTo: '/goals' },
      { id: 'pro_subscriber', backendId: 'subscriber', titleAr: 'المستثمر الحقيقي', titleEn: 'True Investor', descAr: 'اشترك في الخطة الاحترافية', descEn: 'Subscribe to the Pro plan', howToAr: 'اشترك في خطة Pro أو السنوية', howToEn: 'Subscribe to Pro or Yearly plan', navigateTo: '/settings/subscription' },
      { id: 'portfolio_profit', backendId: 'wealth-builder', titleAr: 'الربح الأول', titleEn: 'First Profit', descAr: 'حقق ربحاً في محفظتك الاستثمارية', descEn: 'Achieve a profit in your portfolio', howToAr: 'تابع أسهمك حتى تصعد قيمتها', howToEn: 'Track your stocks until they rise in value', navigateTo: '/portfolio' },
    ],
  },
];

const ALL_ACHIEVEMENTS = ACHIEVEMENT_LEVELS.flatMap((l) => l.achievements);
const TOTAL_COUNT = ALL_ACHIEVEMENTS.length;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Hook: fetch backend and map to our frontend ids
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface BackendAchievement {
  id: string;
  completed?: boolean;
  date?: string | null;
}

function useAchievements() {
  const [data, setData] = useState<{ unlockedIds: string[]; unlockedAt: Record<string, string> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAchievements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<BackendAchievement[] | { data?: BackendAchievement[] }>('/user/achievements');
      const raw = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
      const completedSet = new Set(raw.filter((a) => a.completed).map((a) => a.id));
      const completedDates: Record<string, string> = {};
      raw.filter((a) => a.completed && a.date).forEach((a) => { completedDates[a.id] = String(a.date); });
      const unlockedIds: string[] = [];
      const unlockedAt: Record<string, string> = {};
      ALL_ACHIEVEMENTS.forEach((ach) => {
        if (completedSet.has(ach.backendId)) {
          unlockedIds.push(ach.id);
          if (completedDates[ach.backendId]) unlockedAt[ach.id] = completedDates[ach.backendId];
        }
      });
      setData({ unlockedIds, unlockedAt });
    } catch {
      setError('error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  return { data, loading, error, refetch: fetchAchievements };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LevelIcon
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function LevelIcon({ name, color }: { name: string; color: string }) {
  const icons: Record<string, React.ElementType> = {
    Sprout,
    TrendingUp,
    Award,
    Crown,
  };
  const Icon = icons[name] ?? Trophy;
  return <Icon className="w-5 h-5" style={{ color }} />;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AchievementCard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface AchievementCardProps {
  achievement: AchievementDef;
  isUnlocked: boolean;
  unlockedAt?: string | null;
  levelColor: string;
  levelBg: string;
  animationDelay: number;
}

const AchievementCard = memo(function AchievementCard({
  achievement,
  isUnlocked,
  unlockedAt,
  levelColor,
  levelBg,
  animationDelay,
}: AchievementCardProps) {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const isAr = i18n.language.startsWith('ar');
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: animationDelay }}
      className={`
        relative rounded-2xl p-4 border transition-all
        ${isUnlocked ? 'border-[var(--success)] bg-[var(--success-bg)]' : 'border-[var(--border)] bg-[var(--bg-card)]'}
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: isUnlocked ? 'var(--success-bg)' : levelBg }}
          >
            {isUnlocked ? (
              <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
            ) : (
              <Lock className="w-4 h-4" style={{ color: levelColor }} />
            )}
          </div>
          <h4
            className={`font-bold text-sm truncate ${isUnlocked ? 'text-[var(--success)]' : 'text-[var(--text-primary)]'}`}
          >
            {isAr ? achievement.titleAr : achievement.titleEn}
          </h4>
        </div>
        {isUnlocked && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            aria-label={t('achievements.dismiss')}
            className="w-6 h-6 min-w-0 p-0 rounded-full flex items-center justify-center flex-shrink-0"
          >
            <X className="w-3 h-3 text-[var(--text-muted)]" />
          </Button>
        )}
      </div>
      <p className="text-xs text-[var(--text-secondary)] mb-3 leading-relaxed">
        {isAr ? achievement.descAr : achievement.descEn}
      </p>
      {!isUnlocked && achievement.navigateTo && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-[var(--text-muted)] flex-1 me-2 min-w-0">
            💡 {isAr ? achievement.howToAr : achievement.howToEn}
          </p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => navigate(achievement.navigateTo!)}
            className="flex items-center gap-1 flex-shrink-0"
          >
            {t('achievements.goNow')}
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      )}
      {isUnlocked && unlockedAt && (
        <p className="text-xs text-[var(--success)] opacity-70">
          ✓ {new Date(unlockedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
        </p>
      )}
      {isUnlocked && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ boxShadow: '0 0 20px rgba(34,197,94,0.08)' }}
        />
      )}
    </motion.div>
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LevelSection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface LevelSectionProps {
  level: LevelDef;
  unlockedIds: string[];
  unlockedAt: Record<string, string>;
  animationDelay: number;
}

const LevelSection = memo(function LevelSection({
  level,
  unlockedIds,
  unlockedAt,
  animationDelay,
}: LevelSectionProps) {
  const { t, i18n } = useTranslation('common');
  const isAr = i18n.language.startsWith('ar');
  const unlockedInLevel = level.achievements.filter((a) => unlockedIds.includes(a.id)).length;
  const allUnlocked = unlockedInLevel === level.achievements.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: level.bg }}
        >
          <LevelIcon name={level.icon} color={level.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-[var(--text-primary)] text-base">
              {t('achievements.level')} {level.level} — {isAr ? level.titleAr : level.titleEn}
            </h3>
            {allUnlocked && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: level.bg, color: level.color }}
              >
                ✓ {t('achievements.completed')}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {unlockedInLevel} / {level.achievements.length} {t('achievements.unlocked')}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {level.achievements.map((achievement, i) => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            isUnlocked={unlockedIds.includes(achievement.id)}
            unlockedAt={unlockedAt[achievement.id] ?? null}
            levelColor={level.color}
            levelBg={level.bg}
            animationDelay={animationDelay + i * 0.05}
          />
        ))}
      </div>
    </motion.div>
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AchievementsTab
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AchievementsTabInner() {
  const { t } = useTranslation('common');
  const { data, loading, error, refetch } = useAchievements();
  const unlockedIds = data?.unlockedIds ?? [];
  const unlockedAt = data?.unlockedAt ?? {};
  const totalUnlocked = unlockedIds.length;

  if (loading) {
    return (
      <div className="space-y-8 p-6">
        <div className="h-24 rounded-2xl bg-[var(--bg-secondary)] animate-pulse" />
        <div className="h-48 rounded-2xl bg-[var(--bg-secondary)] animate-pulse" />
        <div className="h-48 rounded-2xl bg-[var(--bg-secondary)] animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-[var(--danger)] text-sm mb-4">{t('error.loadFailed')}</p>
        <Button variant="secondary" onClick={refetch}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[var(--warning)]" />
            <span className="font-semibold text-[var(--text-primary)] text-sm">
              {t('achievements.progress')}
            </span>
          </div>
          <span className="text-sm font-black tabular-nums text-[var(--brand)]">
            {totalUnlocked} / {TOTAL_COUNT}
          </span>
        </div>
        <div className="w-full h-2.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(totalUnlocked / TOTAL_COUNT) * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
            className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--brand-hover)]"
          />
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1.5">
          {t('achievements.summaryNote', { unlocked: totalUnlocked, total: TOTAL_COUNT })}
        </p>
      </motion.div>

      {ACHIEVEMENT_LEVELS.map((level, index) => (
        <LevelSection
          key={level.level}
          level={level}
          unlockedIds={unlockedIds}
          unlockedAt={unlockedAt}
          animationDelay={index * 0.1}
        />
      ))}
    </div>
  );
}

export const AchievementsTab = memo(AchievementsTabInner);
