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
