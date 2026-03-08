import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { TIMEOUTS } from '../../../lib/constants';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import type { ProfileTabProps } from './types';

export function DangerZoneTab({ user, onLogout, setRequestStatus }: ProfileTabProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { t } = useTranslation('common');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [goodbyeOpen, setGoodbyeOpen] = useState(false);
  const [goodbyeName, setGoodbyeName] = useState('');

  const deleteConfirmValid = (() => {
    const n = deleteConfirmText.trim();
    return n === 'حذف' || n.toUpperCase() === 'DELETE';
  })();

  useEffect(() => () => {
    const tId = (window as unknown as { __goodbyeTimeout?: ReturnType<typeof setTimeout> }).__goodbyeTimeout;
    if (tId) clearTimeout(tId);
  }, []);

  const handleDeleteAccount = async () => {
    const confirmNorm = deleteConfirmText.trim().toUpperCase();
    if (confirmNorm !== 'حذف' && confirmNorm !== 'DELETE') return;
    if (!deletePassword || !accessToken) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ confirmText: deleteConfirmText.trim(), password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === 'wrong_password' || data?.message) {
          setDeleteError(data?.message || t('settings.wrongPassword'));
        } else {
          setDeleteError(data?.error || data?.message || 'Failed');
        }
        return;
      }
      setDeleteDialogOpen(false);
      setGoodbyeName(user.fullName || user.username || '');
      setGoodbyeOpen(true);
      const t1 = setTimeout(() => {
        setGoodbyeOpen(false);
        onLogout();
      }, TIMEOUTS.goodbyeDelay);
      (window as unknown as { __goodbyeTimeout?: ReturnType<typeof setTimeout> }).__goodbyeTimeout = t1;
    } catch (err) {
      setDeleteError((err as Error).message || 'Failed');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mb-2">
          <Trash2 className="w-5 h-5 text-[var(--danger)]" />
          {t('settings.dangerZone')}
        </h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          {t('settings.deleteAccountWarning')}
        </p>
        <button
          type="button"
          onClick={() => setDeleteDialogOpen(true)}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--danger)] underline"
        >
          {t('settings.deleteAccountPrompt')}
        </button>
      </div>

      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setDeleteDialogOpen(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center">
              <Trash2 className="w-12 h-12 text-[var(--danger)]" />
            </div>
            <h3 className="text-lg font-bold text-center text-[var(--text-primary)]">{t('settings.deleteTitle')}</h3>
            <p className="text-sm font-medium text-[var(--text-secondary)] mt-2">{t('settings.deleteReadFirst')}</p>
            <p className="text-xs text-[var(--text-muted)] text-center">{t('settings.deleteWarning')}</p>
            <Input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder={t('settings.deleteConfirmPlaceholder')} />
            <Input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder={t('settings.password')} />
            {deleteError && <p className="text-xs text-[var(--danger)]">{deleteError}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="danger" size="md" fullWidth onClick={handleDeleteAccount} disabled={!deleteConfirmValid || !deletePassword || deleteSubmitting} loading={deleteSubmitting}>
                {t('settings.confirmDelete')}
              </Button>
              <Button type="button" variant="secondary" size="md" onClick={() => setDeleteDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {goodbyeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => {
            const tId = (window as unknown as { __goodbyeTimeout?: ReturnType<typeof setTimeout> }).__goodbyeTimeout;
            if (tId) clearTimeout(tId);
            setGoodbyeOpen(false);
            onLogout();
          }}
        >
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xl max-w-sm w-full p-6 text-center space-y-2" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-bold text-[var(--text-primary)]">{t('settings.goodbyeTitle', { name: goodbyeName })}</p>
            <p className="text-sm text-[var(--text-muted)]">{t('settings.goodbyeBody')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
