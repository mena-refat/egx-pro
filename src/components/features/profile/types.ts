export interface ProfileUser {
  id: string;
  fullName?: string | null;
  username?: string | null;
  isPrivate?: boolean;
  showPortfolio?: boolean;
  email?: string | null;
  isEmailVerified?: boolean;
  phone?: string | null;
  avatarUrl?: string | null;
  lastPasswordChangeAt?: string | null;
  lastUsernameChangeAt?: string | null;
  twoFactorEnabled?: boolean;
  twoFactorEnabledAt?: string | null;
  language?: string;
  theme?: string;
  shariaMode?: boolean;
  notifySignals?: boolean;
  notifyPortfolio?: boolean;
  notifyNews?: boolean;
  notifyAchievements?: boolean;
  notifyGoals?: boolean;
}

export interface ProfileTabProps {
  user: ProfileUser;
  onUpdateProfile: (data: Record<string, unknown>, messages?: { success?: string; error?: string }) => Promise<void>;
  onLogout: () => void;
  setRequestStatus: (s: { type: 'success' | 'error'; message: string } | null) => void;
}
