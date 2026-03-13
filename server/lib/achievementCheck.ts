/**
 * فحص الإنجازات وإضافة الجديدة إلى unseenAchievements
 */
import { prisma } from './prisma.ts';
import { UserRepository } from '../repositories/user.repository.ts';
import { ACHIEVEMENT_DEFS } from './achievements.ts';
import { createNotification } from './createNotification.ts';

export type AchievementContext = {
  now: Date;
  user: {
    createdAt: Date;
    fullName: string | null;
    phone: string | null;
    username: string | null;
    onboardingCompleted: boolean;
    loginStreak: number;
    totalReferrals: number;
    plan: string | null;
    planExpiresAt: Date | null;
  } | null;
  firstAnalysis: { createdAt: Date } | null;
  analysesCount: number;
  watchlistCount: number;
  firstWatchlist: { createdAt: Date } | null;
  portfolioCount: number;
  firstPortfolio: { createdAt: Date } | null;
  goalsCount: number;
  firstGoal: { createdAt: Date } | null;
  achievedGoalsCount: number;
  completedReferrals: number;
  distinctTickersCount: number;
  profileComplete: boolean;
  accountAgeDays: number;
};

export async function getAchievementContext(userId: string): Promise<AchievementContext> {
  const now = new Date();
  const [
    user,
    firstAnalysis,
    analysesCount,
    watchlistCount,
    firstWatchlist,
    portfolioCount,
    firstPortfolio,
    goalsCount,
    firstGoal,
    achievedGoalsCount,
    completedReferrals,
    distinctTickersResult,
  ] = await Promise.all([
    UserRepository.findUnique({
      where: { id: userId },
      select: {
        createdAt: true,
        fullName: true,
        phone: true,
        username: true,
        onboardingCompleted: true,
        loginStreak: true,
        totalReferrals: true,
        plan: true,
        planExpiresAt: true,
      },
    }),
    prisma.analysis.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    prisma.analysis.count({ where: { userId } }),
    prisma.watchlist.count({ where: { userId } }),
    prisma.watchlist.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    prisma.portfolio.count({ where: { userId } }),
    prisma.portfolio.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    prisma.goal.count({ where: { userId } }),
    prisma.goal.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    prisma.goal.count({ where: { userId, achievedAt: { not: null } } }),
    prisma.referral.count({ where: { referrerId: userId, isActive: true } }),
    prisma.analysis.groupBy({ by: ['ticker'], where: { userId } }),
  ]);

  const accountAgeDays = user ? Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const distinctTickersCount = distinctTickersResult?.length ?? 0;
  const profileComplete = Boolean(
    user?.fullName?.trim() && user?.phone?.trim() && user?.username?.trim() && goalsCount >= 1 && watchlistCount >= 1
  );

  return {
    now,
    user,
    firstAnalysis,
    analysesCount,
    watchlistCount,
    firstWatchlist,
    portfolioCount,
    firstPortfolio,
    goalsCount,
    firstGoal,
    achievedGoalsCount,
    completedReferrals,
    distinctTickersCount,
    profileComplete,
    accountAgeDays,
  };
}

type Level = 'beginner' | 'growth' | 'pro' | 'legend';

function buildOne(
  ctx: AchievementContext,
  def: (typeof ACHIEVEMENT_DEFS)[0]
): { completed: boolean } {
  const { user, firstAnalysis, analysesCount, watchlistCount, firstWatchlist, portfolioCount, firstPortfolio, goalsCount, firstGoal, achievedGoalsCount, completedReferrals, distinctTickersCount, profileComplete, accountAgeDays } = ctx;
  let completed = false;

  switch (def.id) {
    case 'first-step':
      completed = Boolean(user);
      break;
    case 'know-yourself':
      completed = user?.onboardingCompleted ?? false;
      break;
    case 'profile-complete':
      completed = profileComplete;
      break;
    case 'first-look':
      completed = analysesCount >= 1;
      break;
    case 'watcher':
      completed = watchlistCount >= 1;
      break;
    case 'investor':
      completed = portfolioCount >= 1;
      break;
    case 'dreamer':
      completed = goalsCount >= 1;
      break;
    case 'first-referrer':
      completed = completedReferrals >= 1;
      break;
    case 'subscriber':
      completed = user?.plan === 'pro' || user?.plan === 'yearly' || false;
      break;
    case 'week-with-us':
      completed = (user?.loginStreak ?? 0) >= 7;
      break;
    case 'active-analyst':
      completed = analysesCount >= 10;
      break;
    case 'wealth-builder':
      completed = portfolioCount >= 5;
      break;
    case 'long-list':
      completed = watchlistCount >= 10;
      break;
    case 'planner':
      completed = goalsCount >= 3;
      break;
    case 'loyal':
      completed = (user?.loginStreak ?? 0) >= 30 || accountAgeDays >= 30;
      break;
    case 'network':
      completed = completedReferrals >= 5;
      break;
    case 'diversified':
      completed = portfolioCount >= 3;
      break;
    case 'decision-maker':
      completed = analysesCount >= 25;
      break;
    case 'first-goal-achieved':
      completed = achievedGoalsCount >= 1;
      break;
    case 'devoted':
      completed = accountAgeDays >= 90;
      break;
    case 'expert-analyst':
      completed = analysesCount >= 50;
      break;
    case 'diverse-portfolio':
      completed = portfolioCount >= 5;
      break;
    case 'strategist':
      completed = achievedGoalsCount >= 5;
      break;
    case 'egx-ambassador':
      completed = completedReferrals >= 20;
      break;
    case 'big-portfolio':
      completed = portfolioCount >= 15;
      break;
    case 'patient':
      completed = accountAgeDays >= 180;
      break;
    case 'daily-follower':
      completed = (user?.loginStreak ?? 0) >= 100 || accountAgeDays >= 100;
      break;
    case 'researcher':
      completed = distinctTickersCount >= 10;
      break;
    case 'annual-subscriber':
      completed = user?.plan === 'yearly';
      break;
    case 'leader':
      completed = (user?.loginStreak ?? 0) >= 60;
      break;
    case 'legend-analyst':
      completed = analysesCount >= 100;
      break;
    case 'kings-portfolio':
      completed = portfolioCount >= 25;
      break;
    case 'full-year':
      completed = accountAgeDays >= 365;
      break;
    case 'mega-referrer':
      completed = completedReferrals >= 50;
      break;
    case 'referral-legend':
      completed = completedReferrals >= 100;
      break;
    case 'community-leader':
      completed = (user?.totalReferrals ?? 0) >= 500;
      break;
    case 'the-1000':
      completed = (user?.totalReferrals ?? 0) >= 1000;
      break;
    case 'overachiever':
      completed = analysesCount >= 200;
      break;
    case 'sector-expert':
      completed = distinctTickersCount >= 10;
      break;
    case 'legend':
      // يُحدد بعد عد الباقي
      break;
    default:
      break;
  }

  return { completed };
}

/** يرجع قائمة ids للإنجازات المُكتملة (بما فيها legend لو 39 غيرها مكتملين) */
export async function getCompletedAchievementIds(userId: string): Promise<string[]> {
  const ctx = await getAchievementContext(userId);
  const results = ACHIEVEMENT_DEFS.map((def) => ({ id: def.id, ...buildOne(ctx, def) }));
  const othersCompleted = results.filter((r) => r.id !== 'legend' && r.completed).length;
  const legend = results.find((r) => r.id === 'legend');
  if (legend) {
    legend.completed = othersCompleted >= 39;
  }
  return results.filter((r) => r.completed).map((r) => r.id);
}

/** يضيف فقط الإنجازات اللي اكتملت في هذه العملية (بعد العملية مش كانت مكتملة قبلها) */
export async function addNewlyUnlockedAchievements(
  userId: string,
  completedIdsBeforeAction?: string[]
): Promise<string[]> {
  const completedIdsAfter = await getCompletedAchievementIds(userId);
  const newlyCompleted = completedIdsBeforeAction
    ? completedIdsAfter.filter((id) => !completedIdsBeforeAction.includes(id))
    : completedIdsAfter;

  const user = await UserRepository.findUnique({
    where: { id: userId },
    select: { unseenAchievements: true },
  });
  if (!user) return [];
  const unseen = user.unseenAchievements ?? [];
  const toAdd = newlyCompleted.filter((id) => !unseen.includes(id));
  if (toAdd.length === 0) return [];
  const newUnseen = [...unseen, ...toAdd];
  await UserRepository.update({
    where: { id: userId },
    data: { unseenAchievements: newUnseen },
  });
  for (const id of toAdd) {
    const def = ACHIEVEMENT_DEFS.find((d) => d.id === id);
    const title = def ? `حققت إنجاز "${def.title}"` : 'إنجاز جديد';
    const body = def?.shortDescription ?? 'تهانينا!';
    await createNotification(userId, 'achievement', title, body);
  }
  return toAdd;
}
