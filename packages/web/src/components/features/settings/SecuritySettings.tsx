import { useState } from 'react';
import { Shield, Smartphone, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useAuthStore } from '../../../store/authStore';
import styles from './SecuritySettings.module.scss';

export default function SecuritySettings() {
  const { t, i18n } = useTranslation('common');
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
      if (import.meta.env.DEV) console.error('2FA setup error', err);
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
        await res.json().catch(() => null);
        setError(t('common.error'));
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('2FA verification error', err);
      setError(t('common.error'));
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
      if (import.meta.env.DEV) console.error('Disable 2FA error', err);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.cardInner}>
          <div className={clsx(styles.iconWrap, user?.twoFactorEnabled ? styles.enabled : styles.disabled)}>
            <Shield className={styles.icon} aria-hidden />
          </div>
          <div>
            <h3 className={styles.title}>{isRTL ? 'المصادقة الثنائية (2FA)' : 'Two-Factor Authentication'}</h3>
            <p className={styles.desc}>
              {user?.twoFactorEnabled
                ? (isRTL ? 'حسابك محمي بطبقة أمان إضافية' : 'Your account is protected with an extra layer of security')
                : (isRTL ? 'أضف طبقة أمان إضافية لحسابك' : 'Add an extra layer of security to your account')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={user?.twoFactorEnabled ? disable2FA : startSetup}
          className={clsx(styles.btnAction, user?.twoFactorEnabled ? styles.disable : styles.enable)}
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
            className={styles.overlay}
          >
            <div className={styles.modal}>
              <button
                type="button"
                onClick={() => setIsSettingUp(false)}
                className={styles.closeBtn}
                aria-label={t('common.close')}
              >
                <X className={styles.closeIcon} aria-hidden />
              </button>

              <div className={styles.modalHeader}>
                <Smartphone className={styles.modalIcon} aria-hidden />
                <h2 className={styles.modalTitle}>{isRTL ? 'إعداد المصادقة الثنائية' : 'Setup 2FA'}</h2>
                <p className={styles.modalDesc}>
                  {isRTL
                    ? 'امسح رمز QR باستخدام تطبيق المصادقة (مثل Google Authenticator)'
                    : 'Scan the QR code with your authenticator app (e.g., Google Authenticator)'}
                </p>
              </div>

              <div className={styles.qrWrap}>
                <img src={qrCode} alt="QR Code" className={styles.qrImg} referrerPolicy="no-referrer" />
              </div>

              <div className={styles.modalBody}>
                <div className={styles.formBlock}>
                  <label className={styles.label} htmlFor="2fa-token">
                    {isRTL ? 'أدخل الرمز المكون من 6 أرقام' : 'Enter 6-digit code'}
                  </label>
                  <input
                    id="2fa-token"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                    className={styles.input}
                    placeholder="000000"
                    aria-label={isRTL ? 'رمز التحقق' : 'Verification code'}
                  />
                </div>

                {error && (
                  <div className={styles.errorBox} role="alert">
                    <AlertCircle className={styles.errorIcon} aria-hidden />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={verifyAndEnable}
                  disabled={token.length !== 6}
                  className={styles.submitBtn}
                >
                  {isRTL ? 'تأكيد وتفعيل' : 'Verify and Enable'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {success && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={styles.successBox}>
          <CheckCircle2 className={styles.successIcon} aria-hidden />
          <span>{isRTL ? 'تم تفعيل المصادقة الثنائية بنجاح!' : '2FA has been enabled successfully!'}</span>
        </motion.div>
      )}
    </div>
  );
}
