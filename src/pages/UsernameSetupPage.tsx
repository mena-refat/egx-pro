import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { validateUsernameFormat, USERNAME_MAX_LENGTH } from '../lib/validations';
import { TIMEOUTS } from '../lib/constants';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export default function UsernameSetupPage() {
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
        if (!res.ok) {
          throw new Error(data?.error || 'Invalid');
        }
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

  const onChange = (next: string) => {
    setValue(next);
    setStatus('idle');
    setMessage(null);
    window.setTimeout(() => {
      checkAvailability(next);
    }, TIMEOUTS.usernameCheckDebounce);
  };

  const onSubmit = async () => {
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
      if (!res.ok) {
        throw new Error(data?.error || 'Failed');
      }
      const payload = (data as { data?: { username?: string } }).data ?? data;
      if (payload?.username) {
        updateUser({ username: payload.username });
      }
      navigate('/', { replace: true });
    } catch (err) {
      setMessage((err as Error).message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
        <h1 className="text-xl font-bold mb-2">
          {t('settings.chooseUsername', { defaultValue: 'Choose your username' })}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          {t('settings.usernameOnce', {
            defaultValue:
              'Pick a unique username (3–20 English letters, numbers, and _). Your followers will find you by this name.',
          })}
        </p>
        <div className="space-y-2 mb-4">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            {t('settings.username', { defaultValue: 'Username' })}
          </label>
          <Input
            value={value}
            maxLength={USERNAME_MAX_LENGTH}
            onChange={(e) => onChange(e.target.value)}
            placeholder="egx_trader"
          />
          {formatError && <p className="text-xs text-[var(--danger)]">{formatError}</p>}
          {message && !formatError && <p className="text-xs text-[var(--danger)]">{message}</p>}
          {status === 'available' && !formatError && !message && (
            <p className="text-xs text-[var(--success)]">
              {t('settings.usernameAvailable', { defaultValue: 'Username is available' })}
            </p>
          )}
        </div>
        <Button
          onClick={onSubmit}
          disabled={saving || !value || Boolean(formatError) || status === 'taken'}
          className="w-full"
        >
          {saving
            ? t('common.loading', { defaultValue: 'Saving...' })
            : t('settings.saveUsername', { defaultValue: 'Save username' })}
        </Button>
      </div>
    </div>
  );
}

