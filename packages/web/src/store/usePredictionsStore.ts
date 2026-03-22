import { create } from 'zustand';

export type PredictionStatus = 'ACTIVE' | 'HIT' | 'MISSED' | 'EXPIRED';
export type PredictionDir = 'UP' | 'DOWN';
export type PredictionTime = 'WEEK' | 'MONTH' | 'THREE_MONTHS' | 'SIX_MONTHS' | 'NINE_MONTHS' | 'YEAR';
export type UserRank = 'BEGINNER' | 'ANALYST' | 'SENIOR' | 'EXPERT' | 'LEGEND';
export type MoveTier = 'LIGHT' | 'MEDIUM' | 'STRONG' | 'EXTREME';
export type PredictionMode = 'TIER' | 'EXACT';

export interface FeedPrediction {
  id: string;
  userId: number;
  ticker: string;
  direction: PredictionDir;
  mode: PredictionMode;
  moveTier?: MoveTier;
  targetPrice?: number;
  priceAtCreation: number;
  timeframe?: PredictionTime; // undefined for EXACT mode
  reason: string | null;
  status: PredictionStatus;
  pointsEarned: number | null;
  accuracyPct: number | null;
  resolvedPrice: number | null;
  createdAt: string;
  expiresAt: string;
  resolvedAt: string | null;
  isPublic: boolean;
  likeCount: number;
  isLikedByMe: boolean;
  currentPrice?: number | null;
  user?: {
    id: number;
    username: string | null;
    avatarUrl: string | null;
  };
  userRank?: UserRank;
  userAccuracyRate?: number;
  userTotalPredictions?: number;
}

export interface UserPredictionStats {
  id?: number;
  userId: number;
  totalPredictions: number;
  correctPredictions: number;
  totalPoints: number;
  accuracyRate: number;
  currentStreak: number;
  bestStreak: number;
  rank: UserRank;
  updatedAt?: string;
}

export interface LeaderboardEntry {
  position: number;
  userId: number;
  totalPoints: number;
  totalPredictions: number;
  correctPredictions: number;
  accuracyRate: number;
  rank: UserRank;
  user: { id: number; username: string | null; avatarUrl: string | null };
}

export interface DailyLimits {
  used: number;
  limit: number;
  activeUsed: number;
  activeLimit: number;
  resetsAt: string;
}

export type NewPredictionDraft = {
  ticker?: string;
  stockName?: string;
  mode?: PredictionMode;
  // TIER fields
  direction?: PredictionDir;
  moveTier?: MoveTier;
  timeframe?: PredictionTime;
  // EXACT fields
  targetPrice?: number;
  expiresAt?: string; // ISO date string
  reason?: string;
  isPublic?: boolean;
};

type FeedPagination = { page: number; total: number; totalPages: number } | null;

interface PredictionsState {
  feedPredictions: FeedPrediction[];
  feedPagination: FeedPagination;
  myPredictions: FeedPrediction[];
  myPagination: { page: number; total: number; totalPages: number } | null;
  leaderboard: LeaderboardEntry[];
  myStats: UserPredictionStats | null;
  dailyLimits: DailyLimits | null;
  isNewPredictionOpen: boolean;
  newPredictionStep: 1 | 2 | 3 | 4;
  newPredictionDraft: NewPredictionDraft;
  feedFilter: 'all' | 'following' | 'top';
  selectedTicker: string | null;
  feedLoading: boolean;
  myLoading: boolean;
  leaderboardLoading: boolean;
  limitsLoading: boolean;
  feedCacheByFilter: Record<string, { items: FeedPrediction[]; pagination: FeedPagination; ts: number }>;
  setFeedPredictions: (items: FeedPrediction[], pagination: FeedPagination) => void;
  setMyPredictions: (items: FeedPrediction[], pagination: PredictionsState['myPagination']) => void;
  setLeaderboard: (items: LeaderboardEntry[]) => void;
  setMyStats: (stats: UserPredictionStats | null) => void;
  setDailyLimits: (limits: DailyLimits | null) => void;
  openNewPrediction: () => void;
  closeNewPrediction: () => void;
  setNewPredictionStep: (step: 1 | 2 | 3 | 4) => void;
  updateDraft: (draft: Partial<NewPredictionDraft>) => void;
  resetDraft: () => void;
  setFeedFilter: (filter: 'all' | 'following' | 'top') => void;
  setCachedFeed: (filter: string, items: FeedPrediction[], pagination: FeedPagination) => void;
  setSelectedTicker: (ticker: string | null) => void;
  setFeedLoading: (v: boolean) => void;
  setMyLoading: (v: boolean) => void;
  setLeaderboardLoading: (v: boolean) => void;
  setLimitsLoading: (v: boolean) => void;
  setLikeOnFeed: (predictionId: string, liked: boolean, likeCount: number) => void;
  setLikeOnMy: (predictionId: string, liked: boolean, likeCount: number) => void;
  removePrediction: (id: string) => void;
}

const initialDraft: NewPredictionDraft = {
  ticker: undefined,
  stockName: undefined,
  mode: 'TIER',
  direction: undefined,
  moveTier: undefined,
  timeframe: 'WEEK',
  targetPrice: undefined,
  expiresAt: undefined,
  reason: '',
  isPublic: true,
};

export const usePredictionsStore = create<PredictionsState>((set, get) => ({
  feedPredictions: [],
  feedPagination: null,
  myPredictions: [],
  myPagination: null,
  leaderboard: [],
  myStats: null,
  dailyLimits: null,
  isNewPredictionOpen: false,
  newPredictionStep: 1,
  newPredictionDraft: initialDraft,
  feedFilter: 'all',
  selectedTicker: null,
  feedCacheByFilter: {},
  feedLoading: false,
  myLoading: false,
  leaderboardLoading: false,
  limitsLoading: false,
  setFeedPredictions: (items, pagination) => set({ feedPredictions: items, feedPagination: pagination }),
  setMyPredictions: (items, pagination) => set({ myPredictions: items, myPagination: pagination }),
  setLeaderboard: (items) => set({ leaderboard: items }),
  setMyStats: (stats) => set({ myStats: stats }),
  setDailyLimits: (limits) => set({ dailyLimits: limits }),
  openNewPrediction: () => set({ isNewPredictionOpen: true, newPredictionStep: 1, newPredictionDraft: initialDraft }),
  closeNewPrediction: () => set({ isNewPredictionOpen: false, newPredictionStep: 1, newPredictionDraft: initialDraft }),
  setNewPredictionStep: (step) => set({ newPredictionStep: step }),
  updateDraft: (draft) => set((s) => ({ newPredictionDraft: { ...s.newPredictionDraft, ...draft } })),
  resetDraft: () => set({ newPredictionDraft: initialDraft }),
  setFeedFilter: (filter) => {
    const cached = get().feedCacheByFilter[filter];
    const isFresh = cached != null && Date.now() - cached.ts < 120_000; // 2 min
    set({
      feedFilter: filter,
      feedPredictions: isFresh ? cached.items : [],
      feedPagination: isFresh ? cached.pagination : null,
    });
  },
  setCachedFeed: (filter, items, pagination) =>
    set((s) => ({
      feedCacheByFilter: { ...s.feedCacheByFilter, [filter]: { items, pagination, ts: Date.now() } },
    })),
  setSelectedTicker: (ticker) => set({ selectedTicker: ticker }),
  setFeedLoading: (v) => set({ feedLoading: v }),
  setMyLoading: (v) => set({ myLoading: v }),
  setLeaderboardLoading: (v) => set({ leaderboardLoading: v }),
  setLimitsLoading: (v) => set({ limitsLoading: v }),
  setLikeOnFeed: (predictionId, liked, likeCount) =>
    set((s) => ({
      feedPredictions: s.feedPredictions.map((p) =>
        p.id === predictionId ? { ...p, isLikedByMe: liked, likeCount } : p
      ),
    })),
  setLikeOnMy: (predictionId, liked, likeCount) =>
    set((s) => ({
      myPredictions: s.myPredictions.map((p) =>
        p.id === predictionId ? { ...p, isLikedByMe: liked, likeCount } : p
      ),
    })),
  removePrediction: (id) =>
    set((s) => ({
      myPredictions: s.myPredictions.filter((p) => p.id !== id),
      feedPredictions: s.feedPredictions.filter((p) => p.id !== id),
    })),
}));
