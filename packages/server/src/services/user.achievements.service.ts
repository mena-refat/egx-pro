import { UserRepository } from '../repositories/user.repository.ts';
import { AnalysisRepository } from '../repositories/analysis.repository.ts';
import { PortfolioRepository } from '../repositories/portfolio.repository.ts';
import { WatchlistRepository } from '../repositories/watchlist.repository.ts';
import { GoalsRepository } from '../repositories/goals.repository.ts';
import { ReferralRepository } from '../repositories/referral.repository.ts';
import { ACHIEVEMENT_DEFS, type AchievementLevel } from '../lib/achievements.ts';

export const UserAchievementsService = {
  async getUnseenAchievements(userId: number) {
    const user = await UserRepository.findUnique({
      where: { id: userId },
      select: { unseenAchievements: true },
    });
    const ids = user?.unseenAchievements ?? [];
    return ids
      .map((id) => {
        const def = ACHIEVEMENT_DEFS.find((d) => d.id === id);
        if (!def) return null;
        return { id: def.id, title: def.title, shortDescription: def.shortDescription };
      })
      .filter(Boolean);
  },

  async markAchievementsSeen(userId: number) {
    await UserRepository.update({ where: { id: userId }, data: { unseenAchievements: [] } });
    return { success: true };
  },

  async getAchievements(userId: number) {
    const now = new Date();
    const [
      user, firstAnalysis, analysesCount, watchlistCount, firstWatchlist,
      portfolioCount, firstPortfolio, goalsCount, firstGoal,
      achievedGoalsCount, completedReferrals, distinctTickersResult,
    ] = await Promise.all([
      UserRepository.findUnique({
        where: { id: userId },
        select: {
          createdAt: true, fullName: true, phone: true, username: true,
          onboardingCompleted: true, loginStreak: true, totalReferrals: true,
          plan: true, planExpiresAt: true,
        },
      }),
      AnalysisRepository.findFirst({ userId }, { createdAt: 'asc' }),
      AnalysisRepository.countByUser(userId),
      WatchlistRepository.countByUser(userId),
      WatchlistRepository.findByUser(userId).then((list) => list[0] ?? null),
      PortfolioRepository.countByUser(userId),
      PortfolioRepository.findByUser(userId).then((res) => {
        const list = (res as readonly [Array<{ createdAt: Date }>, number])[0];
        return list?.[0] ?? null;
      }),
      GoalsRepository.countByUser(userId),
      GoalsRepository.findByUser(userId, 1, 1).then(([list]) => list[0] ?? null),
      GoalsRepository.countAchievedByUser(userId),
      ReferralRepository.countActiveByReferrer(userId),
      AnalysisRepository.groupBy({ by: ['ticker'], where: { userId } }),
    ]);
    const accountAgeDays = user ? Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const distinctTickers = distinctTickersResult?.length ?? 0;
    const profileComplete = Boolean(
      user?.fullName?.trim() && user?.phone?.trim() && user?.username?.trim() && goalsCount >= 1 && watchlistCount >= 1
    );
    const completedByLevel: Record<AchievementLevel, number> = { beginner: 0, growth: 0, pro: 0, legend: 0 };
    type AchOut = {
      id: string; level: string; title: string; shortDescription: string;
      longDescription: string; route: string | null; completed: boolean;
      date: Date | null; progress?: number; target?: number;
    };
    const build = (def: (typeof ACHIEVEMENT_DEFS)[0]): AchOut => {
      let completed = false;
      let date: Date | null = null;
      let progress: number | undefined;
      let target: number | undefined;
      switch (def.id) {
        case 'first-step':         completed = Boolean(user);                               date = user?.createdAt ?? null; break;
        case 'know-yourself':      completed = user?.onboardingCompleted ?? false;           date = user?.createdAt ?? null; break;
        case 'profile-complete':   completed = profileComplete;                              date = profileComplete ? now : null; break;
        case 'first-look':         completed = analysesCount >= 1;                           date = firstAnalysis?.createdAt ?? null; break;
        case 'watcher':            completed = watchlistCount >= 1;                          date = firstWatchlist?.createdAt ?? null; break;
        case 'investor':           completed = portfolioCount >= 1;                          date = firstPortfolio?.createdAt ?? null; break;
        case 'dreamer':            completed = goalsCount >= 1;                              date = firstGoal?.createdAt ?? null; break;
        case 'first-referrer':     completed = completedReferrals >= 1;                      date = completedReferrals >= 1 ? now : null; break;
        case 'subscriber':         completed = user?.plan === 'pro' || user?.plan === 'yearly' || false; date = user?.planExpiresAt ?? null; break;
        case 'week-with-us':       target = 7;   progress = Math.min(user?.loginStreak ?? 0, 7);   completed = (user?.loginStreak ?? 0) >= 7;   date = completed ? now : null; break;
        case 'active-analyst':     target = 10;  progress = Math.min(analysesCount, 10);            completed = analysesCount >= 10;             date = completed ? firstAnalysis?.createdAt ?? null : null; break;
        case 'wealth-builder':     target = 5;   progress = Math.min(portfolioCount, 5);            completed = portfolioCount >= 5;             date = completed ? firstPortfolio?.createdAt ?? null : null; break;
        case 'long-list':          target = 10;  progress = Math.min(watchlistCount, 10);           completed = watchlistCount >= 10;            date = completed ? firstWatchlist?.createdAt ?? null : null; break;
        case 'planner':            target = 3;   progress = Math.min(goalsCount, 3);                completed = goalsCount >= 3;                 date = completed ? firstGoal?.createdAt ?? null : null; break;
        case 'loyal':              target = 30;  progress = Math.min(Math.max(user?.loginStreak ?? 0, accountAgeDays), 30); completed = (user?.loginStreak ?? 0) >= 30 || accountAgeDays >= 30; date = completed ? now : null; break;
        case 'network':            target = 5;   progress = Math.min(completedReferrals, 5);        completed = completedReferrals >= 5;         date = completed ? now : null; break;
        case 'diversified':        target = 3;   progress = Math.min(portfolioCount, 3);            completed = portfolioCount >= 3;             date = completed ? firstPortfolio?.createdAt ?? null : null; break;
        case 'decision-maker':     target = 25;  progress = Math.min(analysesCount, 25);            completed = analysesCount >= 25;             date = completed ? firstAnalysis?.createdAt ?? null : null; break;
        case 'first-goal-achieved': completed = achievedGoalsCount >= 1;                    date = achievedGoalsCount >= 1 ? now : null; break;
        case 'devoted':            target = 90;  progress = Math.min(accountAgeDays, 90);           completed = accountAgeDays >= 90;            date = completed ? now : null; break;
        case 'expert-analyst':     target = 50;  progress = Math.min(analysesCount, 50);            completed = analysesCount >= 50;             date = completed ? firstAnalysis?.createdAt ?? null : null; break;
        case 'diverse-portfolio':  target = 5;   progress = Math.min(portfolioCount, 5);            completed = portfolioCount >= 5;             date = completed ? firstPortfolio?.createdAt ?? null : null; break;
        case 'strategist':         target = 5;   progress = Math.min(achievedGoalsCount, 5);        completed = achievedGoalsCount >= 5;         date = completed ? now : null; break;
        case 'egx-ambassador':     target = 20;  progress = Math.min(completedReferrals, 20);       completed = completedReferrals >= 20;        date = completed ? now : null; break;
        case 'big-portfolio':      target = 15;  progress = Math.min(portfolioCount, 15);           completed = portfolioCount >= 15;            date = completed ? firstPortfolio?.createdAt ?? null : null; break;
        case 'patient':            target = 180; progress = Math.min(accountAgeDays, 180);          completed = accountAgeDays >= 180;           date = completed ? now : null; break;
        case 'daily-follower':     target = 100; progress = Math.min(Math.max(user?.loginStreak ?? 0, accountAgeDays), 100); completed = (user?.loginStreak ?? 0) >= 100 || accountAgeDays >= 100; date = completed ? now : null; break;
        case 'researcher':         target = 10;  progress = Math.min(distinctTickers, 10);          completed = distinctTickers >= 10;           date = completed ? firstAnalysis?.createdAt ?? null : null; break;
        case 'annual-subscriber':  completed = user?.plan === 'yearly';                      date = user?.planExpiresAt ?? null; break;
        case 'leader':             target = 60;  progress = Math.min(user?.loginStreak ?? 0, 60);   completed = (user?.loginStreak ?? 0) >= 60;  date = completed ? now : null; break;
        case 'legend-analyst':     target = 100; progress = Math.min(analysesCount, 100);           completed = analysesCount >= 100;            date = completed ? firstAnalysis?.createdAt ?? null : null; break;
        case 'kings-portfolio':    target = 25;  progress = Math.min(portfolioCount, 25);           completed = portfolioCount >= 25;            date = completed ? firstPortfolio?.createdAt ?? null : null; break;
        case 'full-year':          target = 365; progress = Math.min(accountAgeDays, 365);          completed = accountAgeDays >= 365;           date = completed ? now : null; break;
        case 'mega-referrer':      target = 50;  progress = Math.min(completedReferrals, 50);       completed = completedReferrals >= 50;        date = completed ? now : null; break;
        case 'referral-legend':    target = 100; progress = Math.min(completedReferrals, 100);      completed = completedReferrals >= 100;       date = completed ? now : null; break;
        case 'community-leader':   target = 500; progress = Math.min(user?.totalReferrals ?? 0, 500); completed = (user?.totalReferrals ?? 0) >= 500; date = completed ? now : null; break;
        case 'the-1000':           target = 1000; progress = Math.min(user?.totalReferrals ?? 0, 1000); completed = (user?.totalReferrals ?? 0) >= 1000; date = completed ? now : null; break;
        case 'overachiever':       target = 200; progress = Math.min(analysesCount, 200);           completed = analysesCount >= 200;            date = completed ? now : null; break;
        case 'sector-expert':      target = 10;  progress = Math.min(distinctTickers, 10);          completed = distinctTickers >= 10;           date = completed ? firstAnalysis?.createdAt ?? null : null; break;
        case 'legend': break;
        default: break;
      }
      if (completed && def.id !== 'legend') completedByLevel[def.level as AchievementLevel]++;
      return {
        id: def.id, level: def.level, title: def.title, shortDescription: def.shortDescription,
        longDescription: def.longDescription, route: def.route, completed, date,
        ...(target !== undefined && { target }),
        ...(progress !== undefined && { progress }),
      };
    };
    const achievements = ACHIEVEMENT_DEFS.map((def) => build(def));
    const othersCompleted = achievements.filter((a) => a.id !== 'legend' && a.completed).length;
    const legendItem = achievements.find((a) => a.id === 'legend');
    if (legendItem) {
      legendItem.completed = othersCompleted >= 39;
      legendItem.date = legendItem.completed ? now : null;
      legendItem.progress = othersCompleted;
      legendItem.target = 39;
      if (legendItem.completed) completedByLevel.legend++;
    }
    let newTitle = 'ناشئ';
    if (completedByLevel.legend >= 10)      newTitle = 'أسطورة';
    else if (completedByLevel.pro >= 10)    newTitle = 'محترف';
    else if (completedByLevel.growth >= 10) newTitle = 'مستثمر';
    await UserRepository.update({ where: { id: userId }, data: { userTitle: newTitle } });
    return achievements.map((a) => ({ ...a, date: a.date?.toISOString() ?? null }));
  },
};
