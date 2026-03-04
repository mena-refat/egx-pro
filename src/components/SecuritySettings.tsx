import { useState } from 'react';
import { Shield, Smartphone, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

  const isRTL = i18n.language === 'ar';

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
      <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-white/5">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${user?.twoFactorEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-700 text-slate-400'}`}>
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold">{isRTL ? 'المصادقة الثنائية (2FA)' : 'Two-Factor Authentication'}</h3>
            <p className="text-sm text-slate-400">
              {user?.twoFactorEnabled 
                ? (isRTL ? 'حسابك محمي بطبقة أمان إضافية' : 'Your account is protected with an extra layer of security')
                : (isRTL ? 'أضف طبقة أمان إضافية لحسابك' : 'Add an extra layer of security to your account')}
            </p>
          </div>
        </div>
        <button
          onClick={user?.twoFactorEnabled ? disable2FA : startSetup}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${user?.twoFactorEnabled ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-violet-600 text-white hover:bg-violet-500'}`}
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
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
              <button 
                onClick={() => setIsSettingUp(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <Smartphone className="w-12 h-12 text-violet-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold">{isRTL ? 'إعداد المصادقة الثنائية' : 'Setup 2FA'}</h2>
                <p className="text-slate-400 text-sm mt-2">
                  {isRTL ? 'امسح رمز QR باستخدام تطبيق المصادقة (مثل Google Authenticator)' : 'Scan the QR code with your authenticator app (e.g., Google Authenticator)'}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl mx-auto w-48 h-48 mb-6">
                <img src={qrCode} alt="QR Code" className="w-full h-full" referrerPolicy="no-referrer" />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">{isRTL ? 'أدخل الرمز المكون من 6 أرقام' : 'Enter 6-digit code'}</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-violet-500 outline-none"
                    placeholder="000000"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-xl">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={verifyAndEnable}
                  disabled={token.length !== 6}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-all"
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
          className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-500"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>{isRTL ? 'تم تفعيل المصادقة الثنائية بنجاح!' : '2FA has been enabled successfully!'}</span>
        </motion.div>
      )}
    </div>
  );
}
