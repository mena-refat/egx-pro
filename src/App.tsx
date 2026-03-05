import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from './store/authStore';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, TrendingUp, User as UserIcon, LayoutDashboard, PieChart, Calculator, Settings as SettingsIcon, Search, Eye, EyeOff, Sun, Moon, Monitor, Target } from 'lucide-react';
import OnboardingWizard from './components/OnboardingWizard';
import { useProfileCompletion } from './hooks/useProfileCompletion';
import PortfolioTracker from './components/PortfolioTracker';
import StockScreener from './components/StockScreener';
import InvestmentCalculator from './components/InvestmentCalculator';
import StockAnalysis from './components/StockAnalysis';
import FinancialGoalsSidebar from './components/FinancialGoalsSidebar';
import ProfilePage from './components/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import { loginSchema, registerSchema } from './lib/validations';
import { Stock, PortfolioHolding } from './types';

export default function App() {
  const { t, i18n } = useTranslation('common');
  const { isAuthenticated, user, logout, updateUser, accessToken } = useAuthStore();
  const { percentage: profileCompletion, isComplete: profileComplete } = useProfileCompletion(accessToken, user);
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
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    // لو اليوزر عنده theme محفوظ في البروفايل نستخدمه كنقطة بداية
    if (user?.theme === 'light' || user?.theme === 'dark' || user?.theme === 'system') {
      return user.theme as 'light' | 'dark' | 'system';
    }
    return 'system';
  });

  const [authMessage, setAuthMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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
  const [stats, setStats] = useState({ totalValue: 0, topPerformer: '--', topPerformerChange: 0 });

  useEffect(() => {
    if (authMessage) {
      const timer = setTimeout(() => setAuthMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [authMessage]);
  // Removed unused watchlist state

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
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
      }

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin ? { emailOrPhone, password } : { emailOrPhone, password, fullName };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auth failed');

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
        setAuthMessage({ text: i18n.language === 'ar' ? 'تم تسجيل الدخول بنجاح!' : 'Login successful!', type: 'success' });
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
          const res = await fetch('/api/auth/me'); // Endpoint to get current session user
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

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-slate-900 border-r border-white/5 p-6 flex flex-col gap-8">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-violet-500 w-8 h-8" />
            <h1 className="text-2xl font-bold tracking-tight">EGX Pro</h1>
          </div>

          <nav className="flex-1 space-y-2">
            {[
              { id: 'dashboard', label: i18n.language === 'ar' ? 'الرئيسية' : 'Dashboard', icon: LayoutDashboard },
              { id: 'portfolio', label: i18n.language === 'ar' ? 'محفظتي' : 'Portfolio', icon: PieChart },
              { id: 'stocks', label: i18n.language === 'ar' ? 'الأسهم' : 'Stocks', icon: Search },
              { id: 'calculator', label: i18n.language === 'ar' ? 'الحاسبة' : 'Calculator', icon: Calculator },
              { id: 'goals', label: i18n.language === 'ar' ? 'أهدافي المالية' : 'Financial Goals', icon: Target },
              { id: 'profile', label: i18n.language === 'ar' ? 'حسابي' : 'Profile', icon: UserIcon },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSelectedStock(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="pt-6 border-t border-white/5 space-y-4">
            <button 
              onClick={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <SettingsIcon className="w-4 h-4" />
              {i18n.language === 'ar' ? 'English' : 'العربية'}
            </button>
            <button 
              onClick={logout}
              className="w-full px-4 py-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors text-sm font-bold"
            >
              {t('auth.logout')}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <header className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold">
                {i18n.language === 'ar' ? `أهلاً، ${user?.fullName || 'مستثمرنا'}` : `Welcome, ${user?.fullName || 'Investor'}`}
              </h2>
              {user?.username ? (
                <p className="text-slate-400 text-sm mt-0.5">@{user.username}</p>
              ) : (
                <p className="text-slate-400">{i18n.language === 'ar' ? 'إليك نظرة سريعة على استثماراتك اليوم' : 'Here is a quick look at your investments today'}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Theme toggle - compact header version */}
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
              {!profileComplete && (
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">{i18n.language === 'ar' ? 'اكتمال الملف' : 'Profile Completion'}</p>
                  <div className="w-32 h-2 bg-slate-800 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${profileCompletion}%` }} />
                  </div>
                </div>
              )}
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
