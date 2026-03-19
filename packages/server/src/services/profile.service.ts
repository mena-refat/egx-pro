import { UserRepository } from '../repositories/user.repository.ts';
import { GoalsRepository } from '../repositories/goals.repository.ts';
import { WatchlistRepository } from '../repositories/watchlist.repository.ts';

export type ProfileCompletionResult = {
  percentage: number;
  missing: Array<{ field: 'email' | 'phone' | 'username' | 'goal' | 'watchlist'; route: string }>;
};

export const ProfileService = {
  async getCompletion(userId: number): Promise<ProfileCompletionResult | null> {
    const [user, goalsCount, watchlistCount] = await Promise.all([
      UserRepository.findUnique({
        where: { id: userId },
        select: { email: true, phone: true, username: true, usernameChangeCount: true },
      }),
      GoalsRepository.countByUser(userId),
      WatchlistRepository.countByUser(userId),
    ]);

    if (!user) return null;

    const hasEmail = Boolean(user.email?.trim());
    const hasPhone = Boolean(user.phone?.trim());
    const hasUsernameManual =
      Boolean(user.username?.trim()) && ((user.usernameChangeCount ?? 0) > 0);
    const hasGoal = goalsCount >= 1;
    const hasWatchlist = watchlistCount >= 1;

    const checks = [
      { field: 'email' as const, ok: hasEmail },
      { field: 'phone' as const, ok: hasPhone },
      { field: 'username' as const, ok: hasUsernameManual },
      { field: 'goal' as const, ok: hasGoal },
      { field: 'watchlist' as const, ok: hasWatchlist },
    ];

    const percentage = checks.reduce((sum, c) => {
      if (!c.ok) return sum;
      if (c.field === 'username') return sum + 10;
      if (c.field === 'email') return sum + 25;
      if (c.field === 'phone') return sum + 25;
      if (c.field === 'goal') return sum + 20;
      if (c.field === 'watchlist') return sum + 20;
      return sum;
    }, 0);

    const missing = checks
      .filter((c) => !c.ok)
      .map((c) => ({
        field: c.field,
        route:
          c.field === 'goal'
            ? '/goals'
            : c.field === 'watchlist'
              ? '/stocks'
              : '/profile?tab=account',
      }));

    return { percentage, missing };
  },
};
