import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export type ProfileCompletion = { percentage: number; missing: { field: string; route: string }[] } | null;

export function useProfileCompletion(isAuthenticated: boolean) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [profileCompletion, setProfileCompletion] = useState<ProfileCompletion>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchProfileCompletion = useCallback(async () => {
    if (!isAuthenticated || !accessToken) { setProfileCompletion(null); return; }
    try {
      const res = await fetch('/api/profile/completion', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) {
        const data = await res.json();
        const payload = data?.data ?? data;
        setProfileCompletion({ percentage: payload?.percentage ?? 0, missing: payload?.missing ?? [] });
      } else setProfileCompletion(null);
    } catch {
      setProfileCompletion(null);
    }
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchProfileCompletion();
    });
  }, [fetchProfileCompletion]);
  useEffect(() => {
    if (location.pathname !== '/settings') return;
    queueMicrotask(() => {
      void fetchProfileCompletion();
    });
  }, [location.pathname, fetchProfileCompletion]);
  useEffect(() => {
    const handler = () => fetchProfileCompletion();
    window.addEventListener('profile-completion-changed', handler);
    return () => window.removeEventListener('profile-completion-changed', handler);
  }, [fetchProfileCompletion]);

  useEffect(() => {
    const handler = () => navigate('/settings/subscription');
    window.addEventListener('navigate-to-subscription', handler);
    return () => window.removeEventListener('navigate-to-subscription', handler);
  }, [navigate]);

  return { profileCompletion, fetchProfileCompletion };
}
