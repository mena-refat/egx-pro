import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { SettingsDirtyProvider, useSettingsDirty } from '../features/settings/SettingsDirtyContext';
import { UnsavedChangesDialog } from '../shared/UnsavedChangesDialog';
import {
  User,
  Shield,
  Sliders,
  Trash2,
  ChevronLeft,
  ChevronRight,
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
    if (c.id === 'preferences' && PREFS_ALIASES.includes(pathname)) return true;
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

          /* ── Regular cards ── */
          return (
            <React.Fragment key={card.id}>
              {/* Danger zone separator */}
              {card.danger && (
                <div className="pt-8 pb-1 flex items-center gap-3">
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
