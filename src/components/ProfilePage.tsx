import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useProfileCompletion } from '../hooks/useProfileCompletion';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Copy, Lock, User, CreditCard, Gift, Award, Settings, Check, TrendingUp, Wallet, BarChart2, Target } from 'lucide-react';

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
  title: string;
  icon: string;
  completed: boolean;
  date?: string | null;
  progress?: number;
}

function AchievementsSection({ accessToken }: { accessToken: string | null }) {
  const [items, setItems] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    const fetchAchievements = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/user/achievements', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to load achievements');
        }
        const normalized: Achievement[] = Array.isArray(data)
          ? data.map((a) => ({
              id: a.id,
              title: a.title,
              icon: a.icon,
              completed: Boolean(a.completed),
              date: a.date ? String(a.date) : null,
              progress:
                typeof a.progress === 'number'
                  ? Math.max(0, Math.min(100, a.progress))
                  : undefined,
            }))
          : [];
        setItems(normalized);
      } catch (err) {
        console.error('Failed to load achievements', err);
        setError('فشل تحميل شارات الإنجاز');
      } finally {
        setLoading(false);
      }
    };
    fetchAchievements();
  }, [accessToken]);

  if (!accessToken) {
    return (
      <p className="text-sm text-center text-[#9ca3af]">
        قم بتسجيل الدخول لعرض الإنجازات.
      </p>
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

  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map((badge) => {
        const completed = badge.completed;
        const progress =
          typeof badge.progress === 'number' ? badge.progress : completed ? 100 : 0;
        return (
          <motion.div
            key={badge.id}
            whileHover={{ scale: 1.05 }}
            className={`p-4 rounded-2xl border border-[#1f2937] bg-[#111827] text-center shadow-md ${
              completed
                ? 'border-[#7c3aed] shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                : 'opacity-60 grayscale blur-[0.5px]'
            }`}
          >
            <div className="text-4xl mb-2">{badge.icon}</div>
            <p className="text-sm font-bold">{badge.title}</p>
            {completed && badge.date ? (
              <p className="text-xs text-[#9ca3af] mt-1">
                {new Date(badge.date).toLocaleDateString('ar-EG')}
              </p>
            ) : !completed ? (
              <div className="mt-2">
                <p className="text-xs text-[#9ca3af] mb-1">
                  {progress} من 100 - باقي {100 - progress}
                </p>
                <div className="w-full h-1 bg-[#1f2937] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#9ca3af]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <Lock size={16} className="mx-auto mt-2 text-[#9ca3af]" />
              </div>
            ) : null}
          </motion.div>
        );
      })}
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
}

function SubscriptionSection() {
  const [info, setInfo] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    const fetchPlan = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/billing/plan');
        if (!res.ok) {
          throw new Error('Failed to load plan');
        }
        const data = await res.json();
        setInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load plan');
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, []);

  const handleUpgrade = async (plan: Plan) => {
    setUpgrading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        throw new Error('Failed to upgrade plan');
      }
      const updated = await res.json();
      setInfo((prev) =>
        prev
          ? {
              ...prev,
              plan: updated.subscriptionPlan as Plan,
              subscriptionEndsAt: updated.subscriptionEndsAt,
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upgrade plan');
    } finally {
      setUpgrading(false);
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

  return (
    <div className="space-y-4">
      <div className="p-6 rounded-2xl border border-[#7c3aed] bg-gradient-to-br from-[#111827] to-[#1f2937] shadow-md">
        <h3 className="font-bold mb-2 text-lg">
          الخطة الحالية:{' '}
          <span className="text-[#fbbf24]">
            {plan === 'free' ? 'مجاني' : plan === 'pro' ? 'Pro شهري' : 'Pro سنوي'}
          </span>
        </h3>
        {subscriptionEndsAt && !isFree && (
          <p className="text-xs text-[#9ca3af] mb-2">
            ينتهي في:{' '}
            {new Date(subscriptionEndsAt).toLocaleDateString('ar-EG')}
          </p>
        )}
        <div className="mt-4">
          <p className="text-sm text-[#9ca3af] mb-2">
            استخدام تحليلات الذكاء الاصطناعي هذا الشهر:
          </p>
          <div className="w-full h-2 bg-[#1f2937] rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-[#7c3aed]"
              style={{
                width: quota
                  ? `${Math.min((analysis.used / quota) * 100, 100)}%`
                  : '100%',
              }}
            />
          </div>
          <p className="text-xs text-[#9ca3af]">
            {quota
              ? `${analysis.used} من ${quota} تحليلات شهرياً`
              : `${analysis.used} تحليل هذا الشهر (غير محدود)`}
          </p>
        </div>
        {error && (
          <p className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-2">
            {error}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          disabled={!isFree || upgrading}
          onClick={() => handleUpgrade('pro')}
          className={`p-4 rounded-2xl border ${
            isFree
              ? 'border-[#7c3aed] bg-[#111827] hover:bg-[#1f2937]'
              : 'border-[#1f2937] bg-[#111827]/60 opacity-60 cursor-not-allowed'
          } text-sm text-left space-y-1 transition-colors`}
        >
          <p className="font-bold text-white">Pro شهري — 149 جنيه</p>
          <p className="text-[#9ca3af] text-xs">
            تحليلات غير محدودة + كل المميزات
          </p>
        </button>
        <button
          disabled={!isFree || upgrading}
          onClick={() => handleUpgrade('annual')}
          className={`p-4 rounded-2xl border ${
            isFree
              ? 'border-[#f59e0b] bg-gradient-to-r from-[#7c3aed] to-[#f59e0b]'
              : 'border-[#1f2937] bg-[#111827]/60 opacity-60 cursor-not-allowed'
          } text-sm text-left space-y-1 text-white transition-colors`}
        >
          <p className="font-bold">الخطة السنوية — 999 جنيه</p>
          <p className="text-xs">
            توفير كبير مقابل الشهري + كل مميزات Pro
          </p>
        </button>
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
  onboardingCompleted: boolean;
  interestedSectors: string[];
  twoFactorEnabled: boolean;
  language: string;
  theme: string;
  subscriptionPlan?: 'free' | 'pro' | 'annual';
  subscriptionEndsAt?: string | null;
}

interface ProfileStats {
  analysesCount: number;
  watchlistCount: number;
  portfolioCount: number;
  portfolioValue: number;
  daysSinceJoined: number;
}

export default function ProfilePage() {
  const { user: authUser, accessToken, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState<UserProfile | null>(authUser as UserProfile | null);
  const [loading, setLoading] = useState(!authUser);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [fullNameInput, setFullNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const { percentage: profileCompletion, isComplete: profileComplete } = useProfileCompletion(accessToken, user);
  
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
        await updateProfile(
          { phone: phoneInput },
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

  const getLevelFromAnalyses = (count: number): string => {
    if (count >= 100) return 'محترف';
    if (count >= 50) return 'خبير';
    if (count >= 20) return 'محلل';
    if (count >= 5) return 'متداول';
    return 'مبتدئ';
  };

  const tabs = [
    { id: 'overview', label: 'نظرة عامة', icon: User },
    { id: 'subscription', label: 'الاشتراك', icon: CreditCard },
    { id: 'referral', label: 'الدعوات', icon: Gift },
    { id: 'achievements', label: 'الإنجازات', icon: Award, notification: true },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
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
            {tab.notification && <div className="absolute top-1 right-1 w-2 h-2 bg-[#ef4444] rounded-full" />}
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
              {/* Profile Header */}
              <div className="p-6 rounded-2xl border border-[#1f2937] bg-[#111827] shadow-md hover:scale-[1.01] transition-transform">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] p-1">
                    <div className="w-full h-full rounded-full bg-[#111827] flex items-center justify-center text-2xl font-bold">
                      {user.fullName?.[0] || user.username?.[0] || 'U'}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{user.fullName || '—'}</h2>
                    {user.username ? (
                      <p className="text-[#9ca3af] text-sm">@{user.username}</p>
                    ) : (
                      <p className="text-[#9ca3af] text-sm">{user.email || user.phone || '—'}</p>
                    )}
                  </div>
                  <div className="mr-auto bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] px-3 py-1 rounded-full text-sm font-bold text-white flex items-center gap-1">
                    <TrendingUp size={14} /> {user.riskTolerance || 'متوسط'}
                  </div>
                  {stats && (
                    <div className="mr-2 bg-[#111827] border border-[#4b5563] px-3 py-1 rounded-full text-xs font-bold text-[#e5e7eb] flex items-center gap-1">
                      <BarChart2 size={14} /> مستوى الحساب: {getLevelFromAnalyses(stats.analysesCount)}
                    </div>
                  )}
                </div>
                {!profileComplete && (
                  <div className="mt-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span>أكمل ملفك الشخصي</span>
                      <span className="font-bold">{profileCompletion}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#1f2937] rounded-full overflow-hidden">
                      <motion.div className="h-full bg-gradient-to-r from-[#7c3aed] to-[#3b82f6]" initial={{ width: 0 }} animate={{ width: `${profileCompletion}%` }} transition={{ duration: 1 }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "التحليلات", value: stats?.analysesCount ?? 0, icon: BarChart2 },
                  { label: "الأسهم في المحفظة", value: stats?.portfolioCount ?? 0, icon: TrendingUp },
                  { label: "أيام الاستخدام", value: stats?.daysSinceJoined ?? 0, icon: Target },
                  { label: "إجمالي المحفظة (تقريبي)", value: Math.round(stats?.portfolioValue ?? 0), icon: Wallet },
                ].map((stat, i) => (
                  <div key={i} className="p-4 rounded-2xl border border-[#1f2937] bg-[#111827] text-center shadow-md hover:scale-[1.02] transition-transform">
                    <stat.icon className="mx-auto mb-2 text-[#7c3aed]" size={24} />
                    <p className="text-[#9ca3af] text-xs mb-1">{stat.label}</p>
                    <p className="text-lg font-bold"><Counter value={stat.value} /></p>
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
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] shadow-md text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <h3 className="font-bold text-lg mb-2">🎁 ادعُ أصدقاءك واكسب شهر مجاني!</h3>
              <p className="text-sm mb-4 opacity-90">شارك كودك مع أصدقاءك، لما 5 منهم يسجلوا بكودك هتاخد شهر Pro مجاناً 🎉</p>
              <div className="flex items-center justify-between bg-white/20 p-3 rounded-xl mb-4 border border-dashed border-white/30">
                <span className="font-mono font-bold">EGX-AHMED47</span>
                <button onClick={handleCopy} className="flex items-center gap-1 text-xs font-bold bg-white text-[#7c3aed] px-2 py-1 rounded-lg">
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'تم النسخ' : 'نسخ'}
                </button>
              </div>
              <p className="text-sm mb-2 font-bold">باقيلك شخصين بس! 🎯</p>
              <div className="flex gap-2 mb-4">
                {[1, 1, 1, 0, 0].map((filled, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center ${filled ? 'bg-white text-[#7c3aed]' : 'border-2 border-white/50'}`}>
                    {filled ? <Check size={16} /> : <User size={16} />}
                  </div>
                ))}
              </div>
              <button className="w-full bg-white text-[#7c3aed] py-3 rounded-xl font-bold hover:bg-slate-100 transition-all">
                شارك الكود 📤
              </button>
            </div>
          )}

          {activeTab === 'achievements' && (
            <AchievementsSection accessToken={accessToken} />
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {requestStatus && (
                <div
                  className={`p-3 rounded-xl text-sm ${
                    requestStatus.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : 'bg-red-500/10 text-red-300 border border-red-500/30'
                  }`}
                >
                  {requestStatus.message}
                </div>
              )}

              <div className="p-6 rounded-2xl border border-[#1f2937] bg-[#111827] shadow-md">
                <h3 className="font-bold text-[#9ca3af] mb-4 uppercase text-xs">
                  الحساب
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-[#9ca3af] mb-1">
                      الاسم الكامل
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={fullNameInput}
                        onChange={(e) => setFullNameInput(e.target.value)}
                        className="flex-1 bg-[#020617] border border-[#1f2937] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
                      />
                      <button
                        onClick={() => saveField('fullName')}
                        disabled={
                          savingField === 'fullName' ||
                          fullNameInput === (user.fullName || '')
                        }
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-[#7c3aed] text-white disabled:opacity-50"
                      >
                        {savingField === 'fullName' ? 'جارٍ الحفظ...' : 'حفظ'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#9ca3af] mb-1">
                      رقم الموبايل
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="flex-1 bg-[#020617] border border-[#1f2937] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
                      />
                      <button
                        onClick={() => saveField('phone')}
                        disabled={
                          savingField === 'phone' ||
                          phoneInput === (user.phone || '')
                        }
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-[#7c3aed] text-white disabled:opacity-50"
                      >
                        {savingField === 'phone' ? 'جارٍ الحفظ...' : 'حفظ'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#9ca3af] mb-1">
                      اسم المستخدم
                    </label>
                    <div className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <span className="absolute right-3 top-2 text-[#6b7280] text-sm">
                          @
                        </span>
                        <input
                          value={usernameInput}
                          onChange={(e) =>
                            setUsernameInput(e.target.value.replace(/^@/, ''))
                          }
                          className="w-full bg-[#020617] border border-[#1f2937] rounded-xl pr-7 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
                        />
                        {usernameStatus === 'available' && (
                          <Check className="absolute left-3 top-2 text-emerald-400" size={16} />
                        )}
                        {usernameStatus === 'taken' && (
                          <Lock className="absolute left-3 top-2 text-red-400" size={16} />
                        )}
                      </div>
                      <button
                        onClick={() => saveField('username')}
                        disabled={
                          savingField === 'username' ||
                          usernameInput === (user.username || '') ||
                          (!!usernameInput && usernameStatus !== 'available')
                        }
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-[#7c3aed] text-white disabled:opacity-50"
                      >
                        {savingField === 'username' ? 'جارٍ الحفظ...' : 'حفظ'}
                      </button>
                    </div>
                    {usernameMessage && (
                      <p
                        className={`mt-1 text-xs ${
                          usernameStatus === 'available'
                            ? 'text-emerald-400'
                            : usernameStatus === 'taken' || usernameStatus === 'error'
                            ? 'text-red-400'
                            : 'text-[#9ca3af]'
                        }`}
                      >
                        {usernameMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-[#1f2937] bg-[#111827] shadow-md">
                <h3 className="font-bold text-[#9ca3af] mb-4 uppercase text-xs">
                  التفضيلات
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-3 border-b border-[#1f2937] last:border-0">
                    <span>المظهر</span>
                    <Toggle
                      checked={user.theme === 'dark'}
                      onChange={() =>
                        updateProfile(
                          { theme: user.theme === 'dark' ? 'light' : 'dark' },
                          { success: 'تم تحديث المظهر بنجاح' }
                        )
                      }
                    />
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-[#1f2937] last:border-0">
                    <span>اللغة</span>
                    <span className="text-[#9ca3af]">
                      {user.language || 'العربية'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-[#1f2937] last:border-0">
                    <span>وضع الشريعة</span>
                    <Toggle
                      checked={user.shariaMode}
                      onChange={() =>
                        updateProfile(
                          { shariaMode: !user.shariaMode },
                          { success: 'تم تحديث وضع الشريعة بنجاح' }
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-[#1f2937] bg-[#111827] shadow-md">
                <h3 className="font-bold text-[#9ca3af] mb-4 uppercase text-xs">
                  الإشعارات
                </h3>
                <div className="space-y-3">
                  {['إشارات الشراء والبيع', 'تحديثات المحفظة', 'أخبار الأسهم'].map(
                    (label) => (
                      <div
                        key={label}
                        className="flex justify-between items-center py-3 border-b border-[#1f2937] last:border-0"
                      >
                        <span>{label}</span>
                        <Toggle checked={true} onChange={() => {}} />
                      </div>
                    )
                  )}
                </div>
              </div>

              <button className="w-full bg-[#ef4444]/10 text-[#ef4444] py-4 rounded-2xl font-bold hover:bg-[#ef4444]/20 transition-all shadow-md">
                تسجيل الخروج
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
