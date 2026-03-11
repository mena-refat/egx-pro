import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { validateUsernameFormat, USERNAME_MAX_LENGTH } from '../lib/validations';
import { TIMEOUTS } from '../lib/constants';

export function useUsernameSetup() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { user, accessToken, updateUser } = useAuthStore();

  const [value, setValue] = useState(user?.username ?? '');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const formatErrorKey = validateUsernameFormat(value);
  const formatError = formatErrorKey ? t(formatErrorKey) : null;

  const checkAvailability = useCallback(
    async (name: string) => {
      if (!accessToken) return;
      if (!name || formatErrorKey) {
        setStatus('idle');
        setMessage(null);
        return;
      }
      setStatus('checking');
      setMessage(null);
      try {
        const res = await fetch(`/api/user/username/check?username=${encodeURIComponent(name)}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Invalid');
        const payload = (data as { data?: { available?: boolean } }).data ?? data;
        if (payload?.available) {
          setStatus('available');
          setMessage(null);
        } else {
          setStatus('taken');
          setMessage(t('settings.usernameTaken'));
        }
      } catch {
        setStatus('error');
        setMessage(t('settings.usernameTaken'));
      }
    },
    [accessToken, formatErrorKey, t]
  );

  const onChange = useCallback(
    (next: string) => {
      setValue(next);
      setStatus('idle');
      setMessage(null);
      window.setTimeout(() => checkAvailability(next), TIMEOUTS.usernameCheckDebounce);
    },
    [checkAvailability]
  );

  const onSubmit = useCallback(async () => {
    if (!accessToken || !value) return;
    if (formatError) return;
    if (status === 'taken' || status === 'error') return;
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ username: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed');
      const payload = (data as { data?: { username?: string } }).data ?? data;
      if (payload?.username) updateUser({ username: payload.username });
      navigate('/', { replace: true });
    } catch (err) {
      setMessage((err as Error).message || t('common.error'));
    } finally {
      setSaving(false);
    }
  }, [accessToken, value, formatError, status, updateUser, navigate, t]);

  return {
    value,
    status,
    message,
    saving,
    formatError,
    USERNAME_MAX_LENGTH,
    onChange,
    onSubmit,
  };
}
