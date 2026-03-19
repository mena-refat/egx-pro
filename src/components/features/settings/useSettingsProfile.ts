import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../../store/authStore';
import type { ProfileUser } from '../profile/types';
import type { User } from '../../../types';

function userToProfileUser(user: User): ProfileUser {
  return {
    id: user.id,
    fullName: user.fullName ?? null,
    username: user.username ?? null,
    email: user.email ?? null,
    isEmailVerified: user.isEmailVerified,
    phone: user.phone ?? null,
    avatarUrl: user.avatarUrl ?? null,
    twoFactorEnabled: user.twoFactorEnabled,
    language: user.language,
    theme: user.theme,
    shariaMode: user.shariaMode,
    notifySignals: user.notifySignals,
    notifyPortfolio: user.notifyPortfolio,
    notifyNews: user.notifyNews,
  };
}

export function useSettingsProfile() {
  const { user: authUser, accessToken, updateUser } = useAuthStore();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(
    () => (authUser ? userToProfileUser(authUser) : null)
  );
  const [requestStatus, setRequestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (authUser) {
      setProfileUser(userToProfileUser(authUser));
    }
  }, [authUser]);

  const onUpdateProfile = useCallback(async (data: Record<string, unknown>, messages?: { success?: string; error?: string }) => {
    if (!accessToken) return;
    setRequestStatus(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body?.error as string) || 'Failed');
      const payload = (body as { data?: ProfileUser }).data ?? (body as Partial<ProfileUser>);
      updateUser(payload as Partial<User>);
      if (payload && typeof payload === 'object') {
        setProfileUser((prev) => (prev ? { ...prev, ...payload } : (payload as ProfileUser)));
      }
      if (messages?.success) setRequestStatus({ type: 'success', message: messages.success });
    } catch {
      if (messages?.error) setRequestStatus({ type: 'error', message: messages.error });
    }
  }, [accessToken, updateUser]);

  const onLogout = useAuthStore((s) => s.logout);

  return { profileUser, onUpdateProfile, onLogout, requestStatus, setRequestStatus };
}
