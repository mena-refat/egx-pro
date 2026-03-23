import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAccessToken, setAccessToken, setRefreshToken, clearTokens } from '../lib/auth/tokens';
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
  notifySignals: boolean;
  notifyPortfolio: boolean;
  notifyNews: boolean;
  notifyAchievements: boolean;
  notifyGoals: boolean;
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
          // ignore — always clear local state even if the server call fails
        }
        await clearTokens();
        set({ user: null, isAuthenticated: false });
        // Belt-and-suspenders: wipe the persisted AsyncStorage entry so no
        // stale isAuthenticated=true can survive a crash mid-logout.
        try {
          await AsyncStorage.removeItem('borsa-mobile-auth');
        } catch {
          // non-critical
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          // Fast path: no token stored → user is definitely not logged in.
          // Skip the network call entirely to avoid a 15-second timeout hang.
          const storedToken = await getAccessToken();
          if (!storedToken) {
            set({ user: null, isAuthenticated: false });
            return;
          }

          const res = await apiClient.get(ENDPOINTS.auth.me, { timeout: 8_000 });
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
          const isNetworkError =
            (err as { error?: string })?.error === 'NETWORK_ERROR' ||
            (err as { error?: string })?.error === 'REQUEST_TIMEOUT';
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
      // Only persist the auth flag — never store PII (email, phone, tokens) in
      // unencrypted AsyncStorage (OWASP M9 – Insecure Data Storage).
      // The full user object is always loaded fresh from /api/auth/me on app start.
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

