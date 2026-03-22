import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdminStore } from '../store/adminAuthStore';
import { PermissionGuard } from './PermissionGuard';
import { adminApi } from '../lib/adminApi';
import {
  LayoutDashboard,
  Users,
  Tag,
  Headphones,
  Bell,
  ScrollText,
  ShieldCheck,
  LogOut,
  ChevronRight,
  DollarSign,
  Languages,
  Lock,
} from 'lucide-react';

export function AdminLayout() {
  const { t, i18n } = useTranslation();
  const admin   = useAdminStore((s) => s.admin);
  const token   = useAdminStore((s) => s.token);
  const setAuth = useAdminStore((s) => s.setAuth);
  const logout  = useAdminStore((s) => s.logout);
  const hasP    = useAdminStore((s) => s.hasPermission);
  const nav      = useNavigate();
  const location = useLocation();
  const [openTickets, setOpenTickets] = useState(0);

  // Security policy enforcement — block ALL routes until policy is satisfied
  const isBlocked = !!(admin?.mustChangePassword || admin?.mustSetup2FA);
  useEffect(() => {
    if (isBlocked && location.pathname !== '/account') {
      nav('/account', { replace: true });
    }
  }, [isBlocked, location.pathname, nav]);

  // Refresh permissions from server on every mount so stale store data is corrected
  useEffect(() => {
    if (!token || !admin) return;
    adminApi
      .get('/auth/me')
      .then((r) => {
        const fresh = r.data.data;
        if (fresh && token) {
          setAuth(token, {
            id: fresh.id,
            email: fresh.email,
            fullName: fresh.fullName,
            role: fresh.role,
            permissions: fresh.permissions ?? [],
            mustChangePassword: fresh.mustChangePassword ?? false,
            mustSetup2FA: (fresh.mustSetup2FA && !fresh.twoFactorEnabled) ?? false,
          });
        }
      })
      .catch(() => null);
  }, []); // eslint-disable-line

  const NAV = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard, permission: 'analytics.view', end: true },
    { to: '/users', label: t('nav.users'), icon: Users, permission: 'users.view' },
    { to: '/revenue', label: t('nav.revenue'), icon: DollarSign, permission: 'analytics.view' },
    { to: '/discounts', label: t('nav.discounts'), icon: Tag, permission: 'discounts.view' },
    { to: '/support', label: t('nav.support'), icon: Headphones, permission: 'support.view' },
    { to: '/notifications', label: t('nav.broadcast'), icon: Bell, permission: 'notifications.send' },
    ...(admin?.role === 'SUPER_ADMIN' ? [{ to: '/audit', label: t('nav.auditLog'), icon: ScrollText, permission: null }] : []),
    { to: '/account', label: t('nav.accountSecurity'), icon: ShieldCheck, permission: null },
  ];

  useEffect(() => {
    adminApi
      .get('/support/stats')
      .then((r) => setOpenTickets(r.data.data?.open ?? 0))
      .catch(() => setOpenTickets(0));
  }, []);

  const handleLogout = () => {
    // Invalidate token server-side (fire-and-forget — don't block UX)
    adminApi.post('/auth/logout').catch(() => null);
    logout();
    nav('/login');
  };

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');
  };

  const isRtl = i18n.language === 'ar';

  return (
    <div className="min-h-screen flex bg-[#0a0a0f] text-slate-100 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* ── Sidebar ── */}
      <aside className="w-60 shrink-0 flex flex-col border-e border-white/[0.06] bg-[#0d0d14]">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center font-bold text-sm text-white shadow-lg shadow-emerald-900/40">
              B
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">Borsa</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{t('nav.adminPortal')}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {isBlocked ? (
            /* ── Locked sidebar ── */
            <div className="px-3 py-3 rounded-xl bg-amber-500/5 border border-amber-500/15 space-y-2">
              <div className="flex items-center gap-2 text-amber-400">
                <Lock size={13} />
                <span className="text-xs font-semibold">{t('admins.policyBlockedTitle')}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{t('admins.policyBlockedDesc')}</p>
            </div>
          ) : (
            <>
              {NAV.map((item) => {
                if (item.permission && !hasP(item.permission)) return null;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          size={15}
                          className={
                            isActive
                              ? 'text-emerald-400'
                              : 'text-slate-500 group-hover:text-slate-300'
                          }
                        />
                        <span className="flex-1">{item.label}</span>
                        {item.to === '/support' && openTickets > 0 && (
                          <span className="ms-auto px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                            {openTickets}
                          </span>
                        )}
                        {isActive && (
                          <ChevronRight size={12} className={`text-emerald-500/60 ${isRtl ? 'rotate-180' : ''}`} />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}

              {admin?.role === 'SUPER_ADMIN' && (
                <NavLink
                  to="/admins"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <ShieldCheck size={15} className={isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'} />
                      <span className="flex-1">{t('nav.admins')}</span>
                      {isActive && <ChevronRight size={12} className={`text-emerald-500/60 ${isRtl ? 'rotate-180' : ''}`} />}
                    </>
                  )}
                </NavLink>
              )}
            </>
          )}
        </nav>

        {/* Language switcher + User info */}
        <div className="px-4 py-3 border-t border-white/[0.06] space-y-3">
          {/* Language toggle */}
          <button
            onClick={toggleLang}
            aria-label={isRtl ? 'Switch to English' : 'التبديل إلى العربية'}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all"
          >
            <Languages size={13} />
            <span>{isRtl ? 'English' : 'العربية'}</span>
          </button>

          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
              {admin?.fullName?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => nav('/account')}
                className="text-start w-full"
              >
                <p className="text-xs font-medium text-slate-200 truncate">
                  {admin?.fullName}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {admin?.email}
                </p>
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title={t('nav.logout')}
              aria-label={t('nav.logout')}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto">
        {/* Security policy banner */}
        {isBlocked && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex items-center gap-3">
            <Lock size={14} className="text-amber-400 shrink-0" />
            <p className="flex-1 text-xs text-amber-300">
              {admin?.mustChangePassword && admin?.mustSetup2FA
                ? t('admins.bannerBoth')
                : admin?.mustChangePassword
                ? t('admins.bannerChangePassword')
                : t('admins.bannerSetup2FA')}
            </p>
          </div>
        )}
        <div className="max-w-6xl mx-auto px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
