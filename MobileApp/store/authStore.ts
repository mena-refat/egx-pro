import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAccessToken, setRefreshToken, clearTokens } from '../lib/auth/tokens';
import apiClient from '../lib/api/client';
import { ENDPOINTS } from '../lib/api/endpoints';

export interface MobileUser {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  plan: 'free' | 'pro' | 'yearly' | 'ultra' | 'ultra_yearly';
  planExpiresAt: string | null;
  language: string;
  theme: string;
  shariaMode: boolean;
  onboardingCompleted: boolean;
  isFirstLogin: boolean;
  aiAnalysisUsedThisMonth: number;
}

interface AuthState {
  user: MobileUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: MobileUser, accessToken: string, refreshToken?: string) => Promise<void>;
  updateUser: (fields: Partial<MobileUser>) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: async (user, accessToken, refreshToken) => {
        await setAccessToken(accessToken);
        if (refreshToken) await setRefreshToken(refreshToken);
        set({ user, isAuthenticated: true, isLoading: false });
      },

      updateUser: (fields) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...fields } : null,
        })),

      logout: async () => {
        try {
          await apiClient.post(ENDPOINTS.auth.logout);
        } catch {
          // ignore
        }
        await clearTokens();
        set({ user: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const res = await apiClient.get(ENDPOINTS.auth.me);
          const body = res.data as { user?: MobileUser; accessToken?: string } | MobileUser;
          const user = (body as { user?: MobileUser }).user ?? (body as MobileUser);
          // If server issued a new access token (web cookie flow), save it
          const newToken = (body as { accessToken?: string }).accessToken;
          if (newToken) await setAccessToken(newToken);
          if (user?.id) {
            set({ user: user as MobileUser, isAuthenticated: true });
          } else {
            set({ user: null, isAuthenticated: false });
          }
        } catch (err: unknown) {
          // Keep user logged in on network errors — only clear auth on 401
          const isNetworkError = (err as { error?: string })?.error === 'NETWORK_ERROR';
          if (!isNetworkError) {
            set({ user: null, isAuthenticated: false });
          }
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'borsa-mobile-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user
          ? {
              id: state.user.id,
              email: state.user.email,
              phone: state.user.phone,
              fullName: state.user.fullName,
              username: state.user.username,
              avatarUrl: state.user.avatarUrl,
              plan: state.user.plan,
              planExpiresAt: state.user.planExpiresAt,
              language: state.user.language,
              theme: state.user.theme,
              shariaMode: state.user.shariaMode,
              onboardingCompleted: state.user.onboardingCompleted,
              isFirstLogin: state.user.isFirstLogin,
              aiAnalysisUsedThisMonth: state.user.aiAnalysisUsedThisMonth,
            }
          : null,
      }),
    },
  ),
);

