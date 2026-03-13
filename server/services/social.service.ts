import { prisma } from '../lib/prisma.ts';
import { UserRepository } from '../repositories/user.repository.ts';
import type { AuthUser } from '../routes/types.ts';
import { AppError } from '../lib/errors.ts';
import { createNotification } from '../lib/createNotification.ts';

export const SocialService = {
  async follow(currentUserId: string, username: string) {
    const target = await UserRepository.findFirst({
      where: { username: username.trim().toLowerCase() },
      select: { id: true, isPrivate: true },
    });
    if (!target) throw new AppError('NOT_FOUND', 404);
    if (target.id === currentUserId) throw new AppError('CANNOT_FOLLOW_SELF', 400);

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: currentUserId, followingId: target.id } },
    });

    if (existing?.status === 'BLOCKED') {
      throw new AppError('FOLLOW_BLOCKED', 403);
    }

    const status = target.isPrivate ? 'PENDING' : 'ACCEPTED';

    const follow = await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: currentUserId, followingId: target.id } },
      update: { status },
      create: { followerId: currentUserId, followingId: target.id, status },
    });

    if (status === 'ACCEPTED') {
      const follower = await UserRepository.findUnique({
        where: { id: currentUserId },
        select: { username: true },
      });
      const un = follower?.username ?? 'مستخدم';
      await createNotification(
        target.id,
        'social_follow',
        'متابع جديد',
        `@${un} بدأ بمتابعتك.`,
        { route: follower?.username ? `/profile/${follower.username}` : undefined }
      );
    } else {
      const follower = await UserRepository.findUnique({
        where: { id: currentUserId },
        select: { username: true },
      });
      const un = follower?.username ?? 'مستخدم';
      await createNotification(
        target.id,
        'social_request',
        'طلب متابعة جديد',
        `@${un} طلب متابعة حسابك الخاص.`,
        { route: follower?.username ? `/profile/${follower.username}` : undefined }
      );
    }

    return follow;
  },

  async unfollow(currentUserId: string, username: string) {
    const target = await UserRepository.findFirst({
      where: { username: username.trim().toLowerCase() },
      select: { id: true },
    });
    if (!target) return;
    await prisma.follow.deleteMany({
      where: { followerId: currentUserId, followingId: target.id },
    });
  },

  async getFollowers(currentUserId: string) {
    const rows = await prisma.follow.findMany({
      where: { followingId: currentUserId, status: 'ACCEPTED' },
      include: {
        follower: { select: { id: true, username: true, fullName: true, avatarUrl: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => ({
      id: row.follower.id,
      username: row.follower.username,
      fullName: row.follower.fullName,
      avatarUrl: row.follower.avatarUrl,
      followedAt: row.createdAt,
    }));
  },

  async getFollowing(currentUserId: string) {
    const rows = await prisma.follow.findMany({
      where: { followerId: currentUserId, status: 'ACCEPTED' },
      include: {
        following: { select: { id: true, username: true, fullName: true, avatarUrl: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => ({
      id: row.following.id,
      username: row.following.username,
      fullName: row.following.fullName,
      avatarUrl: row.following.avatarUrl,
      followedAt: row.createdAt,
    }));
  },

  async getProfileFollowers(profileUsername: string, viewerId: string, page: number, limit: number) {
    const profile = await UserRepository.findFirst({
      where: { username: profileUsername.trim().toLowerCase(), isDeleted: false },
      select: { id: true, isPrivate: true },
    });
    if (!profile) throw new AppError('NOT_FOUND', 404);
    const isOwner = viewerId === profile.id;
    if (profile.isPrivate && !isOwner) {
      const rel = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: profile.id } },
      });
      if (rel?.status !== 'ACCEPTED') throw new AppError('FORBIDDEN', 403);
    }
    const skip = Math.max(0, (page - 1) * limit);
    const take = limit + 1;
    const rows = await prisma.follow.findMany({
      where: { followingId: profile.id, status: 'ACCEPTED' },
      include: {
        follower: { select: { id: true, username: true, createdAt: true, isPrivate: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
    const followerIds = rows.map((r) => r.follower.id).filter(Boolean);
    const viewerFollows = viewerId
      ? await prisma.follow.findMany({
          where: { followerId: viewerId, followingId: { in: followerIds } },
          select: { followingId: true, status: true },
        })
      : [];
    const statusByTarget = new Map<string, 'none' | 'pending' | 'following'>(
      viewerFollows.map((r) => [
        r.followingId,
        r.status === 'ACCEPTED' ? 'following' : 'pending',
      ])
    );
    const items = rows.slice(0, limit).map((row) => ({
      id: row.follower.id,
      username: row.follower.username,
      joinDate: row.follower.createdAt,
      isPrivate: row.follower.isPrivate,
      followStatus: (statusByTarget.get(row.follower.id) ?? 'none') as 'none' | 'pending' | 'following',
    }));
    return { items, hasMore: rows.length > limit, page };
  },

  async getProfileFollowing(profileUsername: string, viewerId: string, page: number, limit: number) {
    const profile = await UserRepository.findFirst({
      where: { username: profileUsername.trim().toLowerCase(), isDeleted: false },
      select: { id: true, isPrivate: true },
    });
    if (!profile) throw new AppError('NOT_FOUND', 404);
    const isOwner = viewerId === profile.id;
    if (profile.isPrivate && !isOwner) {
      const rel = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: profile.id } },
      });
      if (rel?.status !== 'ACCEPTED') throw new AppError('FORBIDDEN', 403);
    }
    const skip = Math.max(0, (page - 1) * limit);
    const take = limit + 1;
    const rows = await prisma.follow.findMany({
      where: { followerId: profile.id, status: 'ACCEPTED' },
      include: {
        following: { select: { id: true, username: true, createdAt: true, isPrivate: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
    const followingIds = rows.map((r) => r.following.id).filter(Boolean);
    const viewerFollows = viewerId
      ? await prisma.follow.findMany({
          where: { followerId: viewerId, followingId: { in: followingIds } },
          select: { followingId: true, status: true },
        })
      : [];
    const statusByTarget = new Map<string, 'none' | 'pending' | 'following'>(
      viewerFollows.map((r) => [
        r.followingId,
        r.status === 'ACCEPTED' ? 'following' : 'pending',
      ])
    );
    const items = rows.slice(0, limit).map((row) => ({
      id: row.following.id,
      username: row.following.username,
      joinDate: row.following.createdAt,
      isPrivate: row.following.isPrivate,
      followStatus: (statusByTarget.get(row.following.id) ?? 'none') as 'none' | 'pending' | 'following',
    }));
    return { items, hasMore: rows.length > limit, page };
  },

  async getRequests(currentUserId: string) {
    const rows = await prisma.follow.findMany({
      where: { followingId: currentUserId, status: 'PENDING' },
      include: {
        follower: { select: { id: true, username: true, fullName: true, avatarUrl: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => ({
      id: row.follower.id,
      username: row.follower.username,
      fullName: row.follower.fullName,
      avatarUrl: row.follower.avatarUrl,
      requestedAt: row.createdAt,
    }));
  },

  async acceptRequest(currentUserId: string, followerId: string) {
    const updated = await prisma.follow.updateMany({
      where: { followerId, followingId: currentUserId, status: 'PENDING' },
      data: { status: 'ACCEPTED' },
    });
    if (updated.count === 0) {
      throw new AppError('NOT_FOUND', 404);
    }
    const accepter = await UserRepository.findUnique({
      where: { id: currentUserId },
      select: { username: true },
    });
    const un = accepter?.username ?? 'مستخدم';
    await createNotification(
      followerId,
      'social_accept',
      'تم قبول طلب المتابعة',
      `@${un} قبل طلب متابعتك.`,
      { route: accepter?.username ? `/profile/${accepter.username}` : undefined }
    );
  },

  async declineRequest(currentUserId: string, followerId: string) {
    await prisma.follow.deleteMany({
      where: { followerId, followingId: currentUserId, status: 'PENDING' },
    });
  },

  async getPublicProfile(viewer: AuthUser | undefined, username: string) {
    const target = await UserRepository.findFirst({
      where: { username: username.trim().toLowerCase() },
      select: {
        id: true,
        username: true,
        createdAt: true,
        isPrivate: true,
        showPortfolio: true,
      },
    });
    if (!target) throw new AppError('NOT_FOUND', 404);

    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: target.id, status: 'ACCEPTED' } }),
      prisma.follow.count({ where: { followerId: target.id, status: 'ACCEPTED' } }),
    ]);

    const viewerId = viewer?.id;
    const isOwner = viewerId === target.id;
    let isAcceptedFollower = false;
    let myFollowStatus: 'none' | 'pending' | 'following' = 'none';

    if (viewerId && !isOwner) {
      const rel = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: target.id } },
      });
      isAcceptedFollower = rel?.status === 'ACCEPTED';
      if (rel?.status === 'ACCEPTED') myFollowStatus = 'following';
      else if (rel?.status === 'PENDING') myFollowStatus = 'pending';
    }

    const publicMeta = {
      username: target.username,
      joinDate: target.createdAt,
      followersCount,
      followingCount,
      isPrivate: target.isPrivate,
      myFollowStatus,
    };

    if (target.isPrivate && !isOwner && !isAcceptedFollower) {
      return { ...publicMeta, isPrivate: true };
    }

    const [holdings, watchlist] = await Promise.all([
      target.showPortfolio
        ? prisma.portfolio.findMany({
            where: { userId: target.id },
            select: { ticker: true, shares: true, avgPrice: true },
          })
        : Promise.resolve([]),
      prisma.watchlist.findMany({
        where: { userId: target.id },
        select: { ticker: true },
      }),
    ]);

    let portfolio: Array<{ ticker: string; percentage: number }> = [];
    if (holdings.length > 0) {
      const values = holdings.map((h) => ({
        ticker: h.ticker,
        value: h.shares * h.avgPrice,
      }));
      const total = values.reduce((sum, v) => sum + v.value, 0);
      if (total > 0) {
        portfolio = values.map((v) => ({
          ticker: v.ticker,
          percentage: parseFloat(((v.value / total) * 100).toFixed(1)),
        }));
      }
    }

    const watchlistTickers = Array.from(
      new Set(watchlist.map((w) => w.ticker.toUpperCase()))
    ).map((ticker) => ({ ticker }));

    return {
      ...publicMeta,
      showPortfolio: target.showPortfolio,
      portfolio,
      watchlist: watchlistTickers,
    };
  },

  /** GET /username-search: prefix autocomplete, min 5 chars, max 5 results, exclude self. */
  async usernameSearch(
    currentUserId: string,
    q: string,
    limit: number = 5
  ): Promise<
    Array<{
      username: string;
      avatarUrl: string | null;
      rank: string;
      accuracyRate: number;
      totalPredictions: number;
      isPrivate: boolean;
      followStatus: 'NONE' | 'FOLLOWING' | 'PENDING';
    }>
  > {
    const term = q.trim().toLowerCase();
    if (term.length < 5) return [];

    const take = Math.min(10, Math.max(1, limit));
    const users = await UserRepository.findMany({
      where: {
        isDeleted: false,
        id: { not: currentUserId },
        username: { not: null, startsWith: term, mode: 'insensitive' },
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        isPrivate: true,
        predictionStats: { select: { rank: true, accuracyRate: true, totalPredictions: true } },
      },
      take,
      orderBy: { username: 'asc' },
    });

    const sliced = users;
    const ids = sliced.map((u) => u.id).filter(Boolean);
    const followRows = await prisma.follow.findMany({
      where: { followerId: currentUserId, followingId: { in: ids } },
      select: { followingId: true, status: true },
    });
    const statusByTarget = new Map<string, 'NONE' | 'FOLLOWING' | 'PENDING'>(
      followRows.map((r) => [
        r.followingId,
        r.status === 'ACCEPTED' ? 'FOLLOWING' : 'PENDING',
      ])
    );

    return sliced.map((u) => {
      const un = u.username ?? '';
      const stats = u.predictionStats;
      return {
        username: un,
        avatarUrl: u.avatarUrl ?? null,
        rank: (stats?.rank ?? 'BEGINNER') as string,
        accuracyRate: Math.round(stats?.accuracyRate ?? 0),
        totalPredictions: stats?.totalPredictions ?? 0,
        isPrivate: u.isPrivate ?? false,
        followStatus: (u.id ? statusByTarget.get(u.id) : null) ?? 'NONE',
      };
    });
  },

  async search(currentUserId: string, q: string) {
    const term = q.trim().toLowerCase();
    if (!term || term.length < 2) return [];
    const users = await UserRepository.findMany({
      where: {
        isDeleted: false,
        username: { contains: term, mode: 'insensitive' },
      },
      select: { id: true, username: true, avatarUrl: true },
      take: 20,
    });
    if (users.length === 0) return [];
    const ids = users.map((u) => u.id).filter((id): id is string => Boolean(id));
    const followersCount = await Promise.all(
      ids.map((id) => prisma.follow.count({ where: { followingId: id, status: 'ACCEPTED' } }))
    );
    const followRows = await prisma.follow.findMany({
      where: {
        followerId: currentUserId,
        followingId: { in: ids },
      },
      select: { followingId: true, status: true },
    });
    const statusByTarget = new Map<string, 'pending' | 'following'>(
      followRows.map((r) => [r.followingId, r.status === 'ACCEPTED' ? 'following' : 'pending'])
    );
    return users.map((u, i) => ({
      id: u.id,
      username: u.username,
      avatarUrl: u.avatarUrl,
      followersCount: followersCount[i] ?? 0,
      myFollowStatus: (u.id ? statusByTarget.get(u.id) : null) ?? ('none' as const),
    }));
  },

  async updateSettings(userId: string, body: { isPrivate?: boolean; showPortfolio?: boolean }) {
    const current = await UserRepository.findUnique({
      where: { id: userId },
      select: { isPrivate: true },
    });
    if (!current) throw new AppError('UNAUTHORIZED', 401);

    const nextIsPrivate = body.isPrivate ?? current.isPrivate;

    const user = await UserRepository.update({
      where: { id: userId },
      data: {
        isPrivate: nextIsPrivate,
        ...(body.showPortfolio !== undefined && { showPortfolio: body.showPortfolio }),
      },
    });

    if (current.isPrivate && !nextIsPrivate) {
      const pending = await prisma.follow.findMany({
        where: { followingId: userId, status: 'PENDING' },
        select: { followerId: true, id: true },
      });
      if (pending.length > 0) {
        await prisma.follow.updateMany({
          where: { followingId: userId, status: 'PENDING' },
          data: { status: 'ACCEPTED' },
        });
        const accepter = await UserRepository.findUnique({
          where: { id: userId },
          select: { username: true },
        });
        const route = accepter?.username ? `/profile/${accepter.username}` : undefined;
        await Promise.all(
          pending.map((p) =>
            createNotification(
              p.followerId,
              'social_accept',
              'تم قبول طلب المتابعة',
              `@${accepter?.username ?? 'مستخدم'} قبل طلب متابعتك.`,
              { route }
            )
          )
        );
      }
    }

    return user;
  },
};

