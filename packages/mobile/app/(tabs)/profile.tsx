import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  User, Shield, Bell, CreditCard, LogOut,
  ChevronRight, ChevronLeft,
  LifeBuoy, Gift, Trophy, Fingerprint, Users, Globe,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import { Badge } from '../../components/ui/Badge';
import {
  BRAND, BRAND_BG_STRONG,
  FONT, WEIGHT, RADIUS, SPACE,
} from '../../lib/theme';
import { usePredictionScore } from '../../hooks/usePredictionScore';
import { useNewAchievementsCount } from '../../hooks/useNewAchievementsCount';
import { ProfileCompletionBanner } from '../../components/shared/ProfileCompletionBanner';

// ─── MenuItem ────────────────────────────────────────────────────
function MenuItem({
  icon: Icon, label, sub, onPress, danger = false, iconColor, badge,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  sub?: string;
  onPress: () => void;
  danger?: boolean;
  iconColor?: string;
  badge?: number;
}) {
  const { colors, isRTL } = useTheme();
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;
  const ic = danger ? '#f87171' : (iconColor ?? colors.textSub);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.hover : 'transparent',
        borderBottomWidth: 1, borderBottomColor: colors.border,
        flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: SPACE.md,
        paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
      })}
    >
      <View style={{ width: 36, height: 36, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? '#f8717115' : ic + '18' }}>
        <Icon size={16} color={ic} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: danger ? '#f87171' : colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.medium }}>
          {label}
        </Text>
        {sub && <Text style={{ color: colors.textMuted, fontSize: FONT.xs, marginTop: 1 }}>{sub}</Text>}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
        {badge != null && badge > 0 && (
          <View style={{ backgroundColor: BRAND, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full, minWidth: 18, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: WEIGHT.bold, color: '#fff' }}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
        {!danger && <ChevronIcon size={14} color={colors.textMuted} />}
      </View>
    </Pressable>
  );
}

// ─── Section ─────────────────────────────────────────────────────
function Section({ title, children, last = false }: { title?: string; children: React.ReactNode; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginHorizontal: SPACE.lg, marginBottom: last ? 0 : SPACE.md }}>
      {title && (
        <Text style={{ color: colors.textSub, fontSize: FONT.sm, fontWeight: WEIGHT.bold, paddingHorizontal: 4, marginBottom: SPACE.sm }}>
          {title}
        </Text>
      )}
      <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: RADIUS.xl, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

// ─── ProfilePage ─────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { colors, isRTL } = useTheme();
  const { t } = useTranslation();
  const { score: predictionAccuracyRate, loading: predictionLoading } = usePredictionScore();
  const newAchievementsCount = useNewAchievementsCount();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const getPlanLabel = (plan: string) => ({
    free: t('profile.planFree'),
    pro: 'Pro',
    yearly: t('profile.planProYearly'),
    ultra: 'Ultra',
    ultra_yearly: t('profile.planUltraYearly'),
  }[plan] ?? t('profile.planFree'));

  const planLabel    = getPlanLabel(user?.plan ?? 'free');
  const isPro        = user?.plan && user.plan !== 'free';
  const initial      = user?.fullName?.[0]?.toUpperCase() ?? 'U';

  return (
    <ScreenWrapper padded={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: 36 }} showsVerticalScrollIndicator={false}>

        {/* ─── Header ─── */}
        <View style={{ borderBottomColor: colors.border, borderBottomWidth: 1, paddingHorizontal: SPACE.lg, paddingTop: 18, paddingBottom: 14 }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: WEIGHT.extrabold }}>{t('profile.myAccount')}</Text>
        </View>

        {/* ─── Avatar Hero ─── */}
        <View style={{ paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg, paddingBottom: SPACE.sm }}>
          <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: RADIUS['2xl'], padding: SPACE.lg }}>

            {/* Avatar + info row */}
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: SPACE.lg }}>
              <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: BRAND_BG_STRONG, borderWidth: 2, borderColor: BRAND + '40', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 26, fontWeight: WEIGHT.bold, color: BRAND, textAlign: 'center' }}>
                  {initial}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: FONT.md, fontWeight: WEIGHT.bold }} numberOfLines={1}>
                  {user?.fullName ?? '—'}
                </Text>
                <Text style={{ color: colors.textSub, fontSize: FONT.sm, marginTop: 2 }}>
                  @{user?.username ?? '—'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.sm }}>
                  <Badge label={user?.plan ?? 'free'} />
                  {user?.planExpiresAt && (
                    <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                      {t('profile.until', { date: new Date(user.planExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })}
                    </Text>
                  )}
                </View>
              </View>

              <Pressable
                onPress={() => router.push('/settings/account')}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? colors.hover : colors.bg,
                  borderWidth: 1, borderColor: colors.border,
                  borderRadius: RADIUS.md, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm,
                })}
              >
                <Text style={{ color: colors.textSub, fontSize: FONT.xs, fontWeight: WEIGHT.medium }}>{t('profile.edit')}</Text>
              </Pressable>
            </View>

            {/* Stats row */}
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, marginTop: SPACE.lg, paddingTop: SPACE.md }}>
              {[
                { label: t('profile.plan'),      value: planLabel,                          color: isPro ? BRAND : colors.textSub },
                { label: t('profile.analysesUsed'),  value: String(user?.aiAnalysisUsedThisMonth ?? 0), color: colors.text },
                {
                  label: t('profile.predictionScore'),
                  value:
                    predictionLoading
                      ? '—'
                      : predictionAccuracyRate != null
                        ? `${Math.round(predictionAccuracyRate)}%`
                        : '—',
                  color: colors.text,
                },
              ].map((s, i, arr) => (
                <View
                  key={s.label}
                  style={{
                    flex: 1, alignItems: 'center',
                    borderRightWidth: i < arr.length - 1 ? 1 : 0,
                    borderRightColor: colors.border,
                  }}
                >
                  <Text style={{ color: s.color, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>{s.value}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: FONT.xs, marginTop: 2 }}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* ─── Profile Completion ─── */}
            <ProfileCompletionBanner variant="inline" />

          </View>
        </View>

        {/* ─── Account ─── */}
        <Section title={t('profile.sectionAccount')}>
          <MenuItem icon={User}        label={t('settings.account')}       sub={user?.email ?? user?.phone ?? ''} onPress={() => router.push('/settings/account')}       iconColor={BRAND} />
          <MenuItem icon={CreditCard}  label={t('settings.subscription')}  sub={planLabel}                        onPress={() => router.push('/settings/subscription')}  iconColor="#4ade80" />
          <MenuItem icon={Gift}        label={t('settings.referral')}       sub={t('profile.referralSub')}         onPress={() => router.push('/referral' as never)}       iconColor="#f59e0b" />
          <MenuItem icon={Trophy}      label={t('settings.achievements')}   sub={t('profile.achievementsSub')}     onPress={() => router.push('/achievements' as never)}   iconColor="#f59e0b" badge={newAchievementsCount} />
        </Section>

        {/* ─── Community ─── */}
        <Section title={t('profile.sectionCommunity')}>
          <MenuItem icon={Users}       label={t('profile.communityLabel')}  sub={t('profile.communitySub')}        onPress={() => router.push('/discover' as never)}       iconColor="#3b82f6" />
        </Section>

        {/* ─── Security ─── */}
        <Section title={t('profile.sectionSecurity')}>
          <MenuItem icon={Shield}      label={t('settings.security')}       sub={t('profile.securitySub')}         onPress={() => router.push('/settings/security')}      iconColor="#f59e0b" />
          <MenuItem icon={Fingerprint} label={t('settings.biometric')}      sub={t('profile.biometricSub')}        onPress={() => router.push('/settings/biometric')}     iconColor="#3b82f6" />
        </Section>

        {/* ─── Preferences ─── */}
        <Section title={t('profile.sectionPreferences')}>
          <MenuItem icon={Globe}       label={t('settings.preferencesTitle')} sub={t('profile.preferencesSub')}   onPress={() => router.push('/settings/preferences' as never)} iconColor="#8b5cf6" />
          <MenuItem icon={Bell}        label={t('settings.notificationsSettings')} sub={t('profile.notificationsSub')} onPress={() => router.push('/settings/notifications')} iconColor={BRAND} />
        </Section>

        {/* ─── Support ─── */}
        <Section title={t('profile.sectionHelp')}>
          <MenuItem icon={LifeBuoy}    label={t('settings.support')}        sub={t('profile.supportSub')}          onPress={() => router.push('/support' as never)}        iconColor="#38bdf8" />
        </Section>

        {/* ─── Logout ─── */}
        <Section last>
          <MenuItem icon={LogOut} label={t('auth.logout')} onPress={handleLogout} danger />
        </Section>

      </ScrollView>
    </ScreenWrapper>
  );
}
