import { create } from 'zustand';

export type FollowListItem = {
  id: string;
  username: string | null;
  joinDate: string;
  isPrivate: boolean;
  followStatus: 'none' | 'pending' | 'following';
};

interface ProfileState {
  followersCount: number;
  followingCount: number;
  followersList: FollowListItem[];
  followingList: FollowListItem[];
  isFollowersModalOpen: boolean;
  isFollowingModalOpen: boolean;
  profileUsername: string | null;
  followersPage: number;
  followingPage: number;
  hasMoreFollowers: boolean;
  hasMoreFollowing: boolean;
  followersLoading: boolean;
  followingLoading: boolean;

  setCounts: (followers: number, following: number) => void;
  setProfileUsername: (username: string | null) => void;
  openFollowersModal: (username: string) => void;
  openFollowingModal: (username: string) => void;
  closeFollowersModal: () => void;
  closeFollowingModal: () => void;
  setFollowersList: (items: FollowListItem[], hasMore: boolean, page: number) => void;
  setFollowingList: (items: FollowListItem[], hasMore: boolean, page: number) => void;
  appendFollowersList: (items: FollowListItem[], hasMore: boolean) => void;
  appendFollowingList: (items: FollowListItem[], hasMore: boolean) => void;
  setFollowersLoading: (v: boolean) => void;
  setFollowingLoading: (v: boolean) => void;
  setFollowStatusInFollowers: (username: string, followStatus: FollowListItem['followStatus']) => void;
  setFollowStatusInFollowing: (username: string, followStatus: FollowListItem['followStatus']) => void;
  incrementFollowingCount: () => void;
  decrementFollowingCount: () => void;
  incrementFollowersCount: () => void;
  decrementFollowersCount: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  followersCount: 0,
  followingCount: 0,
  followersList: [],
  followingList: [],
  isFollowersModalOpen: false,
  isFollowingModalOpen: false,
  profileUsername: null,
  followersPage: 1,
  followingPage: 1,
  hasMoreFollowers: false,
  hasMoreFollowing: false,
  followersLoading: false,
  followingLoading: false,

  setCounts: (followers, following) =>
    set({ followersCount: followers, followingCount: following }),

  setProfileUsername: (username) => set({ profileUsername: username }),

  openFollowersModal: (username) =>
    set({
      profileUsername: username,
      isFollowersModalOpen: true,
      followersList: [],
      followersPage: 1,
      hasMoreFollowers: false,
    }),

  openFollowingModal: (username) =>
    set({
      profileUsername: username,
      isFollowingModalOpen: true,
      followingList: [],
      followingPage: 1,
      hasMoreFollowing: false,
    }),

  closeFollowersModal: () =>
    set({ isFollowersModalOpen: false, profileUsername: null }),

  closeFollowingModal: () =>
    set({ isFollowingModalOpen: false, profileUsername: null }),

  setFollowersList: (items, hasMore, page) =>
    set({ followersList: items, hasMoreFollowers: hasMore, followersPage: page }),

  setFollowingList: (items, hasMore, page) =>
    set({ followingList: items, hasMoreFollowing: hasMore, followingPage: page }),

  appendFollowersList: (items, hasMore) =>
    set((s) => ({
      followersList: [...s.followersList, ...items],
      hasMoreFollowers: hasMore,
      followersPage: s.followersPage + 1,
    })),

  appendFollowingList: (items, hasMore) =>
    set((s) => ({
      followingList: [...s.followingList, ...items],
      hasMoreFollowing: hasMore,
      followingPage: s.followingPage + 1,
    })),

  setFollowersLoading: (v) => set({ followersLoading: v }),
  setFollowingLoading: (v) => set({ followingLoading: v }),

  setFollowStatusInFollowers: (username, followStatus) =>
    set((s) => ({
      followersList: s.followersList.map((u) =>
        u.username === username ? { ...u, followStatus } : u
      ),
    })),

  setFollowStatusInFollowing: (username, followStatus) =>
    set((s) => ({
      followingList: s.followingList.map((u) =>
        u.username === username ? { ...u, followStatus } : u
      ),
    })),

  incrementFollowingCount: () => set((s) => ({ followingCount: s.followingCount + 1 })),
  decrementFollowingCount: () => set((s) => ({ followingCount: Math.max(0, s.followingCount - 1) })),
  incrementFollowersCount: () => set((s) => ({ followersCount: s.followersCount + 1 })),
  decrementFollowersCount: () => set((s) => ({ followersCount: Math.max(0, s.followersCount - 1) })),
}));
