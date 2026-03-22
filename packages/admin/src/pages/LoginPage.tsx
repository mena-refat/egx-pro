import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/adminApi';
import { useAdminStore } from '../store/adminAuthStore';
import { Eye, EyeOff, Lock, Mail, Languages } from 'lucide-react';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState('');
  const setAuth = useAdminStore((s) => s.setAuth);
  const nav     = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body: Record<string, string> = { email, password };
      if (needs2FA) body.code = twoFaCode;
      const res = await adminApi.post('/auth/login', body);
      const { token, admin } = res.data.data;
      setAuth(token, admin);
      nav('/');
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === 'ADMIN_2FA_REQUIRED') {
        setNeeds2FA(true);
        setTwoFaCode('');
      } else if (code === 'INVALID_CREDENTIALS') {
        setError(t('login.invalidCredentials'));
        if (needs2FA) { setNeeds2FA(false); setTwoFaCode(''); }
      } else {
        setError(t('login.loginFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <main className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 items-center justify-center font-bold text-xl text-white shadow-xl shadow-emerald-900/40 mb-4">
            B
          </div>
          <h1 className="text-xl font-bold text-white">{t('login.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('login.subtitle')}</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#111118] border border-white/[0.08] rounded-2xl p-6 space-y-4 shadow-2xl"
        >
          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2.5">
              <span className="text-rose-400">⚠</span> {error}
            </div>
          )}

          {/* Email */}
          {!needs2FA && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">{t('login.email')}</label>
              <div className="relative">
                <Mail size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full ps-9 pe-4 py-2.5 bg-[#0d0d14] border border-white/[0.08] rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  placeholder="admin@borsa.app"
                />
              </div>
            </div>
          )}

          {/* Password */}
          {!needs2FA && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">{t('login.password')}</label>
              <div className="relative">
                <Lock size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} required
                  className="w-full ps-9 pe-10 py-2.5 bg-[#0d0d14] border border-white/[0.08] rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? t('login.hidePassword') : t('login.showPassword')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          )}

          {/* 2FA Step */}
          {needs2FA && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5">
                <span className="text-base">🔐</span>
                <span>{t('login.twoFaPrompt')}</span>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400">{t('login.twoFaCode')}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                  className="w-full py-3 bg-[#0d0d14] border border-white/[0.08] rounded-lg text-lg text-white text-center font-mono tracking-[0.5em] placeholder-slate-700 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  placeholder="● ● ● ● ● ●"
                  maxLength={6}
                />
              </div>
              <button
                type="button"
                onClick={() => { setNeeds2FA(false); setTwoFaCode(''); setError(null); }}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                ← {t('common.back')}
              </button>
            </div>
          )}

          <button
            type="submit" disabled={loading || (needs2FA && twoFaCode.length < 6)}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-semibold text-sm rounded-lg transition-all disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                {t('login.signingIn')}
              </span>
            ) : needs2FA ? t('login.verify') : t('login.signIn')}
          </button>
        </form>

        {/* Language toggle */}
        <div className="mt-4 text-center">
          <button
            onClick={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
            aria-label={i18n.language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors py-2 px-3"
          >
            <Languages size={12} />
            {i18n.language === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>
      </main>
    </div>
  );
}
