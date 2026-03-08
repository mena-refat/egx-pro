import { useState } from 'react';
import { Shield, Smartphone, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';

export default function SecuritySettings() {
  const { i18n } = useTranslation('common');
  const { user, accessToken, setUser } = useAuthStore();
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isRTL = i18n.language.startsWith('ar');

  const startSetup = async () => {
    try {
      const res = await fetch('/api/user/2fa/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setIsSettingUp(true);
      }
    } catch (err) {
      console.error('2FA setup error', err);
    }
  };

  const verifyAndEnable = async () => {
    try {
      const res = await fetch('/api/user/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token, secret }),
      });
      if (res.ok) {
        setSuccess(true);
        setIsSettingUp(false);
        if (user) setUser({ ...user, twoFactorEnabled: true });
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid token');
      }
    } catch (err) {
      console.error('2FA verification error', err);
      setError('Verification failed');
    }
  };

  const disable2FA = async () => {
    if (!confirm(isRTL ? 'هل أنت متأكد من تعطيل المصادقة الثنائية؟' : 'Are you sure you want to disable 2FA?')) return;
    try {
      const res = await fetch('/api/user/2fa/disable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      if (res.ok) {
        if (user) setUser({ ...user, twoFactorEnabled: false });
      }
    } catch (err) {
      console.error('Disable 2FA error', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${user?.twoFactorEnabled ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'}`}>
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold">{isRTL ? 'المصادقة الثنائية (2FA)' : 'Two-Factor Authentication'}</h3>
            <p className="text-sm text-[var(--text-muted)]">
              {user?.twoFactorEnabled 
                ? (isRTL ? 'حسابك محمي بطبقة أمان إضافية' : 'Your account is protected with an extra layer of security')
                : (isRTL ? 'أضف طبقة أمان إضافية لحسابك' : 'Add an extra layer of security to your account')}
            </p>
          </div>
        </div>
        <button
          onClick={user?.twoFactorEnabled ? disable2FA : startSetup}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${user?.twoFactorEnabled ? 'bg-[var(--danger-bg)] text-[var(--danger)] hover:opacity-90' : 'bg-[var(--brand)] text-[var(--text-inverse)] hover:bg-[var(--brand-hover)]'}`}
        >
          {user?.twoFactorEnabled ? (isRTL ? 'تعطيل' : 'Disable') : (isRTL ? 'تفعيل' : 'Enable')}
        </button>
      </div>

      <AnimatePresence>
        {isSettingUp && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
              <button 
                onClick={() => setIsSettingUp(false)}
                className="absolute top-4 right-4 p-2 hover:bg-[var(--bg-card-hover)] rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <Smartphone className="w-12 h-12 text-[var(--brand)] mx-auto mb-4" />
                <h2 className="text-2xl font-bold">{isRTL ? 'إعداد المصادقة الثنائية' : 'Setup 2FA'}</h2>
                <p className="text-[var(--text-muted)] text-sm mt-2">
                  {isRTL ? 'امسح رمز QR باستخدام تطبيق المصادقة (مثل Google Authenticator)' : 'Scan the QR code with your authenticator app (e.g., Google Authenticator)'}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl mx-auto w-48 h-48 mb-6">
                <img src={qrCode} alt="QR Code" className="w-full h-full" referrerPolicy="no-referrer" />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-2">{isRTL ? 'أدخل الرمز المكون من 6 أرقام' : 'Enter 6-digit code'}</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-[var(--brand)] outline-none text-[var(--text-primary)]"
                    placeholder="000000"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-[var(--danger)] text-sm bg-[var(--danger-bg)] p-3 rounded-xl">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={verifyAndEnable}
                  disabled={token.length !== 6}
                  className="w-full py-3 bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-all"
                >
                  {isRTL ? 'تأكيد وتفعيل' : 'Verify and Enable'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {success && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-[var(--success-bg)] border border-[var(--border)] rounded-2xl flex items-center gap-3 text-[var(--success)]"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>{isRTL ? 'تم تفعيل المصادقة الثنائية بنجاح!' : '2FA has been enabled successfully!'}</span>
        </motion.div>
      )}
    </div>
  );
}
