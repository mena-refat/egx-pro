export interface FollowUser {
  id: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface PendingRequest {
  followerId: string;
  follower: FollowUser;
  createdAt: string;
}

export interface LeaderboardEntry {
  username: string;
  avatarUrl?: string | null;
  rank: string;
  accuracyRate: number;
  totalPredictions: number;
  hitCount?: number;
}

export interface FeedPrediction {
  id: string;
  ticker: string;
  direction: 'UP' | 'DOWN';
  targetPrice: number;
  reason?: string;
  user?: { username: string; avatarUrl?: string | null };
  createdAt: string;
}

export type Tab = 'discover' | 'followers' | 'following' | 'requests';

export type SearchResult = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  followersCount: number;
  myFollowStatus: 'none' | 'pending' | 'following';
};

export type AutocompleteSuggestion = {
  username: string;
  avatarUrl: string | null;
  rank: string;
  accuracyRate: number;
  totalPredictions: number;
  isPrivate: boolean;
  followStatus: 'NONE' | 'FOLLOWING' | 'PENDING';
};

export const RANK_KEYS: Record<string, string> = {
  BEGINNER: 'rankBeginner',
  ANALYST: 'rankAnalyst',
  SENIOR: 'rankSenior',
  EXPERT: 'rankExpert',
  LEGEND: 'rankLegend',
};
