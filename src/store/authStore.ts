import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { setAccessToken, clearTokens } from '../lib/auth/tokens';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  unseenAchievementsCount: number;
  setAuth: (user: User, accessToken: string) => void;
  setUser: (user: User) => void;
  updateUser: (user: Partial<User>) => void;
  setUnseenAchievementsCount: (n: number) => void;
  addUnseenAchievementsCount: (by: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      unseenAchievementsCount: 0,
      setAuth: (user, accessToken) => {
        setAccessToken(accessToken);
        set({ user, accessToken, isAuthenticated: true });
      },
      setUser: (user) => set({ user }),
      updateUser: (updatedFields) => set((state) => ({
        user: state.user ? { ...state.user, ...updatedFields } : null
      })),
      setUnseenAchievementsCount: (n) => set({ unseenAchievementsCount: n }),
      addUnseenAchievementsCount: (by) => set((state) => ({ unseenAchievementsCount: state.unseenAchievementsCount + by })),
      logout: async () => {
        try {
          const API = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL?.trim();
          const base = API ? `${API.replace(/\/$/, '')}/api` : '/api';
          await fetch(`${base}/auth/logout`, { method: 'POST', credentials: 'include' });
        } catch (err) {
          if (import.meta.env.DEV) console.error('Logout failed', err);
        }
        clearTokens();
        set({ user: null, accessToken: null, isAuthenticated: false, unseenAchievementsCount: 0 });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
      }),
    }
  )
);
