import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, PieChart, BarChart3,
  Search, Brain, Crosshair,
  Target, Calculator,
  Users, User as UserIcon,
  ChevronLeft, ChevronRight,
  Settings, LifeBuoy,
  Crown, Zap, Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export type SidebarProps = {
  activeRoute: string;
  collapsed: boolean;
  onToggle: () => void;
  supportUnreadCount?: number;
};

type NavItem = { id: string; path: string; icon: React.ElementType };

// 4 sections - each maps to a clear user mental model
const SECTIONS: { groupKey: string; items: NavItem[] }[] = [
  {
    groupKey: 'overview',
    items: [
      { id: 'dashboard', path: '/',          icon: LayoutDashboard },
      { id: 'portfolio', path: '/portfolio', icon: PieChart        },
      { id: 'market',    path: '/market',    icon: BarChart3       },
    ],
  },
  {
    groupKey: 'research',
    items: [
      { id: 'stocks',      path: '/stocks',      icon: Search    },
      { id: 'ai',          path: '/ai',          icon: Brain     },
      { id: 'predictions', path: '/predictions', icon: Crosshair },
    ],
  },
  {
    groupKey: 'planning',
    items: [
      { id: 'goals',      path: '/goals',      icon: Target     },
      { id: 'calculator', path: '/calculator', icon: Calculator },
    ],
  },
  {
    groupKey: 'social',
    items: [
      { id: 'discover', path: '/discover', icon: Users    },
      { id: 'profile',  path: '/profile',  icon: UserIcon },
    ],
  },
];

// Always pinned at bottom - separated visually from main nav
const BOTTOM_ITEMS: NavItem[] = [
  { id: 'settings', path: '/settings', icon: Settings  },
  { id: 'support',  path: '/support',          icon: LifeBuoy  },
];

function isItemActive(path: string, activeRoute: string): boolean {
  if (path === '/') return activeRoute === '/' || activeRoute === '/dashboard';
  if (path === '/settings/account') return activeRoute.startsWith('/settings');
  if (path === '/ai') return activeRoute === '/ai' || activeRoute.startsWith('/ai/');
  return activeRoute === path || activeRoute.startsWith(path + '/');
}

// ── Premium Subscription button ─────────────────────────────────────────────
function SubscriptionSidebarItem({ collapsed, activeRoute }: { collapsed: boolean; activeRoute: string }) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const plan = useAuthStore((s) => s.user?.plan ?? 'free');

  const isActive  = activeRoute === '/subscription';
  const isUltra   = plan === 'ultra' || plan === 'ultra_yearly';
  const isPro     = plan === 'pro'   || plan === 'yearly';

  const glowColor    = isUltra ? '251,191,36' : '124,58,237';
  const accentBar    = isUltra
    ? 'from-amber-300 via-yellow-300 to-amber-500'
    : 'from-violet-500 via-[var(--brand)] to-indigo-500';
  const iconGradient = isUltra
    ? 'from-amber-400 via-yellow-400 to-amber-500'
    : 'from-[var(--brand)] via-violet-500 to-indigo-600';
  const shimmerColor = isUltra ? 'rgba(251,191,36,0.10)' : 'rgba(167,139,250,0.10)';
  const sparkleColor = isUltra ? '#fbbf24' : '#c4b5fd';
  const PlanIcon     = isUltra ? Crown : isPro ? Zap : Sparkles;

  const cardBg     = isUltra
    ? 'from-amber-950/50 via-amber-900/20 to-[var(--bg-sidebar)]'
    : 'from-violet-950/50 via-indigo-900/20 to-[var(--bg-sidebar)]';
  const cardBorder = isActive
    ? (isUltra ? 'border-amber-400/70' : 'border-[var(--brand)]/70')
    : (isUltra ? 'border-amber-400/30' : 'border-violet-500/30');

  const planLabel = isUltra ? 'Ultra' : isPro ? 'Pro' : t('billing.planFreeName');
  const planCls   = isUltra
    ? 'bg-amber-500/15 text-amber-400 border border-amber-400/30'
    : isPro
      ? 'bg-[var(--brand)]/15 text-[var(--brand)] border border-[var(--brand)]/30'
      : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)]';

  const sparkles = [
    { top: '20%', right: '12%', delay: 0,   size: 'w-1 h-1'     },
    { top: '65%', right: '8%',  delay: 1.4, size: 'w-0.5 h-0.5' },
    { top: '42%', right: '22%', delay: 2.6, size: 'w-0.5 h-0.5' },
    { top: '78%', right: '16%', delay: 0.7, size: 'w-1 h-1'     },
  ];

  if (collapsed) {
    return (
      <div className="px-2 pb-2">
        <motion.button
          type="button"
          title={t('nav.subscription')}
          onClick={() => navigate('/subscription')}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          className="relative w-full flex items-center justify-center p-2 rounded-xl overflow-hidden"
        >
          {/* Ambient glow */}
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            animate={{
              boxShadow: [
                `0 0 0px 0px rgba(${glowColor},0)`,
                `0 0 18px 4px rgba(${glowColor},0.22)`,
                `0 0 0px 0px rgba(${glowColor},0)`,
              ],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Rotating ring */}
          <div className="relative">
            <motion.div
              className="absolute -inset-1 rounded-lg opacity-50"
              style={{
                background: isUltra
                  ? 'conic-gradient(from 0deg, #fbbf24, #f59e0b, #fde68a, #fbbf24)'
                  : 'conic-gradient(from 0deg, #7c3aed, #a78bfa, #6366f1, #7c3aed)',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className={`relative w-[22px] h-[22px] rounded-lg bg-gradient-to-br ${iconGradient} flex items-center justify-center`}
              animate={{
                boxShadow: [
                  `0 2px 8px rgba(${glowColor},0.3)`,
                  `0 4px 18px rgba(${glowColor},0.6)`,
                  `0 2px 8px rgba(${glowColor},0.3)`,
                ],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <PlanIcon className="w-3 h-3 text-white" />
            </motion.div>
          </div>
        </motion.button>
      </div>
    );
  }

  return (
    <div className="px-2 pb-2">
      <motion.button
        type="button"
        onClick={() => navigate('/subscription')}
        whileHover={{ scale: 1.018, y: -2 }}
        whileTap={{ scale: 0.982 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`relative w-full overflow-hidden rounded-xl border bg-gradient-to-br ${cardBg} ${cardBorder} text-start`}
      >
        {/* Ambient glow pulse */}
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{
            boxShadow: [
              `0 0 0px 0px rgba(${glowColor},0)`,
              `0 0 22px 5px rgba(${glowColor},0.16)`,
              `0 0 6px 1px rgba(${glowColor},0.07)`,
              `0 0 22px 5px rgba(${glowColor},0.16)`,
              `0 0 0px 0px rgba(${glowColor},0)`,
            ],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Sweep shimmer */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(108deg, transparent 30%, ${shimmerColor} 48%, rgba(255,255,255,0.05) 52%, transparent 70%)`,
            skewX: '-10deg',
          }}
          animate={{ x: ['-140%', '240%'] }}
          transition={{ duration: 4.5, repeat: Infinity, repeatDelay: 6, ease: 'easeInOut' }}
        />

        {/* Top accent bar */}
        <motion.div
          className={`absolute top-0 start-0 end-0 h-[2px] bg-gradient-to-r ${accentBar} rounded-t-xl`}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Radial corner glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 70% 70% at 95% 10%, rgba(${glowColor},0.12), transparent 70%)` }}
        />

        {/* Sparkles */}
        {sparkles.map((sp, i) => (
          <motion.div
            key={i}
            className={`absolute ${sp.size} rounded-full pointer-events-none`}
            style={{ top: sp.top, right: sp.right, background: sparkleColor }}
            animate={{ opacity: [0, 0.9, 0.2, 0.9, 0], scale: [0.4, 1.6, 0.8, 1.4, 0.4] }}
            transition={{ duration: 3.8, repeat: Infinity, delay: sp.delay, ease: 'easeInOut' }}
          />
        ))}

        {/* Content */}
        <div className="relative flex items-center gap-2.5 px-3 py-2.5">
          {/* Icon with rotating ring */}
          <div className="relative shrink-0">
            <motion.div
              className="absolute -inset-1 rounded-lg opacity-55"
              style={{
                background: isUltra
                  ? 'conic-gradient(from 0deg, #fbbf24, #f59e0b, #fde68a, #fbbf24)'
                  : 'conic-gradient(from 0deg, #7c3aed, #a78bfa, #6366f1, #7c3aed)',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className={`relative w-8 h-8 rounded-lg bg-gradient-to-br ${iconGradient} flex items-center justify-center shadow-md`}
              animate={{
                boxShadow: [
                  `0 3px 10px rgba(${glowColor},0.25)`,
                  `0 5px 22px rgba(${glowColor},0.55)`,
                  `0 3px 10px rgba(${glowColor},0.25)`,
                ],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <PlanIcon className="w-4 h-4 text-white drop-shadow" />
            </motion.div>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                {t('nav.subscription')}
              </span>
              <motion.span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${planCls}`}
                animate={{ opacity: [0.75, 1, 0.75] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                {planLabel}
              </motion.span>
            </div>
            {!isPro && !isUltra && (
              <motion.span
                className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r ${iconGradient} text-white mt-0.5`}
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkles className="w-2 h-2" />
                Upgrade
              </motion.span>
            )}
          </div>

          {/* Animated arrow */}
          <motion.div
            animate={{ x: [0, 3, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="shrink-0"
          >
            <ChevronRight className={`w-3.5 h-3.5 ${isUltra ? 'text-amber-400' : 'text-[var(--brand)]'}`} />
          </motion.div>
        </div>
      </motion.button>
    </div>
  );
}

export function Sidebar({ activeRoute, collapsed, onToggle, supportUnreadCount = 0 }: SidebarProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  const renderItem = (item: NavItem) => {
    const isActive = isItemActive(item.path, activeRoute);
    const label = t(`nav.${item.id}`);
    const isSupportWithUnread = item.id === 'support' && supportUnreadCount > 0;

    return (
      <button
        key={item.id}
        title={collapsed ? label : undefined}
        onClick={() => navigate(item.path)}
        className={`
          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
          ${collapsed ? 'justify-center' : ''}
          ${isActive
            ? 'bg-[var(--brand)] text-[var(--text-inverse)] shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
          }
        `}
      >
        <div className="relative shrink-0">
          <item.icon className="w-[18px] h-[18px]" />
          {isSupportWithUnread && (
            <span className="absolute -top-1 -end-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[var(--bg-sidebar)]" />
          )}
        </div>
        {!collapsed && (
          <>
            <span className="flex-1 text-sm font-medium truncate text-start">{label}</span>
            {isSupportWithUnread && (
              <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {supportUnreadCount}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <aside
      className={`
        hidden md:flex
        flex-shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border)]
        flex-col transition-[width] duration-300 ease-in-out overflow-hidden
        ${collapsed ? 'md:w-[60px]' : 'md:w-56'}
      `}
    >
      {/* Logo */}
      <div className="px-3 py-3 flex items-center justify-between gap-2 border-b border-[var(--border-subtle)]">
        <div className={`flex items-center gap-2 min-w-0 overflow-hidden ${collapsed ? 'justify-center w-full' : ''}`}>
          <img src="/borsa-logo.webp" alt="" width={32} height={32} className="w-8 h-8 shrink-0 object-contain" aria-hidden loading="lazy" />
          {!collapsed && (
            <h1 className="text-lg font-bold tracking-tight truncate">{t('common.appName')}</h1>
          )}
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="shrink-0 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
            aria-label={t('nav.collapseSidebar')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-2.5 space-y-2.5 overflow-hidden">
        {SECTIONS.map((section, i) => (
          <div key={section.groupKey}>
            {/* Section label - hidden when collapsed */}
            {!collapsed && i > 0 && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] select-none">
                {t(`nav_group.${section.groupKey}`)}
              </p>
            )}
            {collapsed && i > 0 && (
              <div className="mx-auto w-6 h-px bg-[var(--border)] mb-2" />
            )}
            <div className="space-y-0.5">
              {section.items.map(renderItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Subscription — premium entry point ── */}
      <div className="border-t border-[var(--border-subtle)] pt-1.5">
        <SubscriptionSidebarItem collapsed={collapsed} activeRoute={activeRoute} />
      </div>

      {/* Bottom pinned: Settings + Support */}
      <div className="px-2 pb-2 pt-1.5 border-t border-[var(--border-subtle)] space-y-0.5">
        {BOTTOM_ITEMS.map(renderItem)}
        {collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="w-full flex items-center justify-center p-2 mt-1 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
            aria-label={t('nav.expandSidebar')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
