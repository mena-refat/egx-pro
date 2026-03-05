import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useProfileCompletion } from '../hooks/useProfileCompletion';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Copy, Lock, User, CreditCard, Gift, Award, Settings, Check, TrendingUp, Wallet, BarChart2, Target } from 'lucide-react';

// --- Sub-components ---

const Toggle = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <button 
    onClick={onChange}
    className={`w-12 h-6 rounded-full p-1 transition-all ${checked ? 'bg-[#7c3aed]' : 'bg-[#1f2937]'}`}
  >
    <motion.div 
      className="w-4 h-4 rounded-full bg-white"
      animate={{ x: checked ? 24 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
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

export default function ProfilePage() {
  const { user: authUser, accessToken, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState<UserProfile | null>(authUser as UserProfile | null);
  const [loading, setLoading] = useState(!authUser);
  const [copied, setCopied] = useState(false);
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

  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        const updatedUser: UserProfile = await response.json();
        setUser(updatedUser);
        updateUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to update profile', error);
    }
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
                  { label: "التحليلات", value: 47, icon: BarChart2 },
                  { label: "الأسهم", value: 8, icon: TrendingUp },
                  { label: "أيام الاستخدام", value: 23, icon: Target },
                  { label: "إجمالي المحفظة", value: user.monthlyBudget || 0, icon: Wallet },
                ].map((stat, i) => (
                  <div key={i} className="p-4 rounded-2xl border border-[#1f2937] bg-[#111827] text-center shadow-md hover:scale-[1.02] transition-transform">
                    <stat.icon className="mx-auto mb-2 text-[#7c3aed]" size={24} />
                    <p className="text-[#9ca3af] text-xs mb-1">{stat.label}</p>
                    <p className="text-lg font-bold"><Counter value={stat.value} /></p>
                  </div>
                ))}
              </div>
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
            <div className="grid grid-cols-2 gap-4">
              {[
                { title: "أول تحليل", icon: "🥇", completed: true, date: "15 فبراير 2025" },
                { title: "المحلل النشيط", icon: "📊", completed: true, date: "20 فبراير 2025" },
                { title: "صاحب محفظة", icon: "💼", completed: true, date: "25 فبراير 2025" },
                { title: "الهدف الأول", icon: "🎯", completed: false, progress: 47 },
                { title: "السفير", icon: "👥", completed: false, progress: 10 },
              ].map((badge, i) => (
                <motion.div key={i} whileHover={{ scale: 1.05 }} className={`p-4 rounded-2xl border border-[#1f2937] bg-[#111827] text-center shadow-md ${badge.completed ? 'border-[#7c3aed] shadow-[0_0_15px_rgba(124,58,237,0.3)]' : 'opacity-60 grayscale blur-[0.5px]'}`}>
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <p className="text-sm font-bold">{badge.title}</p>
                  {badge.completed ? (
                    <p className="text-xs text-[#9ca3af] mt-1">{badge.date}</p>
                  ) : (
                    <div className="mt-2">
                      <p className="text-xs text-[#9ca3af] mb-1">{badge.progress} من 100 - باقي {100 - badge.progress}</p>
                      <div className="w-full h-1 bg-[#1f2937] rounded-full overflow-hidden">
                        <div className="h-full bg-[#9ca3af]" style={{ width: `${badge.progress}%` }} />
                      </div>
                      <Lock size={16} className="mx-auto mt-2 text-[#9ca3af]" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {[
                { title: "الحساب", items: [{ label: "البيانات الشخصية", action: "تعديل" }, { label: "الأمان والخصوصية", icon: ChevronLeft }] },
                { title: "التفضيلات", items: [
                  { label: "المظهر", toggle: true, checked: user.theme === 'dark', onChange: () => updateProfile({ theme: user.theme === 'dark' ? 'light' : 'dark' }) }, 
                  { label: "اللغة", value: user.language || "العربية" }, 
                  { label: "وضع الشريعة", toggle: true, checked: user.shariaMode, onChange: () => updateProfile({ shariaMode: !user.shariaMode }) }
                ] },
                { title: "الإشعارات", items: [{ label: "إشارات الشراء والبيع", toggle: true }, { label: "تحديثات المحفظة", toggle: true }, { label: "أخبار الأسهم", toggle: true }] },
              ].map((section, i) => (
                <div key={i} className="p-6 rounded-2xl border border-[#1f2937] bg-[#111827] shadow-md">
                  <h3 className="font-bold text-[#9ca3af] mb-4 uppercase text-xs">{section.title}</h3>
                  {section.items.map((item, j) => (
                    <div key={j} className="flex justify-between items-center py-3 border-b border-[#1f2937] last:border-0 hover:bg-[#1f2937]/30 px-2 rounded-lg transition-colors">
                      <span>{item.label}</span>
                      {item.toggle ? <Toggle checked={item.checked || false} onChange={item.onChange || (() => {})} /> : item.value ? <span className="text-[#9ca3af]">{item.value}</span> : <button className="text-[#7c3aed] text-sm font-bold">{item.action}</button>}
                      {item.icon && <item.icon size={20} className="text-[#9ca3af]" />}
                    </div>
                  ))}
                </div>
              ))}
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
