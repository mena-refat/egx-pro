import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { SettingsDirtyProvider, useSettingsDirty } from '../features/settings/SettingsDirtyContext';
import { UnsavedChangesDialog } from '../shared/UnsavedChangesDialog';
import {
  User,
  Shield,
  Sliders,
  CreditCard,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Zap,
  Sparkles,
} from 'lucide-react';

interface SettingCard {
  id: string;
  path: string;
  labelKey: string;
  descKey: string;
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
  iconBg: string;
  iconColor: string;
}

const CARDS: SettingCard[] = [
  {
    id: 'account',
    path: '/settings/account',
    labelKey: 'settings.navAccount',
    descKey:  'settings.navAccountDesc',
    icon: User,
    iconBg: 'bg-[var(--brand)]/10',
    iconColor: 'text-[var(--brand)]',
  },
  {
    id: 'security',
    path: '/settings/security',
    labelKey: 'settings.navSecurity',
    descKey:  'settings.navSecurityDesc',
    icon: Shield,
    iconBg: 'bg-emerald-400/10',
    iconColor: 'text-emerald-400',
  },
  {
    id: 'preferences',
    path: '/settings/preferences',
    labelKey: 'settings.navPreferences',
    descKey:  'settings.navPreferencesDesc',
    icon: Sliders,
    iconBg: 'bg-amber-400/10',
    iconColor: 'text-amber-400',
  },
  {
    id: 'subscription',
    path: '/settings/subscription',
    labelKey: 'settings.navSubscription',
    descKey:  'settings.navSubscriptionDesc',
    icon: CreditCard,
    iconBg: 'bg-sky-400/10',
    iconColor: 'text-sky-400',
  },
  {
    id: 'danger',
    path: '/settings/danger',
    labelKey: 'settings.navDanger',
    descKey:  'settings.navDangerDesc',
    icon: Trash2,
    iconBg: 'bg-[var(--danger)]/10',
    iconColor: 'text-[var(--danger)]',
    danger: true,
  },
];

const PREFS_ALIASES = ['/settings/notifications'];

function getActiveCard(pathname: string): SettingCard | undefined {
  return CARDS.find((c) => {
    if (pathname === c.path) return true;
    if (c.id === 'preferences'  && PREFS_ALIASES.includes(pathname)) return true;
    if (c.id === 'subscription' && ['/settings/perks', '/settings/overview'].includes(pathname)) return true;
    return false;
  });
}

// ── Settings index - card grid ──────────────────────────────────────────────
function SettingsIndex() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('common');
  const isAr = i18n.language?.startsWith('ar');
  const user = useAuthStore((s) => s.user);

  const plan = (user as { plan?: string } | null)?.plan ?? 'free';
  const planBadge =
    plan === 'ultra' || plan === 'ultra_yearly'
      ? { label: 'Ultra ✦', cls: 'bg-amber-500/15 text-amber-400 border border-amber-400/30' }
      : plan === 'pro' || plan === 'yearly'
      ? { label: 'Pro', cls: 'bg-[var(--brand)]/15 text-[var(--brand)] border border-[var(--brand)]/30' }
      : { label: t('settings.freePlan'), cls: 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)]' };

  return (
    <div className="space-y-5" dir={isAr ? 'rtl' : 'ltr'}>
      {/* User pill */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
        <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center shrink-0 overflow-hidden">
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
            : <User className="w-5 h-5 text-[var(--text-muted)]" />
          }
        </div>
        <div className="min-w-0 flex-1">
          {user?.fullName && (
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user.fullName}</p>
          )}
          {user?.username && (
            <p className="text-xs text-[var(--text-muted)] truncate">@{user.username}</p>
          )}
        </div>
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 border ${planBadge.cls}`}>
          {planBadge.label}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {CARDS.map((card) => {
          const Icon = card.icon;

          /* ── Subscription card: special premium design ── */
          if (card.id === 'subscription') {
            const isUltra = plan === 'ultra' || plan === 'ultra_yearly';
            const isPro   = plan === 'pro'   || plan === 'yearly';
            const isFree  = !isUltra && !isPro;

            const glowColor   = isUltra ? '251,191,36' : '124,58,237';
            const accentBar   = isUltra
              ? 'from-amber-300 via-yellow-300 to-amber-500'
              : 'from-violet-500 via-[var(--brand)] to-indigo-500';
            const iconGradient = isUltra
              ? 'from-amber-400 via-yellow-400 to-amber-500'
              : 'from-[var(--brand)] via-violet-500 to-indigo-600';
            const shimmerColor = isUltra ? 'rgba(251,191,36,0.12)' : 'rgba(167,139,250,0.12)';
            const sparkleColor = isUltra ? '#fbbf24' : '#c4b5fd';
            const PlanIcon = isUltra ? Crown : isPro ? Zap : Sparkles;

            // Richer card background
            const cardBg = isUltra
              ? 'from-amber-950/60 via-amber-900/30 to-[var(--bg-card)]'
              : 'from-violet-950/60 via-indigo-900/30 to-[var(--bg-card)]';
            const cardBorder = isUltra
              ? 'border-amber-400/35'
              : 'border-violet-500/35';

            const sparkles = [
              { top: '18%', right: '14%',  delay: 0,   size: 'w-1.5 h-1.5' },
              { top: '60%', right: '8%',   delay: 1.2, size: 'w-1 h-1' },
              { top: '38%', right: '24%',  delay: 2.4, size: 'w-1 h-1' },
              { top: '75%', right: '18%',  delay: 0.6, size: 'w-0.5 h-0.5' },
              { top: '28%', right: '38%',  delay: 1.8, size: 'w-0.5 h-0.5' },
              { top: '52%', right: '32%',  delay: 3.0, size: 'w-1 h-1' },
            ];

            return (
              <motion.button
                key={card.id}
                type="button"
                onClick={() => navigate(card.path)}
                whileHover={{ scale: 1.018, y: -3 }}
                whileTap={{ scale: 0.982 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className={`relative w-full overflow-hidden rounded-2xl border bg-gradient-to-br ${cardBg} ${cardBorder} text-start group`}
              >
                {/* Outer ambient glow pulse */}
                <motion.div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  animate={{
                    boxShadow: [
                      `0 0 0px 0px rgba(${glowColor},0)`,
                      `0 0 28px 6px rgba(${glowColor},0.18)`,
                      `0 0 8px 2px rgba(${glowColor},0.08)`,
                      `0 0 28px 6px rgba(${glowColor},0.18)`,
                      `0 0 0px 0px rgba(${glowColor},0)`,
                    ],
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Slow sweeping shimmer */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(108deg, transparent 30%, ${shimmerColor} 48%, rgba(255,255,255,0.06) 52%, transparent 70%)`,
                    skewX: '-10deg',
                  }}
                  animate={{ x: ['-140%', '240%'] }}
                  transition={{ duration: 4.5, repeat: Infinity, repeatDelay: 5.5, ease: 'easeInOut' }}
                />

                {/* Second shimmer — offset phase */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(108deg, transparent 30%, ${shimmerColor} 50%, transparent 70%)`,
                    skewX: '-10deg',
                  }}
                  animate={{ x: ['-140%', '240%'] }}
                  transition={{ duration: 4.5, repeat: Infinity, repeatDelay: 5.5, ease: 'easeInOut', delay: 5 }}
                />

                {/* Top accent bar (animated gradient) */}
                <motion.div
                  className={`absolute top-0 start-0 end-0 h-[3px] bg-gradient-to-r ${accentBar} rounded-t-2xl`}
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Radial corner glow */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse 70% 70% at 95% 10%, rgba(${glowColor},0.13), transparent 70%)`,
                  }}
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse 50% 50% at 10% 90%, rgba(${glowColor},0.07), transparent 70%)`,
                  }}
                />

                {/* Twinkling sparkle dots */}
                {sparkles.map((sp, i) => (
                  <motion.div
                    key={i}
                    className={`absolute ${sp.size} rounded-full pointer-events-none`}
                    style={{ top: sp.top, right: sp.right, background: sparkleColor }}
                    animate={{
                      opacity: [0, 0.9, 0.3, 0.9, 0],
                      scale:   [0.4, 1.6, 0.8, 1.4, 0.4],
                    }}
                    transition={{ duration: 3.8, repeat: Infinity, delay: sp.delay, ease: 'easeInOut' }}
                  />
                ))}

                {/* Main content */}
                <div className="relative flex items-center gap-4 px-4 py-5">
                  {/* Icon — with rotating ring + pulsing glow */}
                  <div className="relative shrink-0">
                    {/* Rotating gradient ring */}
                    <motion.div
                      className="absolute -inset-1 rounded-xl opacity-60"
                      style={{
                        background: isUltra
                          ? 'conic-gradient(from 0deg, #fbbf24, #f59e0b, #fde68a, #fbbf24)'
                          : 'conic-gradient(from 0deg, #7c3aed, #a78bfa, #6366f1, #7c3aed)',
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.div
                      className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${iconGradient} flex items-center justify-center shadow-lg`}
                      animate={{
                        boxShadow: [
                          `0 4px 14px rgba(${glowColor},0.25)`,
                          `0 6px 28px rgba(${glowColor},0.55)`,
                          `0 4px 14px rgba(${glowColor},0.25)`,
                        ],
                      }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <PlanIcon className="w-6 h-6 text-white drop-shadow" />
                    </motion.div>
                  </div>

                  {/* Text block */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[var(--text-primary)] tracking-wide">
                        {t(card.labelKey)}
                      </p>
                      <motion.span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${planBadge.cls}`}
                        animate={{ opacity: [0.75, 1, 0.75] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        {planBadge.label}
                      </motion.span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                      {isFree ? t('settings.navSubscriptionDesc') : t('billing.expiresOn', { date: plan })}
                    </p>
                    {/* CTA tag for free users */}
                    {isFree && (
                      <motion.div
                        className={`inline-flex items-center gap-1 mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${iconGradient} text-white`}
                        animate={{ opacity: [0.85, 1, 0.85] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        Upgrade Now
                      </motion.div>
                    )}
                  </div>

                  {/* Arrow */}
                  <motion.div
                    animate={{ x: isAr ? [0, -3, 0] : [0, 3, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {isAr
                      ? <ChevronLeft  className={`w-5 h-5 shrink-0 ${isUltra ? 'text-amber-400' : 'text-[var(--brand)]'}`} />
                      : <ChevronRight className={`w-5 h-5 shrink-0 ${isUltra ? 'text-amber-400' : 'text-[var(--brand)]'}`} />
                    }
                  </motion.div>
                </div>
              </motion.button>
            );
          }

          /* ── Regular cards ── */
          return (
            <React.Fragment key={card.id}>
              {/* Danger zone separator */}
              {card.danger && (
                <div className="pt-4 pb-1 flex items-center gap-3">
                  <div className="flex-1 h-px bg-[var(--danger)]/20" />
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--danger)]/70 uppercase tracking-widest select-none">
                    <Trash2 className="w-3 h-3" />
                    {t('settings.dangerZone') ?? 'Danger Zone'}
                  </span>
                  <div className="flex-1 h-px bg-[var(--danger)]/20" />
                </div>
              )}

              <button
                type="button"
                onClick={() => navigate(card.path)}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border transition-all text-start group
                  ${card.danger
                    ? 'bg-[var(--bg-card)] border-[var(--danger)]/20 hover:border-[var(--danger)]/50 hover:bg-[var(--danger-bg)]'
                    : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-[var(--brand)]/30 hover:bg-[var(--bg-card-hover)]'
                  }
                `}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${card.danger ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>
                    {t(card.labelKey)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{t(card.descKey)}</p>
                </div>
                {isAr
                  ? <ChevronLeft  className={`w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-0.5 ${card.danger ? 'text-[var(--danger)]/50' : 'text-[var(--text-muted)]'}`} />
                  : <ChevronRight className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5  ${card.danger ? 'text-[var(--danger)]/50' : 'text-[var(--text-muted)]'}`} />
                }
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── Sub-page wrapper with back button ───────────────────────────────────────
function SettingsSubPage({ card }: { card: SettingCard }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('common');
  const isAr = i18n.language?.startsWith('ar');
  const Icon = card.icon;
  const { isDirty, clearAll } = useSettingsDirty();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleBack() {
    if (isDirty) {
      setConfirmOpen(true);
    } else {
      navigate('/settings');
    }
  }

  return (
    <div className="space-y-5" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors shrink-0"
          aria-label={t('settings.back')}
        >
          {isAr
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft  className="w-4 h-4" />
          }
        </button>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${card.iconBg} shrink-0`}>
          <Icon className={`w-4 h-4 ${card.iconColor}`} />
        </div>
        <h2 className={`text-base font-bold ${card.danger ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>
          {t(card.labelKey)}
        </h2>
      </div>

      <Outlet />

      <UnsavedChangesDialog
        isOpen={confirmOpen}
        onStay={() => setConfirmOpen(false)}
        onLeave={() => {
          clearAll();
          setConfirmOpen(false);
          navigate('/settings');
        }}
      />
    </div>
  );
}

// ── Main layout ──────────────────────────────────────────────────────────────
export default function SettingsLayout() {
  const location = useLocation();
  const isIndex  = location.pathname === '/settings' || location.pathname === '/settings/';
  const activeCard = getActiveCard(location.pathname);

  return (
    <SettingsDirtyProvider>
      <div className="max-w-4xl mx-auto">
        {isIndex
          ? <SettingsIndex />
          : activeCard
            ? <SettingsSubPage card={activeCard} />
            : <Outlet />
        }
      </div>
    </SettingsDirtyProvider>
  );
}
