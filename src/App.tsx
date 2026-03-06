import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from './store/authStore';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, TrendingUp, User as UserIcon, LayoutDashboard, PieChart, Calculator, Settings as SettingsIcon, Search, Eye, EyeOff, Sun, Moon, Monitor, Target, Bell, LogOut, ChevronLeft, ChevronRight, Trophy, Briefcase, UserPlus as UserPlusIcon } from 'lucide-react';
import OnboardingWizard from './components/OnboardingWizard';
import PortfolioTracker from './components/PortfolioTracker';
import StockScreener from './components/StockScreener';
import InvestmentCalculator from './components/InvestmentCalculator';
import StockAnalysis from './components/StockAnalysis';
import FinancialGoalsSidebar from './components/FinancialGoalsSidebar';
import ProfilePage from './components/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import { ErrorPage } from './components/ErrorPage';
import { loginSchema, registerSchema, validateRegisterPassword } from './lib/validations';
import { Stock, PortfolioHolding } from './types';

export default function App() {
  const { t, i18n } = useTranslation('common');
  const { isAuthenticated, user, logout, updateUser, accessToken } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [showTwoFactorInput, setShowTwoFactorInput] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [tempUserId, setTempUserId] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(() => {
    if (typeof window === 'undefined') return 'system';

    // أولوية 1: اختيار اليوزر المحفوظ في الداتابيز
    if (user?.theme === 'light' || user?.theme === 'dark' || user?.theme === 'system') {
      return user.theme as 'light' | 'dark' | 'system';
    }

    // أولوية 2: اختيار سابق محفوظ في المتصفح
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }

    // أولوية 3: النظام (system) ← يتم ترجمته لـ dark/light في useEffect بالأسفل
    return 'system';
  });

  const [authMessage, setAuthMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; type: string; title: string; body: string; isRead: boolean; createdAt: string }>>([]);
  const [notificationsUnread, setNotificationsUnread] = useState(0);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) setUserDropdownOpen(false);
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) setNotificationsOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      if (res.ok && data?.notifications) {
        setNotifications(data.notifications);
        setNotificationsUnread(data.unreadCount ?? 0);
      }
    } catch {
      // ignore
    }
  }, [accessToken]);

  useEffect(() => {
    if (isAuthenticated && accessToken) fetchNotifications();
  }, [isAuthenticated, accessToken, fetchNotifications]);

  const markNotificationsRead = useCallback(async () => {
    if (!accessToken) return;
    try {
      await fetch('/api/notifications/mark-read', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
      setNotificationsUnread(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // ignore
    }
  }, [accessToken]);

  const goToSettings = () => {
    setActiveTab('profile');
    if (typeof window !== 'undefined') window.history.pushState(null, '', '/profile');
    window.dispatchEvent(new PopStateEvent('popstate'));
    setUserDropdownOpen(false);
  };

  useEffect(() => {
    const applyTheme = (nextTheme: 'dark' | 'light' | 'system') => {
      const root = window.document.documentElement;
      const prefersDark =
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;

      const effective = nextTheme === 'system' ? (prefersDark ? 'dark' : 'light') : nextTheme;

      if (effective === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme(theme);

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    mql.addEventListener('change', listener);

    localStorage.setItem('theme', theme);

    return () => {
      mql.removeEventListener('change', listener);
    };
  }, [theme]);

  // لو اليوزر غيّر اللغة من الإعدادات (user.language) نخليها تسبق اكتشاف البراوزر
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (user?.language === 'ar' || user?.language === 'en') {
      if (i18n.language !== user.language) {
        i18n.changeLanguage(user.language);
      }
      return;
    }

    // لو مفيش لغة محفوظة من قبل، نستخدم navigator.language كإعداد افتراضي
    const stored = localStorage.getItem('i18nextLng');
    if (stored === 'ar' || stored === 'en') {
      return;
    }

    const navLang =
      (navigator.language || (Array.isArray(navigator.languages) && navigator.languages[0])) ??
      'en';
    const nextLang = navLang.toLowerCase().startsWith('ar') ? 'ar' : 'en';
    if (i18n.language !== nextLang) {
      i18n.changeLanguage(nextLang);
    }
  }, [user?.language, i18n]);

  // لو اليوزر عنده theme محفوظ في البروفايل يطغى على السيستم والمتصفح
  useEffect(() => {
    if (!user?.theme) return;
    if (user.theme === 'light' || user.theme === 'dark' || user.theme === 'system') {
      setTheme(user.theme);
    }
  }, [user?.theme]);
  const [stats, setStats] = useState({ totalValue: 0, topPerformer: '--', topPerformerChange: 0 });

  useEffect(() => {
    if (authMessage) {
      const timer = setTimeout(() => setAuthMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [authMessage]);
  // Removed unused watchlist state

  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const knownPaths = ['/', '/portfolio', '/stocks', '/calculator', '/goals', '/profile', '/account'];

  // مزامنة الـ URL مع التبويب عند التحميل (عشان زر "اذهب وحقق التحدي" يودّي للصفحة الصحيحة)
  useEffect(() => {
    if (!isAuthenticated) return;
    const p = typeof window !== 'undefined' ? window.location.pathname : '/';
    const tabFromPath: Record<string, string> = {
      '/': 'dashboard',
      '/portfolio': 'portfolio',
      '/stocks': 'stocks',
      '/calculator': 'calculator',
      '/goals': 'goals',
      '/profile': 'profile',
      '/account': 'profile',
    };
    const tab = tabFromPath[p];
    if (tab) setActiveTab(tab);
  }, [isAuthenticated, pathname]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          useAuthStore.getState().setAuth(data.user, data.accessToken);
        } else if (isAuthenticated) {
          // If we were authenticated but the session is gone, logout
          logout();
        }
      } catch (err) {
        console.error('Initial auth check failed', err);
      }
    };
    checkAuth();
  }, [isAuthenticated, logout]);

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [holdingsRes, stocksRes, watchlistRes] = await Promise.all([
        fetch('/api/portfolio', { headers: { 'Authorization': `Bearer ${accessToken}` } }),
        fetch('/api/stocks/prices'),
        fetch('/api/watchlist', { headers: { 'Authorization': `Bearer ${accessToken}` } })
      ]);

      if (!holdingsRes.ok || !stocksRes.ok || !watchlistRes.ok) {
        console.error('One or more dashboard requests failed');
        return;
      }

      const holdingsData = await holdingsRes.json();
      const stocks = await stocksRes.json();
      const watchlistData = await watchlistRes.json();
      
      const holdings = Array.isArray(holdingsData) ? holdingsData : (holdingsData.holdings || []);
      
      if (!Array.isArray(holdings) || !Array.isArray(stocks) || !Array.isArray(watchlistData)) {
        console.error('Dashboard data is not in expected format');
        return;
      }

      const priceMap: Record<string, Stock> = {};
      stocks.forEach((s: Stock) => priceMap[s.ticker] = s);

      let totalValue = 0;
      let bestStock = '--';
      let bestChange = -Infinity;

      holdings.forEach((h: PortfolioHolding) => {
        const current = priceMap[h.ticker];
        if (current) {
          totalValue += h.shares * current.price;
          if (current.change > bestChange) {
            bestChange = current.change;
            bestStock = h.ticker;
          }
        }
      });

      setStats({ 
        totalValue, 
        topPerformer: bestStock, 
        topPerformerChange: bestChange === -Infinity ? 0 : bestChange 
      });

      // Map watchlist tickers to full stock data
      // const fullWatchlist = watchlistData.map((w: WatchlistItem) => priceMap[w.ticker]).filter(Boolean) as Stock[];
      // setWatchlist(fullWatchlist); // Removed unused setWatchlist
    } catch (err) {
      console.error('Dashboard fetch error', err);
    }
  }, [accessToken]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'dashboard' && accessToken) {
      fetchDashboardData();
    }
  }, [isAuthenticated, activeTab, fetchDashboardData, accessToken]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      // Frontend Validation
      if (isLogin) {
        const result = loginSchema.safeParse({ emailOrPhone, password });
        if (!result.success) {
          const firstError = result.error.issues?.[0]?.message || 'Invalid input';
          throw new Error(firstError);
        }
      } else {
        const result = registerSchema.safeParse({ emailOrPhone, password, fullName });
        if (!result.success) {
          const firstError = result.error.issues?.[0]?.message || 'Invalid input';
          throw new Error(firstError);
        }
        const pwCheck = validateRegisterPassword(password, emailOrPhone);
        if (!pwCheck.ok) {
          throw new Error(pwCheck.message);
        }

        // لو المستخدم بيسجل برقم موبايل، نطبّق قواعد رقم الموبايل المصري
        if (!emailOrPhone.includes('@')) {
          const digitsOnly = emailOrPhone.replace(/\D/g, '');
          if (!digitsOnly) {
            throw new Error(i18n.language === 'ar' ? 'رقم الموبايل مطلوب' : 'Phone number is required');
          }
          if (digitsOnly.length !== 11) {
            throw new Error(i18n.language === 'ar' ? 'رقم الموبايل لازم يكون 11 رقم' : 'Phone number must be 11 digits');
          }
          if (!/^01[0125][0-9]{8}$/.test(digitsOnly)) {
            throw new Error(i18n.language === 'ar' ? 'رقم الموبايل غير صحيح' : 'Invalid Egyptian phone number');
          }
        }
      }

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin ? { emailOrPhone, password } : { emailOrPhone, password, fullName };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data.error === 'account_not_found'
          ? (data.message || (i18n.language === 'ar' ? 'الحساب ده مش موجود. تقدر تسجّل حساب جديد.' : 'This account does not exist. You can register as new.'))
          : (data.message || data.error || (i18n.language === 'ar' ? 'فشل تسجيل الدخول' : 'Auth failed'));
        setError(msg);
        return;
      }

      if (isLogin) {
        if (data.twoFactorRequired) {
          setTempUserId(data.userId);
          setShowTwoFactorInput(true);
          return;
        }

        // Fetch full profile to check onboarding
        const profileRes = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${data.accessToken}` }
        });
        const profileData = await profileRes.json();
        useAuthStore.getState().setAuth(profileData, data.accessToken);
        setAuthMessage({
          text: data.restored ? t('settings.welcomeBack') : (i18n.language === 'ar' ? 'تم تسجيل الدخول بنجاح!' : 'Login successful!'),
          type: 'success',
        });
      } else {
        // Same as login: use returned token + user and optionally fetch full profile
        const profileRes = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${data.accessToken}` }
        });
        const profileData = profileRes.ok ? await profileRes.json() : data.user;
        useAuthStore.getState().setAuth(profileData, data.accessToken);
        setAuthMessage({ text: i18n.language === 'ar' ? 'تم إنشاء الحساب بنجاح!' : 'Account created successfully!', type: 'success' });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Auth failed');
    }
  };

  const handleTwoFactorVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: tempUserId, token: twoFactorToken }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      useAuthStore.getState().setAuth(data.user, data.accessToken);
      setShowTwoFactorInput(false);
      setTwoFactorToken('');
      setAuthMessage({ text: i18n.language === 'ar' ? 'تم تسجيل الدخول بنجاح!' : 'Login successful!', type: 'success' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      if (!res.ok) throw new Error('Failed to get Google login URL');
      const { url } = await res.json();
      
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(url, 'google_login', `width=${width},height=${height},left=${left},top=${top}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google login failed');
    }
  };

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) return;
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        // The popup should have set a session or we might need to fetch the token
        // In this implementation, we'll assume the popup sends the token or we fetch profile
        try {
          const res = await fetch('/api/auth/me', { credentials: 'include' }); // Endpoint to get current session user
          if (res.ok) {
            const data = await res.json();
            useAuthStore.getState().setAuth(data.user, data.accessToken);
          }
        } catch (err) {
          console.error('Failed to sync after Google login', err);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (isAuthenticated && user?.isFirstLogin) {
    return <OnboardingWizard onComplete={() => updateUser({ isFirstLogin: false, onboardingCompleted: true })} />;
  }

  // لو مش مسجل دخول وحاول يدخل مسار غير الجذر → صفحة 401
  if (!isAuthenticated && pathname !== '/') {
    return <ErrorPage code={401} />;
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col md:flex-row">
        {/* Sidebar - collapsible */}
        <aside
          className={`w-full md:flex-shrink-0 bg-slate-900 border-r border-white/5 flex flex-col gap-6 transition-[width] duration-200 ease-in-out overflow-hidden ${sidebarCollapsed ? 'md:w-16' : 'md:w-60'}`}
        >
          <div className="p-4 flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <TrendingUp className="text-violet-500 w-8 h-8 shrink-0" />
              <h1 className={`text-xl font-bold tracking-tight truncate transition-opacity duration-200 ${sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>EGX Pro</h1>
            </div>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              aria-label={sidebarCollapsed ? (i18n.language === 'ar' ? 'توسيع القائمة' : 'Expand sidebar') : (i18n.language === 'ar' ? 'طي القائمة' : 'Collapse sidebar')}
            >
              {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {[
              { id: 'dashboard', label: i18n.language === 'ar' ? 'الرئيسية' : 'Dashboard', icon: LayoutDashboard, path: '/' },
              { id: 'portfolio', label: i18n.language === 'ar' ? 'محفظتي' : 'Portfolio', icon: PieChart, path: '/portfolio' },
              { id: 'stocks', label: i18n.language === 'ar' ? 'الأسهم' : 'Stocks', icon: Search, path: '/stocks' },
              { id: 'calculator', label: i18n.language === 'ar' ? 'الحاسبة' : 'Calculator', icon: Calculator, path: '/calculator' },
              { id: 'goals', label: i18n.language === 'ar' ? 'أهدافي المالية' : 'Financial Goals', icon: Target, path: '/goals' },
              { id: 'profile', label: i18n.language === 'ar' ? 'حسابي' : 'Profile', icon: UserIcon, path: '/profile' },
            ].map(item => (
              <button
                key={item.id}
                title={sidebarCollapsed ? item.label : undefined}
                onClick={() => {
                  setActiveTab(item.id);
                  setSelectedStock(null);
                  if (typeof window !== 'undefined') window.history.pushState(null, '', item.path);
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${sidebarCollapsed ? 'justify-center' : ''} ${activeTab === item.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className={`font-medium truncate transition-opacity duration-200 ${sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-3 pt-4 border-t border-white/5">
            <button
              type="button"
              title={sidebarCollapsed ? (i18n.language === 'ar' ? 'English' : 'العربية') : undefined}
              onClick={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-xl ${sidebarCollapsed ? 'justify-center' : ''}`}
            >
              <SettingsIcon className="w-4 h-4 shrink-0" />
              <span className={`truncate transition-opacity duration-200 ${sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>{i18n.language === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <header className="flex justify-between items-center mb-12" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            {/* Right in RTL: greeting */}
            <div className="text-end">
              <h2 className="text-3xl font-bold">
                {i18n.language === 'ar' ? `أهلاً، ${user?.fullName || 'مستثمرنا'}` : `Welcome, ${user?.fullName || 'Investor'}`}
              </h2>
              {user?.username ? (
                <p className="text-slate-400 text-sm mt-0.5">@{user.username}</p>
              ) : (
                <p className="text-slate-400 text-sm mt-0.5">{i18n.language === 'ar' ? 'إليك نظرة سريعة على استثماراتك اليوم' : 'Here is a quick look at your investments today'}</p>
              )}
            </div>
            {/* Left in RTL: theme, bell, avatar */}
            <div className="flex items-center gap-3">
              {/* Theme toggle */}
              <div className="flex items-center gap-1 rounded-full bg-slate-900/60 border border-slate-700/80 px-1 py-1 text-slate-400 text-xs">
                <button
                  type="button"
                  onClick={async () => {
                    setTheme('light');
                    if (accessToken) {
                      try {
                        const res = await fetch('/api/user/profile', {
                          method: 'PUT',
                          headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ theme: 'light' }),
                        });
                        const body = await res.json().catch(() => null);
                        if (res.ok && body) {
                          updateUser(body);
                        }
                      } catch (err) {
                        console.error('Failed to update theme from header', err);
                      }
                    }
                  }}
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                    theme === 'light'
                      ? 'bg-white text-slate-900'
                      : 'bg-transparent hover:bg-slate-800'
                  }`}
                  aria-label="Light mode"
                >
                  <Sun className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setTheme('system');
                    if (accessToken) {
                      try {
                        const res = await fetch('/api/user/profile', {
                          method: 'PUT',
                          headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ theme: 'system' }),
                        });
                        const body = await res.json().catch(() => null);
                        if (res.ok && body) {
                          updateUser(body);
                        }
                      } catch (err) {
                        console.error('Failed to update theme from header', err);
                      }
                    }
                  }}
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                    theme === 'system'
                      ? 'bg-white text-slate-900'
                      : 'bg-transparent hover:bg-slate-800'
                  }`}
                  aria-label="System theme"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setTheme('dark');
                    if (accessToken) {
                      try {
                        const res = await fetch('/api/user/profile', {
                          method: 'PUT',
                          headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ theme: 'dark' }),
                        });
                        const body = await res.json().catch(() => null);
                        if (res.ok && body) {
                          updateUser(body);
                        }
                      } catch (err) {
                        console.error('Failed to update theme from header', err);
                      }
                    }
                  }}
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                    theme === 'dark'
                      ? 'bg-white text-slate-900'
                      : 'bg-transparent hover:bg-slate-800'
                  }`}
                  aria-label="Dark mode"
                >
                  <Moon className="w-4 h-4" />
                </button>
              </div>
              {/* Notifications */}
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => { setNotificationsOpen((o) => !o); if (!notificationsOpen) fetchNotifications(); }}
                  className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                  aria-label={t('settings.notifications')}
                >
                  <Bell className="w-5 h-5" />
                  {notificationsUnread > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" aria-hidden />
                  )}
                </button>
                <AnimatePresence>
                  {notificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute left-0 top-full mt-2 w-80 max-h-96 overflow-auto rounded-xl border border-slate-700 bg-slate-900 shadow-xl z-50"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                        <span className="font-medium text-slate-200">{t('settings.notifications')}</span>
                        {notificationsUnread > 0 && (
                          <button type="button" onClick={markNotificationsRead} className="text-xs text-violet-400 hover:text-violet-300">
                            {t('settings.markAllNotificationsRead')}
                          </button>
                        )}
                      </div>
                      <div className="p-2">
                        {notifications.length === 0 ? (
                          <p className="text-sm text-slate-500 py-4 text-center">{t('settings.noNewNotifications')}</p>
                        ) : (
                          notifications.map((n) => {
                            const Icon = n.type === 'achievement' ? Trophy : n.type === 'stock_target' ? TrendingUp : n.type === 'referral' ? UserPlusIcon : n.type === 'goal' ? Target : Briefcase;
                            const timeAgo = (() => {
                              const d = new Date(n.createdAt);
                              const diff = (Date.now() - d.getTime()) / 1000;
                              if (diff < 60) return t('settings.lastActivityMoments');
                              if (diff < 3600) return t('settings.lastActivityMinutes', { m: Math.floor(diff / 60) });
                              if (diff < 86400) return t('settings.lastActivityHours', { h: Math.floor(diff / 3600) });
                              return t('settings.lastActivityDays', { d: Math.floor(diff / 86400) });
                            })();
                            return (
                              <div key={n.id} className={`flex gap-3 px-3 py-2 rounded-lg ${!n.isRead ? 'bg-violet-500/10' : ''}`}>
                                <Icon className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-slate-200">{n.title}</p>
                                  {n.body && <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>}
                                  <p className="text-xs text-slate-500 mt-1">{timeAgo}</p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User dropdown */}
              <div className="relative" ref={userDropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5"
                >
                  <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium truncate max-w-[120px]">{user?.fullName || t('auth.login')}</p>
                    {user?.username && <p className="text-xs text-slate-500 truncate max-w-[120px]">@{user.username}</p>}
                  </div>
                </button>
                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900 shadow-xl z-50 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-slate-700">
                        <p className="font-medium text-slate-200 truncate">{user?.fullName || '—'}</p>
                        <p className="text-sm text-slate-500 truncate">{user?.username ? `@${user.username}` : '—'}</p>
                      </div>
                      <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); goToSettings(); }}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                      >
                        <SettingsIcon className="w-4 h-4" />
                        {t('settings.settingsPage')}
                      </a>
                      <button
                        type="button"
                        onClick={() => { logout(); setUserDropdownOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white border-t border-slate-700"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('settings.logout')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab + (selectedStock ? `-${selectedStock.ticker}` : '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {selectedStock ? (
                <StockAnalysis stock={selectedStock} onBack={() => setSelectedStock(null)} />
              ) : (
                <>
                  {activeTab === 'dashboard' && <DashboardPage />}
                  {activeTab === 'portfolio' && <PortfolioTracker />}
                  {activeTab === 'stocks' && <StockScreener onSelectStock={(s) => setSelectedStock(s)} />}
                  {activeTab === 'calculator' && <InvestmentCalculator />}
                  {activeTab === 'goals' && (
                    <div className="card-base p-8">
                      <FinancialGoalsSidebar currentWealth={stats.totalValue} />
                    </div>
                  )}
                  {activeTab === 'profile' && <ProfilePage />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    );
  }

  // مستخدم غير مسجل دخول وعلى الجذر → شاشة auth العادية

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <TrendingUp className="w-12 h-12 text-violet-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold tracking-tight mb-2">EGX Pro</h1>
          <p className="text-slate-400">Egyptian Stock Market Intelligence</p>
        </div>

        <motion.div 
          layout
          className="bg-slate-900 border border-white/5 rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex gap-4 mb-8 p-1 bg-slate-800 rounded-2xl">
            <button 
              onClick={() => { setIsLogin(true); setShowTwoFactorInput(false); setError(''); }}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${isLogin ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              {t('auth.login')}
            </button>
            <button 
              onClick={() => { setIsLogin(false); setShowTwoFactorInput(false); setError(''); }}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${!isLogin ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              {t('auth.register')}
            </button>
          </div>

          {showTwoFactorInput ? (
            <form onSubmit={handleTwoFactorVerify} className="space-y-4">
              <div className="text-center mb-6">
                <div className="bg-violet-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SettingsIcon className="w-8 h-8 text-violet-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">{i18n.language === 'ar' ? 'المصادقة الثنائية' : 'Two-Factor Authentication'}</h3>
                <p className="text-slate-400 text-sm">
                  {i18n.language === 'ar' 
                    ? 'أدخل الرمز المكون من 6 أرقام من تطبيق المصادقة الخاص بك' 
                    : 'Enter the 6-digit code from your authenticator app'}
                </p>
              </div>

              <div>
                <input 
                  type="text" 
                  maxLength={6}
                  value={twoFactorToken}
                  onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all placeholder-slate-600"
                  placeholder="000000"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-center">
                  {error}
                </p>
              )}

              <button 
                type="submit"
                disabled={twoFactorToken.length !== 6}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-violet-600/20 transition-all active:scale-95"
              >
                {i18n.language === 'ar' ? 'تحقق' : 'Verify'}
              </button>
              
              <button 
                type="button"
                onClick={() => setShowTwoFactorInput(false)}
                className="w-full text-slate-400 hover:text-white text-sm py-2"
              >
                {i18n.language === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Login'}
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleAuth} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-sm font-medium text-slate-400 mb-1">{t('auth.fullName')}</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    placeholder="Ahmed Mohamed"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">{t('auth.emailOrPhone')}</label>
              <input 
                type="text" 
                required
                autoComplete="username"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                placeholder={i18n.language === 'ar' ? 'name@example.com أو 01xxxxxxxxx' : 'name@example.com or 01xxxxxxxxx'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">{t('auth.password')}</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {authMessage && (
              <p className={`text-sm p-3 rounded-xl border text-center ${authMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                {authMessage.text}
              </p>
            )}

            {error && (
              <p className="text-red-500 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                {error}
              </p>
            )}

            <button 
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-violet-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              {isLogin ? t('auth.login') : t('auth.register')}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-500">{i18n.language === 'ar' ? 'أو' : 'Or'}</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-white text-slate-900 font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 hover:bg-slate-100"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {i18n.language === 'ar' ? 'التسجيل بواسطة جوجل' : 'Continue with Google'}
            </button>
          </form>
          </>
          )}

          <div className="mt-8 pt-8 border-t border-white/5 flex justify-center gap-4">
            <button 
              onClick={() => i18n.changeLanguage('ar')}
              className={`text-sm ${i18n.language === 'ar' ? 'text-violet-400 font-bold' : 'text-slate-500'}`}
            >
              العربية
            </button>
            <button 
              onClick={() => i18n.changeLanguage('en')}
              className={`text-sm ${i18n.language === 'en' ? 'text-violet-400 font-bold' : 'text-slate-500'}`}
            >
              English
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
