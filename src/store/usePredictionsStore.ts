import { create } from 'zustand';

export type PredictionStatus = 'ACTIVE' | 'HIT' | 'MISSED' | 'EXPIRED';
export type PredictionDir = 'UP' | 'DOWN';
export type PredictionTime = 'WEEK' | 'MONTH' | 'THREE_MONTHS' | 'SIX_MONTHS' | 'NINE_MONTHS' | 'YEAR';
export type UserRank = 'BEGINNER' | 'ANALYST' | 'SENIOR' | 'EXPERT' | 'LEGEND';

export interface FeedPrediction {
  id: string;
  userId: string;
  ticker: string;
  direction: PredictionDir;
  targetPrice: number;
  priceAtCreation: number;
  timeframe: PredictionTime;
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
  user?: {
    id: string;
    username: string | null;
    avatarUrl: string | null;
  };
  userRank?: UserRank;
  userAccuracyRate?: number;
  userTotalPredictions?: number;
}

export interface UserPredictionStats {
  id?: number;
  userId: string;
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
  userId: string;
  totalPoints: number;
  totalPredictions: number;
  correctPredictions: number;
  accuracyRate: number;
  rank: UserRank;
  user: { id: string; username: string | null; avatarUrl: string | null };
}

export interface DailyLimits {
  used: number;
  limit: number;
  resetsAt: string;
}

export type NewPredictionDraft = {
  ticker?: string;
  stockName?: string;
  direction?: PredictionDir;
  targetPrice?: number;
  timeframe?: PredictionTime;
  reason?: string;
  isPublic?: boolean;
};

interface PredictionsState {
  feedPredictions: FeedPrediction[];
  feedPagination: { page: number; total: number; totalPages: number } | null;
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
  setFeedPredictions: (items: FeedPrediction[], pagination: PredictionsState['feedPagination']) => void;
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
  setSelectedTicker: (ticker: string | null) => void;
  setFeedLoading: (v: boolean) => void;
  setMyLoading: (v: boolean) => void;
  setLeaderboardLoading: (v: boolean) => void;
  setLimitsLoading: (v: boolean) => void;
  setLikeOnFeed: (predictionId: string, liked: boolean, likeCount: number) => void;
  setLikeOnMy: (predictionId: string, liked: boolean, likeCount: number) => void;
}

const initialDraft: NewPredictionDraft = {
  ticker: undefined,
  stockName: undefined,
  direction: undefined,
  targetPrice: undefined,
  timeframe: 'WEEK',
  reason: '',
  isPublic: true,
};

export const usePredictionsStore = create<PredictionsState>((set) => ({
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
  setFeedFilter: (filter) => set({ feedFilter: filter }),
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
}));
