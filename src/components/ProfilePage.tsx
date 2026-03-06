import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  Copy,
  Lock,
  User,
  CreditCard,
  Gift,
  Award,
  Settings,
  Check,
  TrendingUp,
  Wallet,
  BarChart2,
  Target,
  Shield,
  RotateCcw,
  Zap,
  Sun,
  Moon,
  Monitor,
  Bell,
  LogOut,
  CalendarCheck,
  Crown,
} from 'lucide-react';
import api from '../lib/api';
import { validateChangePassword } from '../lib/validations';
import { AchievementCongratsCard } from './AchievementCongratsCard';
import { SettingsTabContent } from './SettingsTabContent';

// --- Sub-components ---

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative w-11 h-6 rounded-full px-1 transition-colors overflow-hidden flex items-center ${
      checked ? 'bg-[#7c3aed]' : 'bg-[#1f2937]'
    }`}
  >
    <motion.div
      className="w-4 h-4 rounded-full bg-white shadow-sm"
      animate={{ x: checked ? 20 : 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    />
  </button>
);

const Counter = ({ value }: { value: number }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const controls = setInterval(() => {
      setCount(prev => prev < value ? prev + Math.ceil(value / 50) : value);
    }, 20);
    return () => clearInterval(controls);
  }, [value]);
  return <>{count.toLocaleString()}</>;
};

interface Achievement {
  id: string;
  level: 'beginner' | 'growth' | 'pro' | 'legend' | string;
  title: string;
  shortDescription: string;
  longDescription: string;
  completed: boolean;
  date?: string | null;
  progress?: number;
  target?: number;
  route?: string | null;
}

const LEVEL_META: { key: 'beginner' | 'growth' | 'pro' | 'legend'; label: string; title: string; color: string }[] = [
  { key: 'beginner', label: 'الناشئ', title: 'المستوى الأول', color: 'text-[#a78bfa]' },
  { key: 'growth', label: 'المستثمر', title: 'المستوى الثاني', color: 'text-[#60a5fa]' },
  { key: 'pro', label: 'المحترف', title: 'المستوى الثالث', color: 'text-[#fbbf24]' },
  { key: 'legend', label: 'الأسطورة', title: 'المستوى الرابع', color: 'text-[#fb7185]' },
];

function AchievementsSection({ accessToken }: { accessToken: string | null }) {
  const { setUnseenAchievementsCount } = useAuthStore();
  const [items, setItems] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Achievement | null>(null);
  const [unseenQueue, setUnseenQueue] = useState<Array<{ id: string; title: string; shortDescription: string }>>([]);
  const [unseenIndex, setUnseenIndex] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const unseenRes = await fetch('/api/user/unseen-achievements', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const unseenList = unseenRes.ok ? await unseenRes.json() : [];
        if (cancelled) return;

        if (unseenList.length > 0) {
          setUnseenQueue(unseenList);
          setUnseenIndex(0);
          setItems([]);
          setLoading(false);
          return;
        }

        const res = await fetch('/api/user/achievements', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data?.error || 'Failed to load achievements');
        const normalized: Achievement[] = Array.isArray(data)
          ? data.map((a: Record<string, unknown>) => ({
              id: String(a.id ?? ''),
              level: String(a.level ?? ''),
              title: String(a.title ?? ''),
              shortDescription: String(a.shortDescription ?? ''),
              longDescription: String(a.longDescription ?? ''),
              completed: Boolean(a.completed),
              date: a.date ? String(a.date) : undefined,
              progress: typeof a.progress === 'number' ? a.progress : undefined,
              target: typeof a.target === 'number' ? a.target : undefined,
              route: typeof a.route === 'string' ? a.route : undefined,
            })) as Achievement[]
          : [];
        setItems(normalized);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load achievements', err);
          setError('فشل تحميل شارات الإنجاز');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [accessToken]);

  const handleUnseenCardComplete = async () => {
    const next = unseenIndex + 1;
    if (next < unseenQueue.length) {
      setUnseenIndex(next);
      return;
    }
    setUnseenQueue([]);
    setUnseenIndex(0);
    setUnseenAchievementsCount(0);
    try {
      await fetch('/api/user/mark-achievements-seen', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (e) {
      console.error('Mark achievements seen failed', e);
    }
    const res = await fetch('/api/user/achievements', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = res.ok ? await res.json() : [];
    const normalized: Achievement[] = Array.isArray(data)
      ? (data.map((a: Record<string, unknown>) => ({
          id: String(a.id ?? ''),
          level: String(a.level ?? ''),
          title: String(a.title ?? ''),
          shortDescription: String(a.shortDescription ?? ''),
          longDescription: String(a.longDescription ?? ''),
          completed: Boolean(a.completed),
          date: a.date ? String(a.date) : undefined,
          progress: typeof a.progress === 'number' ? a.progress : undefined,
          target: typeof a.target === 'number' ? a.target : undefined,
          route: typeof a.route === 'string' ? a.route : undefined,
        })) as Achievement[])
      : [];
    setItems(normalized);
  };

  if (!accessToken) {
    return (
      <p className="text-sm text-center text-[#9ca3af]">
        قم بتسجيل الدخول لعرض الإنجازات.
      </p>
    );
  }

  const currentUnseen = unseenQueue[unseenIndex];
  if (currentUnseen) {
    return (
      <>
        <AnimatePresence mode="wait">
          <AchievementCongratsCard
            key={currentUnseen.id + String(unseenIndex)}
            title={currentUnseen.title}
            shortDescription={currentUnseen.shortDescription}
            onComplete={handleUnseenCardComplete}
          />
        </AnimatePresence>
        <p className="text-sm text-center text-[#9ca3af]">جاري التحميل...</p>
      </>
    );
  }

  if (loading && !items.length) {
    return (
      <p className="text-sm text-center text-[#9ca3af]">
        جاري تحميل الإنجازات...
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-center text-red-400">
        {error}
      </p>
    );
  }

  if (!items.length) {
    return (
      <p className="text-sm text-center text-[#9ca3af]">
        لا توجد إنجازات حتى الآن. ابدأ بعمل أول تحليل أو إضافة سهم لقائمة المراقبة.
      </p>
    );
  }

  const getProgressPercent = (badge: Achievement) => {
    if (badge.completed) return 100;
    if (typeof badge.progress === 'number' && typeof badge.target === 'number' && badge.target > 0) {
      return Math.max(0, Math.min(100, Math.round((badge.progress / badge.target) * 100)));
    }
    return 0;
  };

  const groups: Record<string, Achievement[]> = { beginner: [], growth: [], pro: [], legend: [] };
  items.forEach((a) => {
    if (groups[a.level]) groups[a.level].push(a);
  });

  return (
    <>
      <div className="space-y-6">
        {LEVEL_META.map((lvl) => {
          const list = groups[lvl.key] || [];
          const completedCount = list.filter((a) => a.completed).length;
          return (
            <div key={lvl.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-bold ${lvl.color}`}>
                  {lvl.title} — {lvl.label}
                </h3>
                <span className="text-[11px] text-[#9ca3af]">{completedCount} من 10 مكتمل</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((badge) => {
                  const completed = badge.completed;
                  const percent = getProgressPercent(badge);
                  return (
                    <motion.button
                      type="button"
                      key={badge.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelected(badge)}
                      className={`p-4 rounded-2xl border text-right shadow-md transition-all ${
                        completed ? 'border-[#7c3aed] bg-[#7c3aed]/10' : 'border-[#374151] bg-[#020617] opacity-80'
                      }`}
                    >
                      <p className="text-base font-bold mb-1 text-[#e5e7eb]">{badge.title}</p>
                      <p className="text-xs text-[#9ca3af] mb-3">{badge.shortDescription}</p>
                      {badge.target != null && (
                        <div>
                          <p className="text-[11px] text-[#9ca3af] mb-1">
                            {badge.progress ?? 0} من {badge.target}
                          </p>
                          <div className="w-full h-1.5 bg-[#111827] rounded-full overflow-hidden">
                            <div className="h-full bg-[#7c3aed]" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-3xl bg-[#020617] border border-[#1f2937] p-6 text-right"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-white">{selected.title}</h3>
                  <p className="text-xs text-[#9ca3af]">
                    المستوى:{' '}
                    {selected.level === 'beginner'
                      ? 'الناشئ'
                      : selected.level === 'growth'
                        ? 'المستثمر'
                        : selected.level === 'pro'
                          ? 'المحترف'
                          : 'الأسطورة'}
                  </p>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="text-[#9ca3af] hover:text-white">
                  <ChevronLeft size={18} />
                </button>
              </div>

              <p className="text-sm text-[#e5e7eb] mb-4 whitespace-pre-line">{selected.longDescription}</p>

              {selected.target != null && (
                <div className="mb-4">
                  <div className="flex justify-between text-[11px] text-[#9ca3af] mb-1">
                    <span>التقدم</span>
                    <span>
                      {selected.progress ?? 0} من {selected.target} مكتمل
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#111827] rounded-full overflow-hidden">
                    <div className="h-full bg-[#7c3aed]" style={{ width: `${getProgressPercent(selected)}%` }} />
                  </div>
                </div>
              )}

              {selected.completed && selected.date && (
                <p className="text-xs text-emerald-400 mb-4">
                  ✓ تم في{' '}
                  {new Date(selected.date).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              )}

              <div className="mt-4 flex justify-end gap-2 flex-wrap">
                {selected.route && !selected.completed && (
                  <a
                    href={selected.route}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
                  >
                    اذهب وحقق التحدي
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="px-4 py-2 rounded-xl text-sm bg-[#111827] border border-[#1f2937] hover:bg-[#1f2937]"
                >
                  فهمت
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SecuritySection({ accessToken }: { accessToken: string | null }) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [lastPasswordChangeAt, setLastPasswordChangeAt] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const [twoFaSecret, setTwoFaSecret] = useState<string | null>(null);
  const [twoFaQr, setTwoFaQr] = useState<string | null>(null);
  const [twoFaToken, setTwoFaToken] = useState('');
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaMessage, setTwoFaMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSecurity = async () => {
      if (!accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/user/security', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to load security info');
        }
        setTwoFactorEnabled(Boolean(data.twoFactorEnabled));
        setLastPasswordChangeAt(data.lastPasswordChangeAt ?? null);
      } catch (err) {
        console.error('Security info load error', err);
        setError('فشل تحميل معلومات الأمان');
      } finally {
        setLoading(false);
      }
    };
    fetchSecurity();
  }, [accessToken]);

  const handleChangePassword = async () => {
    if (!accessToken) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage('من فضلك املأ كل الحقول');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('كلمتا المرور الجديدتان غير متطابقتين');
      return;
    }
    const pwCheck = validateChangePassword(newPassword, {
      email: user?.email ?? undefined,
      username: user?.username ?? undefined,
    });
    if (!pwCheck.ok) {
      setPasswordMessage('message' in pwCheck ? pwCheck.message : '');
      return;
    }
    setChangingPassword(true);
    setPasswordMessage(null);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'فشل تغيير كلمة المرور');
      }
      setPasswordMessage('تم تغيير كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (err) {
      console.error('Change password error', err);
      setPasswordMessage('فشل تغيير كلمة المرور. تأكد من صحة الكلمة الحالية.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleTwoFaSetup = async () => {
    if (!accessToken) return;
    setTwoFaLoading(true);
    setTwoFaMessage(null);
    try {
      const res = await fetch('/api/user/2fa/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'فشل تهيئة 2FA');
      }
      setTwoFaSecret(data.secret);
      setTwoFaQr(data.qrCode);
    } catch (err) {
      console.error('2FA setup error', err);
      setTwoFaMessage('فشل تهيئة المصادقة الثنائية');
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleTwoFaVerify = async () => {
    if (!accessToken || !twoFaSecret || !twoFaToken) return;
    setTwoFaLoading(true);
    setTwoFaMessage(null);
    try {
      const res = await fetch('/api/user/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token: twoFaToken, secret: twoFaSecret }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'فشل تفعيل 2FA');
      }
      setTwoFactorEnabled(true);
      setTwoFaMessage('تم تفعيل المصادقة الثنائية بنجاح');
      setTwoFaToken('');
    } catch (err) {
      console.error('2FA verify error', err);
      setTwoFaMessage('الكود غير صحيح، حاول مرة أخرى');
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleTwoFaDisable = async () => {
    if (!accessToken) return;
    const confirmDisable = window.confirm(
      'هل أنت متأكد من إيقاف المصادقة الثنائية؟ يفضل تركها مفعّلة لحماية حسابك.',
    );
    if (!confirmDisable) return;
    setTwoFaLoading(true);
    setTwoFaMessage(null);
    try {
      const res = await fetch('/api/user/2fa/disable', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'فشل إيقاف 2FA');
      }
      setTwoFactorEnabled(false);
      setTwoFaSecret(null);
      setTwoFaQr(null);
      setTwoFaMessage('تم إيقاف المصادقة الثنائية بنجاح');
    } catch (err) {
      console.error('2FA disable error', err);
      setTwoFaMessage('تعذر إيقاف المصادقة الثنائية الآن');
    } finally {
      setTwoFaLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl border border-[#1f2937] bg-[#111827] shadow-md space-y-6">
      <h3 className="font-bold text-[#9ca3af] mb-2 text-xs flex items-center gap-2">
        <Shield className="w-4 h-4" />
        <span className="uppercase">الأمان والخصوصية</span>
      </h3>
      {loading ? (
        <p className="text-xs text-[#9ca3af]">جاري تحميل معلومات الأمان...</p>
      ) : error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : (
        <>
          {/* كلمة المرور — ملخص + نموذج عند الضغط على "تغيير" */}
          <div className="space-y-3 border-b border-[#1f2937] pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#e5e7eb]">كلمة المرور</p>
                <p className="text-[11px] text-[#9ca3af]">
                  آخر تغيير:{' '}
                  {lastPasswordChangeAt
                    ? new Date(lastPasswordChangeAt).toLocaleDateString('ar-EG')
                    : 'لم تتغير بعد'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordForm((v) => !v)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-[#374151] text-[#e5e7eb] hover:bg-[#1f2937]"
              >
                {showPasswordForm ? 'إلغاء' : 'تغيير'}
              </button>
            </div>
            {showPasswordForm && (
              <div className="space-y-3 mt-3">
                <div className="grid md:grid-cols-3 gap-3">
                  <input
                    type="password"
                    placeholder="كلمة المرور الحالية"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-[#020617] border border-[#1f2937] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
                  />
                  <input
                    type="password"
                    placeholder="كلمة المرور الجديدة"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-[#020617] border border-[#1f2937] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
                  />
                  <input
                    type="password"
                    placeholder="تأكيد كلمة المرور الجديدة"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-[#020617] border border-[#1f2937] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#7c3aed] hover:bg-[#6d28d9] text-white disabled:opacity-60"
                >
                  {changingPassword ? 'جارٍ التغيير...' : 'تحديث كلمة المرور'}
                </button>
                {passwordMessage && (
                  <p className="text-[11px] text-[#e5e7eb] mt-1">{passwordMessage}</p>
                )}
              </div>
            )}
          </div>

          {/* 2FA */}
          <div className="space-y-3 border-b border-[#1f2937] pb-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#e5e7eb]">
                المصادقة الثنائية (2FA)
              </p>
              <span className="text-[11px] text-[#9ca3af]">
                {twoFactorEnabled ? 'مفعّلة' : 'غير مفعّلة'}
              </span>
            </div>

            {!twoFactorEnabled ? (
              <div className="space-y-3">
                <p className="text-[11px] text-[#9ca3af]">
                  ننصحك بتفعيل 2FA لزيادة حماية حسابك. ستحتاج لتطبيق مثل Google
                  Authenticator أو Authy.
                </p>
                {!twoFaSecret ? (
                  <button
                    type="button"
                    onClick={handleTwoFaSetup}
                    disabled={twoFaLoading}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#7c3aed] hover:bg-[#6d28d9] text-white disabled:opacity-60"
                  >
                    {twoFaLoading ? 'جارٍ التهيئة...' : 'بدء تفعيل 2FA'}
                  </button>
                ) : (
                  <div className="space-y-3">
                    {twoFaQr && (
                      <div className="inline-block bg-white p-2 rounded-xl">
                        <img
                          src={twoFaQr}
                          alt="2FA QR"
                          className="w-32 h-32 object-contain"
                        />
                      </div>
                    )}
                    <p className="text-[11px] text-[#9ca3af]">
                      امسح الكود باستخدام تطبيق المصادقة ثم أدخل الكود المكون من 6 أرقام.
                    </p>
                    <input
                      type="text"
                      maxLength={6}
                      value={twoFaToken}
                      onChange={(e) =>
                        setTwoFaToken(e.target.value.replace(/\D/g, ''))
                      }
                      className="bg-[#020617] border border-[#1f2937] rounded-xl px-3 py-2 text-sm tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
                      placeholder="000000"
                    />
                    <button
                      type="button"
                      onClick={handleTwoFaVerify}
                      disabled={twoFaLoading || twoFaToken.length !== 6}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-white disabled:opacity-60"
                    >
                      {twoFaLoading ? 'جارٍ التفعيل...' : 'تأكيد التفعيل'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-[#9ca3af]">
                  المصادقة الثنائية مفعّلة لحسابك. سيُطلب منك كود من تطبيق المصادقة عند تسجيل
                  الدخول.
                </p>
                <button
                  type="button"
                  onClick={handleTwoFaDisable}
                  disabled={twoFaLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/40 hover:bg-[#ef4444]/20 disabled:opacity-60"
                >
                  {twoFaLoading ? 'جارٍ الإيقاف...' : 'إيقاف المصادقة الثنائية'}
                </button>
              </div>
            )}

            {twoFaMessage && (
              <p className="text-[11px] text-[#e5e7eb] mt-1">{twoFaMessage}</p>
            )}
          </div>

        </>
      )}
    </div>
  );
}
type Plan = 'free' | 'pro' | 'annual';

interface PlanInfo {
  plan: Plan;
  subscriptionEndsAt: string | null;
  analysis: {
    month: string;
    used: number;
    quota: number;
  };
  referralPro?: {
    daysRemaining: number;
    expiresAt: string | null;
  };
}

function SubscriptionSection() {
  const [info, setInfo] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  // السنوي يبقى selected افتراضياً
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>('annual');
  const [discountCode, setDiscountCode] = useState('');
  const [discountMessage, setDiscountMessage] = useState<string | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [discountedPrices, setDiscountedPrices] = useState<{
    pro?: number;
    annual?: number;
  }>({});
  const [validatingCode, setValidatingCode] = useState(false);

  const isRTL = typeof document !== 'undefined' ? document.documentElement.dir === 'rtl' : true;
  // نستخدم أرقام إنجلش في كل الأحوال
  const locale = 'en-US';

  useEffect(() => {
    const fetchPlan = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/billing/plan');
        setInfo(res.data);
      } catch (err) {
        console.error('Billing /plan load error', err);
        setError('تعذر تحميل خطة الاشتراك حالياً. حاول مرة أخرى بعد قليل.');
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, []);

  const basePrices: Record<Plan, number> = {
    free: 0,
    pro: 149,
    annual: 1399,
  };

  const handleUpgrade = async (plan: Plan) => {
    setUpgrading(true);
    setError(null);
    try {
      const res = await api.post('/billing/upgrade', {
        plan,
        discountCode: discountCode || undefined,
      });
      const updated = res.data;
      setInfo((prev) =>
        prev
          ? {
              ...prev,
              plan: updated.subscriptionPlan as Plan,
              subscriptionEndsAt: updated.subscriptionEndsAt,
            }
          : prev,
      );
      setDiscountMessage('تم ترقية الاشتراك بنجاح.');
    } catch (err) {
      console.error('Billing /upgrade error', err);
      setError('تعذر تنفيذ الترقية الآن. حاول مرة أخرى لاحقاً.');
    } finally {
      setUpgrading(false);
    }
  };

  const handleValidateDiscount = async () => {
    if (!selectedPlan || selectedPlan === 'free' || !discountCode.trim()) {
      setDiscountError('من فضلك اختر خطة مدفوعة واكتب كود الخصم');
      setDiscountMessage(null);
      return;
    }
    setValidatingCode(true);
    setDiscountError(null);
    setDiscountMessage(null);
    try {
      const res = await api.post('/billing/discount/validate', {
        code: discountCode.trim(),
        plan: selectedPlan,
      });
      const data = res.data;
      if (!data.valid) {
        throw new Error(data?.error || 'الكود غير صحيح أو منتهي');
      }
      const basePrice = data.basePrice as number;
      const finalPrice = data.finalPrice as number;
      const discountAmount = data.discountAmount as number;
      setDiscountedPrices((prev) => ({
        ...prev,
        [selectedPlan]: finalPrice,
      }));
      const percent = Math.round((discountAmount / basePrice) * 100);
      setDiscountMessage(
        `تم تطبيق خصم ${percent}% — وفرت ${discountAmount.toLocaleString(locale)} جنيه`,
      );
    } catch (err) {
      console.error('Discount validate error', err);
      setDiscountError('الكود غير صحيح أو منتهي');
      setDiscountedPrices({});
    } finally {
      setValidatingCode(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 rounded-2xl border border-[#7c3aed] bg-gradient-to-br from-[#111827] to-[#1f2937] shadow-md">
        <p className="text-center text-sm text-[#9ca3af]">جاري تحميل الخطة...</p>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="p-6 rounded-2xl border border-[#7c3aed] bg-gradient-to-br from-[#111827] to-[#1f2937] shadow-md">
        <p className="text-center text-sm text-red-400">
          {error || 'فشل تحميل بيانات الاشتراك'}
        </p>
      </div>
    );
  }

  const { plan, analysis, subscriptionEndsAt } = info;
  const isFree = plan === 'free';
  const quota = Number.isFinite(analysis.quota) ? analysis.quota : null;
  const referralPro = info.referralPro;

  const proPrice = discountedPrices.pro ?? basePrices.pro;
  const annualPrice = discountedPrices.annual ?? basePrices.annual;

  const monthlyCostAnnualEquivalent = Math.round(annualPrice / 12);
  const savingAgainstMonthly = basePrices.pro * 12 - annualPrice;
  const savingPercent =
    basePrices.pro * 12 > 0
      ? Math.round((savingAgainstMonthly / (basePrices.pro * 12)) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl border border-[#1f2937] bg-gradient-to-br from-[#020617] to-[#111827] shadow-md">
        <h3 className="font-bold mb-2 text-lg">
          الخطة الحالية:{' '}
          <span className="text-[#fbbf24]">
            {plan === 'free' ? 'مجانية' : plan === 'pro' ? 'Pro شهرية' : 'Pro سنوية'}
          </span>
        </h3>
        {subscriptionEndsAt && !isFree && (
          <p className="text-xs text-[#9ca3af] mb-2">
            يتجدد في{' '}
            {new Date(subscriptionEndsAt).toLocaleDateString('ar-EG')}
          </p>
        )}
        <div className="mt-4">
          <p className="text-sm text-[#9ca3af] mb-2">
            {quota && isFree
              ? `أنت استخدمت ${analysis.used} من أصل ${quota} تحليلات هذا الشهر.`
              : 'استخدام تحليلات الذكاء الاصطناعي هذا الشهر:'}
          </p>
          <div className="w-full h-2 bg-[#1f2937] rounded-full overflow-hidden mb-2">
            <div
              className={`h-full ${quota && isFree && analysis.used >= quota ? 'bg-red-500' : quota && isFree && analysis.used >= 2 ? 'bg-amber-500' : 'bg-[#7c3aed]'}`}
              style={{
                width: quota
                  ? `${Math.min((analysis.used / quota) * 100, 100)}%`
                  : '100%',
              }}
            />
          </div>
          {!quota && (
            <p className="text-xs text-[#9ca3af]">
              {`${analysis.used} تحليل هذا الشهر (غير محدود)`}
            </p>
          )}
        </div>
        {error && (
          <p className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-2">
            {error}
          </p>
        )}
      </div>

      {referralPro && referralPro.daysRemaining > 0 && referralPro.expiresAt && (
        <div className="p-4 rounded-2xl border border-[#1f2937] bg-[#020617] flex items-center gap-3">
          <Gift className="w-5 h-5 text-[#fbbf24]" />
          <div>
            <p className="text-sm font-semibold text-white">شهر Pro مجاني من الدعوات</p>
            <p className="text-xs text-[#9ca3af]">
              ينتهي بعد {referralPro.daysRemaining} يوم
            </p>
          </div>
        </div>
      )}

      {/* Plans: دائماً بالترتيب Free → Pro → Annual */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {(['free', 'pro', 'annual'] as Plan[]).map((p) => {
          if (p === 'free') {
            return (
              <div
                key="free"
                className="p-5 rounded-2xl border border-[#1f2937] bg-[#020617] text-right space-y-3 opacity-90"
              >
                <h4 className="font-bold text-sm text-[#e5e7eb]">ابدأ مجاناً</h4>
                <p className="text-2xl font-extrabold text-white">
                  0 <span className="text-xs text-[#9ca3af]">جنيه</span>
                </p>
                <ul className="space-y-1 mt-1 text-[11px] text-[#9ca3af]">
                  {[
                    '3 تحليلات ذكاء اصطناعي شهرياً',
                    'أسعار حية للأسهم',
                    'محفظة أساسية',
                    'قائمة مراقبة (20 سهم)',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-[#6b7280]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  disabled
                  className="mt-3 w-full text-xs font-bold rounded-xl py-2 border border-[#374151] text-[#9ca3af] cursor-default bg-[#020617]"
                >
                  {plan === 'free' ? 'خطتك الحالية' : 'الخطة المجانية'}
                </button>
              </div>
            );
          }

          if (p === 'pro') {
            const isCurrent = plan === 'pro';
            return (
              <button
                type="button"
                key="pro"
                onClick={() => setSelectedPlan('pro')}
                className={`relative p-6 rounded-2xl border text-right space-y-3 transition-all transform lg:scale-105 ${
                  selectedPlan === 'pro'
                    ? 'border-[#7c3aed] bg-gradient-to-br from-[#020617] to-[#111827] shadow-xl shadow-[#7c3aed]/40'
                    : 'border-[#1f2937] bg-[#020617] hover:border-[#4b5563]'
                }`}
              >
                <span className="absolute -top-3 left-3 text-[10px] px-2 py-0.5 rounded-full bg-[#7c3aed] text-white font-bold shadow">
                  الأكثر شعبية
                </span>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm text-[#e5e7eb]">EGX Pro</h4>
                  {isCurrent && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      الخطة الحالية
                    </span>
                  )}
                </div>
                <p className="text-2xl font-extrabold text-white">
                  {proPrice.toLocaleString(locale)}{' '}
                  <span className="text-xs text-[#9ca3af]">جنيه / شهر</span>
                </p>
                <p className="text-[11px] text-[#9ca3af]">
                  أو وفّر {savingPercent.toLocaleString(locale)}% مع الخطة السنوية
                </p>
                <ul className="space-y-1 mt-1 text-[11px] text-[#e5e7eb]">
                  {[
                    'تحليلات ذكاء اصطناعي غير محدودة',
                    'تقارير مفصلة بالعربي (شراء / بيع / انتظار)',
                    'كل مميزات التطبيق',
                    'قائمة مراقبة غير محدودة',
                    'تنبيهات فورية للأسهم',
                    'أولوية في الدعم',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-[#a855f7]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={isCurrent || plan === 'annual' || upgrading}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpgrade('pro');
                  }}
                  className={`mt-3 w-full text-xs font-bold rounded-xl py-2 ${
                    isCurrent || plan === 'annual'
                      ? 'bg-[#111827] text-[#9ca3af] border border-[#374151] cursor-not-allowed'
                      : 'bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow shadow-[#7c3aed]/40'
                  } disabled:opacity-60`}
                >
                  {isCurrent
                    ? 'مشترك بالفعل في Pro'
                    : plan === 'annual'
                    ? 'مغطى بالخطة السنوية'
                    : upgrading
                    ? 'جارٍ الترقية...'
                    : 'اشترك في Pro'}
                </button>
              </button>
            );
          }

          // annual
          const isCurrentAnnual = plan === 'annual';
          return (
            <button
              type="button"
              key="annual"
              onClick={() => setSelectedPlan('annual')}
              className={`relative p-5 rounded-2xl border text-right space-y-3 transition-all ${
                selectedPlan === 'annual'
                  ? 'border-amber-400 bg-gradient-to-br from-[#111827] via-[#020617] to-[#1f2937] shadow-xl shadow-amber-400/30'
                  : 'border-[#4b5563] bg-gradient-to-br from-[#111827] to-[#020617]'
              }`}
            >
              <span className="absolute -top-3 left-3 text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-black font-bold shadow">
                الأوفر
              </span>
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-bold text-sm text-white">EGX Pro سنوي</h4>
                {isCurrentAnnual && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    الخطة الحالية
                  </span>
                )}
              </div>
              <p className="text-2xl font-extrabold text-white">
                {annualPrice.toLocaleString(locale)}{' '}
                <span className="text-xs text-[#e5e7eb]">جنيه / سنة</span>
              </p>
              <p className="text-[11px] text-[#e5e7eb]">
                يعادل {monthlyCostAnnualEquivalent.toLocaleString(locale)} جنيه / شهر فقط
              </p>
              <p className="text-[11px] text-emerald-400">
                وفّر {savingAgainstMonthly.toLocaleString(locale)} جنيه مقارنة بالشهري
              </p>
              <ul className="space-y-1 mt-1 text-[11px] text-[#e5e7eb]">
                {[
                  'تحليلات ذكاء اصطناعي غير محدودة',
                  'تقارير مفصلة بالعربي (شراء / بيع / انتظار)',
                  'كل مميزات التطبيق',
                  'قائمة مراقبة غير محدودة',
                  'تنبيهات فورية للأسهم',
                  'أولوية في الدعم',
                  'أفضل قيمة على المدى الطويل',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-[#facc15]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={isCurrentAnnual || upgrading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpgrade('annual');
                }}
                className={`mt-3 w-full text-xs font-bold rounded-xl py-2 ${
                  isCurrentAnnual
                    ? 'bg-[#111827] text-[#e5e7eb] border border-amber-400/50 cursor-not-allowed'
                    : 'bg-amber-400 hover:bg-amber-300 text-black shadow shadow-amber-400/50'
                } disabled:opacity-60`}
              >
                {isCurrentAnnual
                  ? 'مشترك بالفعل في السنوي'
                  : upgrading
                  ? 'جارٍ الترقية...'
                  : 'اشترك في السنوي'}
              </button>
            </button>
          );
        })}
      </div>

      {/* Trust row */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-[11px] text-[#9ca3af] mt-1">
        <div className="flex items-center gap-2">
          <Shield className="w-3 h-3 text-[#6b7280]" />
          <span>دفع آمن ومشفر</span>
        </div>
        <div className="flex items-center gap-2">
          <RotateCcw className="w-3 h-3 text-[#6b7280]" />
          <span>إلغاء في أي وقت</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-[#6b7280]" />
          <span>تفعيل فوري</span>
        </div>
      </div>

      {/* Discount code */}
      <div className="mt-4 p-4 rounded-2xl border border-dashed border-[#374151] bg-[#020617] space-y-3">
        <p className="text-sm font-medium text-[#e5e7eb]">
          عندك كود خصم؟ ادخله وشوف كم هتوفر
        </p>
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <input
            type="text"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
            placeholder="مثال: EGX-SAVE20"
            className="flex-1 bg-[#020617] border border-[#1f2937] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed] tracking-[0.15em] text-center md:text-right"
          />
          <button
            type="button"
            onClick={handleValidateDiscount}
            disabled={validatingCode}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#7c3aed] hover:bg-[#6d28d9] text-white disabled:opacity-60"
          >
            {validatingCode ? 'جاري التحقق...' : 'تطبيق الكود'}
          </button>
        </div>
        {discountMessage && (
          <p className="text-[11px] text-emerald-400">{discountMessage}</p>
        )}
        {discountError && (
          <p className="text-[11px] text-red-400">{discountError}</p>
        )}
      </div>
    </div>
  );
}

interface UserProfile {
  id: string;
  createdAt?: string;
  email?: string;
  phone?: string;
  fullName: string;
  username?: string | null;
  riskTolerance: string;
  investmentHorizon: number;
  monthlyBudget: number;
  shariaMode: boolean;
  islamicMode?: boolean;
  onboardingCompleted: boolean;
  interestedSectors: string[];
  twoFactorEnabled: boolean;
  language: string;
  theme: string;
  subscriptionPlan?: 'free' | 'pro' | 'annual';
  subscriptionEndsAt?: string | null;
  avatarUrl?: string | null;
  notifySignals?: boolean;
  notifyPortfolio?: boolean;
  notifyNews?: boolean;
  notifyAchievements?: boolean;
  notifyGoals?: boolean;
  lastPasswordChangeAt?: string | null;
  lastUsernameChangeAt?: string | null;
  userTitle?: string;
}

interface ProfileStats {
  analysesCount: number;
  watchlistCount: number;
  portfolioCount: number;
  portfolioValue: number;
  daysSinceJoined: number;
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation('common');
  const { user: authUser, accessToken, updateUser, logout, unseenAchievementsCount, setUnseenAchievementsCount } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState<UserProfile | null>(authUser as UserProfile | null);

  useEffect(() => {
    const tab = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null;
    if (tab && ['overview', 'subscription', 'referral', 'achievements', 'settings'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);
  const [loading, setLoading] = useState(!authUser);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [fullNameInput, setFullNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [completionData, setCompletionData] = useState<{ percentage: number; missing: { field: string; route: string }[] } | null>(null);
  
  useEffect(() => {
    if (authUser) {
      setUser(authUser as UserProfile);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.ok) {
          const data: UserProfile = await response.json();
          setUser(data);
        }
      } catch (error) {
        console.error('Failed to fetch profile', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [authUser, accessToken]);

  useEffect(() => {
    if (!user) return;
    setFullNameInput(user.fullName || '');
    setPhoneInput(user.phone || '');
    setUsernameInput(user.username || '');
  }, [user]);

  const fetchStats = async () => {
    if (!accessToken) return;
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await fetch('/api/user/profile/stats', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        throw new Error('Failed to load stats');
      }
      const data: ProfileStats = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to load profile stats', err);
      setStatsError('فشل تحميل إحصائيات الملف الشخصي');
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const fetchCompletion = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/profile/completion', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) {
        const data = await res.json();
        setCompletionData({ percentage: data.percentage ?? 0, missing: data.missing ?? [] });
      }
    } catch {
      setCompletionData(null);
    }
  }, [accessToken]);

  useEffect(() => {
    if (activeTab === 'overview') fetchCompletion();
  }, [activeTab, fetchCompletion]);

  useEffect(() => {
    if (!accessToken) return;
    if (!usernameInput || usernameInput === (user?.username || '')) {
      setUsernameStatus('idle');
      setUsernameMessage(null);
      return;
    }
    const handle = setTimeout(async () => {
      setUsernameStatus('checking');
      setUsernameMessage(null);
      try {
        const res = await fetch(
          `/api/user/username/check?username=${encodeURIComponent(usernameInput)}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Invalid username');
        }
        if (data.available) {
          setUsernameStatus('available');
          setUsernameMessage('اسم المستخدم متاح');
        } else {
          setUsernameStatus('taken');
          setUsernameMessage('هذا الاسم مستخدم، جرب اسماً آخر');
        }
      } catch (err) {
        console.error('Username check failed', err);
        setUsernameStatus('error');
        setUsernameMessage('تعذر التحقق من اسم المستخدم الآن');
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [usernameInput, user?.username, accessToken]);

  const updateProfile = async (
    data: Partial<UserProfile>,
    messages?: { success?: string; error?: string }
  ) => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const message = body?.error || messages?.error || 'فشل حفظ التغييرات';
        setRequestStatus({ type: 'error', message });
        throw new Error(message);
      }
      const updatedUser: UserProfile = body;
      setUser(updatedUser);
      updateUser(updatedUser);
      if (messages?.success) {
        setRequestStatus({ type: 'success', message: messages.success });
      }
      // refresh stats that depend on user activity/profile
      fetchStats();
      // refresh completion so header + overview hide progress when 100%
      fetchCompletion();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('profile-completion-changed'));
    } catch (error) {
      console.error('Failed to update profile', error);
      if (!messages?.error) {
        setRequestStatus({
          type: 'error',
          message: 'حدث خطأ أثناء حفظ التغييرات',
        });
      }
      throw error;
    }
  };

  const saveField = async (field: 'fullName' | 'phone' | 'username') => {
    if (!user) return;
    try {
      setSavingField(field);
      if (field === 'fullName') {
        if (fullNameInput === (user.fullName || '')) return;
        await updateProfile(
          { fullName: fullNameInput },
          { success: 'تم تحديث الاسم بالكامل بنجاح' }
        );
      } else if (field === 'phone') {
        if (phoneInput === (user.phone || '')) return;

        const digitsOnly = phoneInput.replace(/\D/g, '');
        let validationError: string | null = null;
        if (!digitsOnly) {
          validationError = i18n.language === 'ar' ? 'رقم الموبايل مطلوب' : 'Phone number is required';
        } else if (digitsOnly.length !== 11) {
          validationError = i18n.language === 'ar' ? 'رقم الموبايل لازم يكون 11 رقم' : 'Phone number must be 11 digits';
        } else if (!/^01[0125][0-9]{8}$/.test(digitsOnly)) {
          validationError = i18n.language === 'ar' ? 'رقم الموبايل غير صحيح' : 'Invalid Egyptian phone number';
        }

        if (validationError) {
          setPhoneError(validationError);
          setSavingField(null);
          return;
        }

        setPhoneError(null);
        await updateProfile(
          { phone: digitsOnly },
          { success: 'تم تحديث رقم الموبايل بنجاح' }
        );
      } else if (field === 'username') {
        if (usernameInput === (user.username || '')) return;
        if (usernameStatus !== 'available' && usernameInput) return;
        await updateProfile(
          { username: usernameInput || null },
          { success: 'تم تحديث اسم المستخدم بنجاح' }
        );
      }
    } finally {
      setSavingField(null);
    }
  };

  const levelLabel = (userTitle?: string | null) => {
    if (userTitle === 'الأسطورة' || userTitle === 'أسطورة') return t('overview.levelLegend');
    if (userTitle === 'المحترف' || userTitle === 'محترف') return t('overview.levelPro');
    if (userTitle === 'المستثمر' || userTitle === 'مستثمر') return t('overview.levelInvestor');
    return t('overview.levelBeginner');
  };

  const tabs = [
    { id: 'overview', label: t('overview.tabLabel'), icon: User },
    { id: 'subscription', label: 'الاشتراك', icon: CreditCard },
    { id: 'referral', label: 'الدعوات', icon: Gift },
  { id: 'achievements', label: t('achievements.tabLabel'), icon: Award, notification: unseenAchievementsCount > 0 },
    { id: 'settings', label: t('settings.tabLabel'), icon: Settings },
  ];

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="p-6 text-center">جاري التحميل...</div>;
  if (!user) return <div className="p-6 text-center">فشل تحميل الملف الشخصي</div>;

  return (
    <div className="p-6 space-y-6 bg-[#0a0f1e] text-[#f9fafb] min-h-screen" dir="rtl">
      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-[#7c3aed] text-white shadow-lg scale-105' 
                : 'bg-[#111827] text-[#9ca3af] hover:bg-[#1f2937]'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.notification && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" style={{ width: 8, height: 8, minWidth: 8, minHeight: 8 }} />}
            {activeTab === tab.id && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Section 1 — User info card */}
              <div className="p-6 rounded-2xl border border-[#1f2937] bg-[#111827] shadow-md">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-violet-600 flex items-center justify-center text-2xl font-bold text-white shrink-0">
                    {(user.fullName || user.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-[#f9fafb]">{user.fullName || '—'}</h2>
                      <span className="text-sm text-[#9ca3af]">
                        {t('overview.level')} {levelLabel(user.userTitle)}
                      </span>
                    </div>
                    {user.username && <p className="text-[#9ca3af] text-sm mt-0.5">@{user.username}</p>}
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        user.subscriptionPlan === 'annual' || user.plan === 'yearly'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : user.subscriptionPlan === 'pro' || user.subscriptionPlan === 'annual' || user.plan === 'pro'
                            ? 'bg-violet-500/20 text-violet-400 border-violet-500/30'
                            : 'bg-[#1f2937] text-[#e5e7eb] border-[#374151]'
                      }`}>
                        {(user.subscriptionPlan === 'pro' || user.subscriptionPlan === 'annual' || user.plan === 'pro' || user.plan === 'yearly') && <Crown className="w-3.5 h-3.5" />}
                        {user.subscriptionPlan === 'annual' || user.plan === 'yearly' ? t('overview.planYearly') : user.subscriptionPlan === 'pro' || user.plan === 'pro' ? t('overview.planPro') : t('overview.planFree')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile completion bar — only when < 100% */}
              {completionData && completionData.percentage < 100 && (
                <div className="p-6 rounded-2xl border border-[#1f2937] bg-[#111827] shadow-md">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-[#e5e7eb]">{t('overview.completeProfile')}</span>
                    <span className="font-bold text-violet-400">{completionData.percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#1f2937] rounded-full overflow-hidden mb-4">
                    <motion.div
                      className="h-full bg-violet-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${completionData.percentage}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-xs text-[#9ca3af] mb-2">{t('overview.missingItems')}</p>
                  <div className="flex flex-wrap gap-2">
                    {completionData.missing.map((m) => {
                      const label =
                        m.field === 'email' ? t('overview.missingEmail')
                        : m.field === 'phone' ? t('overview.missingPhone')
                        : m.field === 'username' ? t('overview.missingUsername')
                        : m.field === 'goal' ? t('overview.missingGoal')
                        : t('overview.missingWatchlist');
                      return (
                        <button
                          key={m.field}
                          type="button"
                          onClick={() => {
                            if (m.route === '/profile?tab=settings') {
                              setActiveTab('settings');
                              if (typeof window !== 'undefined') window.history.pushState(null, '', '/profile?tab=settings');
                            } else {
                              window.location.href = m.route;
                            }
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/30 transition-colors"
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stats cards — 4 in a row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: t('overview.statsAnalyses'), value: stats?.analysesCount ?? 0, icon: BarChart2 },
                  { label: t('overview.statsStocks'), value: stats?.watchlistCount ?? 0, icon: TrendingUp },
                  { label: t('overview.statsDays'), value: stats?.daysSinceJoined ?? 0, icon: CalendarCheck },
                  { label: t('overview.statsPortfolio'), value: Math.round(stats?.portfolioValue ?? 0), icon: Wallet },
                ].map((stat, i) => (
                  <div key={i} className="p-4 rounded-2xl border border-[#1f2937] bg-[#111827] text-center shadow-md">
                    <stat.icon
                      className={`mx-auto mb-2 ${stat.value > 0 ? 'text-violet-500' : 'text-[#6b7280]'}`}
                      size={24}
                    />
                    <p className="text-[#9ca3af] text-xs mb-1">{stat.label}</p>
                    <p className={`text-lg font-bold ${stat.value > 0 ? 'text-violet-400' : 'text-[#6b7280]'}`}>
                      <Counter value={stat.value} />
                    </p>
                  </div>
                ))}
              </div>
              {statsError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-2">
                  {statsError}
                </p>
              )}
            </div>
          )}

          {activeTab === 'subscription' && (
            <SubscriptionSection />
          )}

          {activeTab === 'referral' && (
            <ReferralSection copied={copied} onCopy={handleCopy} />
          )}

          {activeTab === 'achievements' && (
            <AchievementsSection accessToken={accessToken} />
          )}

          {activeTab === 'settings' && user && (
            <>
              {requestStatus && (
                <div
                  className={`p-3 rounded-xl text-sm mb-4 ${
                    requestStatus.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : 'bg-red-500/10 text-red-300 border border-red-500/30'
                  }`}
                >
                  {requestStatus.message}
                </div>
              )}
              <SettingsTabContent
                user={user}
                accessToken={accessToken}
                onUpdateProfile={updateProfile}
                onLogout={logout}
                setRequestStatus={setRequestStatus}
              />
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ReferralSection({ copied, onCopy }: { copied: boolean; onCopy: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [goal, setGoal] = useState(5);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [friends, setFriends] = useState<{ id: string; name: string | null; order: number }[]>([]);
  const [weeklyJoinedCount, setWeeklyJoinedCount] = useState(0);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [stepsCompleted, setStepsCompleted] = useState(0);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const previousTotalReferralsRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchReferral = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/user/referral');
        const data = res.data;
        setCode(data.code);
        setCompletedCount(data.completedCount ?? 0);
        setGoal(data.goal ?? 5);
        setRewardClaimed(Boolean(data.rewardClaimed));
        setFriends(Array.isArray(data.friends) ? data.friends : []);
        setWeeklyJoinedCount(data.weeklyJoinedCount ?? 0);
        const total = data.totalReferrals ?? (data.completedCount ?? 0);
        setTotalReferrals(total);

        // Initial load: just set steps from modulo, لا نعمل احتفال هنا
        const goalValue = typeof data.goal === 'number' && data.goal > 0 ? data.goal : 5;
        const completedSteps = goalValue > 0 ? total % goalValue : 0;
        setStepsCompleted(completedSteps);
        previousTotalReferralsRef.current = total;
      } catch (err) {
        console.error('Referral load error', err);
        setError('فشل تحميل بيانات الدعوات');
      } finally {
        setLoading(false);
      }
    };
    fetchReferral();
  }, []);

  // When totalReferrals changes (e.g. via live updates in future), handle celebration logic
  useEffect(() => {
    const prev = previousTotalReferralsRef.current;
    if (prev === null) return;

    if (totalReferrals > prev && totalReferrals % goal === 0 && goal > 0) {
      // Completed a full cycle: temporarily show all 5 steps + celebration
      setIsCelebrating(true);
      setStepsCompleted(goal);
      setMessage('مبروك! ربحت 30 يوم Pro مجاناً');

      const timeout = setTimeout(() => {
        setIsCelebrating(false);
        setStepsCompleted(totalReferrals % goal);
      }, 2000);

      return () => clearTimeout(timeout);
    }

    // Normal update: just reflect modulo without celebration
    if (!isCelebrating && goal > 0) {
      setStepsCompleted(totalReferrals % goal);
    }
  }, [totalReferrals, goal, isCelebrating]);

  const handleCopyCode = () => {
    if (!code) return;
    navigator.clipboard
      .writeText(code)
      .then(() => onCopy())
      .catch((err) => console.error('Clipboard error', err));
  };

  const handleShare = async () => {
    if (!code) return;
    const url = `${window.location.origin}?ref=${encodeURIComponent(code)}`;
    const text = `جرّب EGX Pro لمتابعة البورصة المصرية. كود الدعوة الخاص بي: ${code}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'EGX Pro', text, url });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setMessage('تم نسخ رابط الدعوة');
      } catch (err) {
        console.error('Copy link failed', err);
        setMessage('تعذر نسخ رابط الدعوة');
      }
    }
  };

  const handleRedeem = async () => {
    setRedeeming(true);
    setMessage(null);
    setError(null);
    try {
      const res = await api.post('/user/referral/redeem');
      const data = res.data;
      setRewardClaimed(true);
      setMessage('مبروك! تم إضافة شهر Pro مجاني إلى حسابك');
    } catch (err) {
      console.error('Redeem referral error', err);
      setError('تعذر تفعيل المكافأة الآن');
    } finally {
      setRedeeming(false);
    }
  };

  const progressPercent = goal > 0 ? Math.min(100, Math.round((completedCount / goal) * 100)) : 0;

  if (loading) {
    return (
      <div className="p-6 rounded-2xl border border-[#1f2937] bg-[#111827] text-center text-sm text-[#9ca3af]">
        جاري تحميل بيانات الدعوات...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl border border-[#1f2937] bg-[#111827] text-center text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (!code) {
    return (
      <div className="p-6 rounded-2xl border border-[#1f2937] bg-[#111827] text-center text-sm text-[#9ca3af]">
        لا يوجد كود دعوة متاح حالياً.
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-[#020617] via-[#111827] to-[#1f2937] shadow-md text-white relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />
      <div className="relative space-y-4">
        {/* Hero */}
        <div>
          <h3 className="font-bold text-xl mb-1">شارك EGX Pro واكسب 149 جنيه مجاناً</h3>
          <p className="text-sm text-slate-200">
            كل ما دعوت صديق وسجّل بكودك، اقتربت خطوة من شهر Pro مجاني كامل — بدون أي تكلفة.
          </p>
        </div>

        {/* Code card */}
        <div className="space-y-2">
          <p className="text-[11px] text-slate-300">كودك الشخصي الخاص بك</p>
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between bg-white/10 p-4 rounded-xl border border-dashed border-white/20 gap-4">
            <span className="font-mono font-bold tracking-[0.3em] text-lg text-center md:text-right bg-black/30 px-4 py-3 rounded-xl">
              {code}
            </span>
            <div className="flex gap-2 justify-center md:justify-end">
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1 text-xs font-bold bg-white text-[#7c3aed] px-4 py-2 rounded-lg shadow"
              >
                مشاركة
              </button>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1 text-xs font-bold bg-transparent border border-white/40 px-3 py-2 rounded-lg"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'تم النسخ' : 'نسخ الكود'}
              </button>
            </div>
          </div>
        </div>

        {/* Progress steps */}
        <div className="space-y-3">
          <p className="text-xs text-slate-300">
            إجمالي دعواتك: {totalReferrals} دعوة ناجحة
          </p>
          <p className="text-sm font-medium">
            باقيلك {Math.max(0, goal - (stepsCompleted || 0))} دعوات وهتاخد شهر Pro مجاناً
          </p>
          <div className="flex items-center justify-between gap-2 mt-1">
            {Array.from({ length: goal }).map((_, idx) => {
              const stepNumber = idx + 1;
              const isCompleted = stepNumber <= stepsCompleted;
              const isNext = !isCompleted && stepNumber === stepsCompleted + 1;
              const friendName =
                friends.find((f) => f.order === stepNumber)?.name || `صديق ${stepNumber}`;

              return (
                <div key={stepNumber} className="flex-1 flex flex-col items-center">
                  <div className="flex items-center w-full">
                    {/* Circle */}
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border ${
                        isCompleted
                          ? 'bg-[#7c3aed] border-[#7c3aed] text-white'
                          : isNext
                          ? 'bg-[#1f2937] border-[#7c3aed] text-[#e5e7eb] animate-pulse'
                          : 'bg-[#020617] border-[#4b5563] text-[#6b7280]'
                      }`}
                    >
                      {isCompleted ? <Check size={16} /> : stepNumber}
                    </div>
                    {/* Connector */}
                    {idx < goal - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-1 ${
                          stepNumber < stepsCompleted ? 'bg-[#7c3aed]' : 'bg-white/10'
                        }`}
                      />
                    )}
                  </div>
                  {/* Label under completed steps */}
                  {isCompleted && (
                    <p className="mt-1 text-[10px] text-slate-200 truncate max-w-[5rem] text-center">
                      {friendName.split(' ')[0] || friendName}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Reward card */}
        <div
          className={`mt-2 p-4 rounded-2xl border text-sm ${
            completedCount >= goal && rewardClaimed
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
              : 'bg-black/40 border-[#1f2937] text-slate-100'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-5 h-5 text-[#fbbf24]" />
            <div>
              <p className="font-bold text-sm">مكافأتك عند اكتمال 5 دعوات</p>
              <p className="text-[11px] text-slate-300">
                شهر Pro مجاني — قيمته 149 جنيه
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-300 mb-2">
            {Math.min(completedCount, goal)} من {goal} مكتملة
          </p>
          {completedCount >= goal ? (
            rewardClaimed ? (
              <p className="text-[11px]">
                مبروك! تم إضافة شهر Pro لحسابك. استمتع بكل مميزات الخطة.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px]">
                  اكتملت 5 دعوات ناجحة — اضغط على الزر بالأسفل لتفعيل الشهر المجاني.
                </p>
                <button
                  type="button"
                  onClick={handleRedeem}
                  disabled={redeeming}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-2 rounded-xl font-bold text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {redeeming ? 'جارٍ تفعيل المكافأة...' : 'فعّل شهر Pro المجاني الآن'}
                </button>
              </div>
            )
          ) : (
            <p className="text-[11px] text-slate-300">
              ادعو مزيداً من الأصدقاء لتحصل على شهر كامل من EGX Pro مجاناً.
            </p>
          )}
        </div>

        {/* Social proof */}
        <div className="pt-2 text-[11px] text-slate-300">
          {weeklyJoinedCount > 0 && (
            <p>
              انضم {weeklyJoinedCount} مستخدم هذا الأسبوع عن طريق الدعوات.
            </p>
          )}
        </div>

        {message && (
          <p className="text-xs text-emerald-300">
            {message}
          </p>
        )}

        {error && (
          <p className="text-xs text-red-300">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function AvatarWithUpload({
  user,
  onUserUpdate,
}: {
  user: UserProfile;
  onUserUpdate: (u: Partial<UserProfile>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fileInputId = 'avatar-upload-input';

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const res = await fetch('/api/user/avatar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: base64 }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data?.error || 'فشل رفع الصورة');
          }
          onUserUpdate({ avatarUrl: data.avatarUrl });
          setMessage('تم تحديث صورة البروفايل بنجاح');
        } catch (err) {
          console.error('Avatar upload failed', err);
          setMessage('حدث خطأ أثناء رفع الصورة');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Avatar upload error', err);
      setUploading(false);
      setMessage('حدث خطأ أثناء قراءة الملف');
    }
  };

  const isPro = user.subscriptionPlan === 'pro' || user.subscriptionPlan === 'annual';

  const frameClass = isPro
    ? 'p-[2px] rounded-full bg-gradient-to-br from-amber-300 via-orange-400 to-yellow-500'
    : 'p-[2px] rounded-full bg-[#1f2937]';

  const initials =
    (user.fullName || user.username || 'U').trim()[0]?.toUpperCase() || 'U';

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => document.getElementById(fileInputId)?.click()}
        className="relative group"
      >
        <div className={frameClass}>
          <div className="w-16 h-16 rounded-full bg-[#020617] overflow-hidden flex items-center justify-center">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName || 'avatar'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] flex items-center justify-center text-2xl font-bold">
                {initials}
              </div>
            )}
          </div>
        </div>
        <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] transition-opacity">
          {uploading ? 'جارٍ الرفع...' : 'تغيير الصورة'}
        </div>
        {isPro && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow">
            PRO
          </div>
        )}
      </button>
      <input
        id={fileInputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {message && (
        <p className="text-[11px] text-[#9ca3af]">
          {message}
        </p>
      )}
    </div>
  );
}
