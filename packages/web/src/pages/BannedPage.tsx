import { useTranslation } from 'react-i18next';
import { TrendingUp, Ban } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function BannedPage() {
  const { t } = useTranslation('common');
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      <header className="w-full border-b border-[var(--border)] px-6 py-4 flex items-center gap-2">
        <TrendingUp className="text-[var(--brand)] w-7 h-7" />
        <span className="text-xl font-bold tracking-tight">
          {t('common.appName', { defaultValue: 'Borsa' })}
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-3xl bg-[var(--danger-bg)] border border-[var(--danger)]/40 flex items-center justify-center">
              <Ban className="w-10 h-10 text-[var(--danger)]" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold">
                {t('banned.title', { defaultValue: 'الحساب محظور' })}
              </h1>
              <p className="text-[var(--text-secondary)] text-base leading-relaxed">
                {t('banned.description', { defaultValue: 'تم حظر حسابك من قِبل فريق الإدارة. إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع الدعم الفني.' })}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 px-6 py-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] text-sm font-medium hover:text-[var(--text-primary)] transition-colors"
            >
              {t('banned.logout', { defaultValue: 'تسجيل الخروج' })}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
