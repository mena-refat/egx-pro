import React from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  User, Shield, Bell, CreditCard, Fingerprint,
  ChevronRight, ChevronLeft, Info, LogOut, Trash2, Moon, Sun, Monitor,
  Gift, Trophy, LifeBuoy, Globe, Users,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import apiClient from '../../lib/api/client';
import { FONT, WEIGHT, RADIUS, SPACE } from '../../lib/theme';

type ThemeOption = 'dark' | 'light' | 'system';

interface MenuItemProps {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  sub?: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}

function MenuItem({ icon: Icon, label, sub, onPress, danger, last }: MenuItemProps) {
  const { colors, isRTL } = useTheme();
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;
  const iconColor = danger ? '#f87171' : colors.textSub;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: SPACE.md,
          paddingHorizontal: SPACE.lg,
          paddingVertical: 14,
          borderBottomColor: colors.border2,
          backgroundColor: pressed ? colors.hover : 'transparent',
        },
        !last && { borderBottomWidth: 1 },
      ]}
    >
      <View style={{
        width: 36, height: 36, borderRadius: RADIUS.lg,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: danger ? '#f8717115' : `${colors.textSub}15`,
      }}>
        <Icon size={16} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: danger ? '#f87171' : colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.medium }}>{label}</Text>
        {sub && <Text style={{ color: colors.textMuted, fontSize: FONT.xs, marginTop: 2 }}>{sub}</Text>}
      </View>
      {!danger && <ChevronIcon size={14} color={colors.textMuted} />}
    </Pressable>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginHorizontal: SPACE.lg, marginBottom: SPACE.sm + 2 }}>
      {title && (
        <Text style={{
          color: colors.textMuted, fontSize: FONT.xs, fontWeight: WEIGHT.semibold,
          textTransform: 'uppercase', letterSpacing: 0.8,
          paddingHorizontal: 4, marginBottom: SPACE.sm,
        }}>
          {title}
        </Text>
      )}
      <View style={{
        backgroundColor: colors.card, borderColor: colors.border,
        borderWidth: 1, borderRadius: RADIUS.xl, overflow: 'hidden',
      }}>
        {children}
      </View>
    </View>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuthStore();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const setTheme = async (theme: ThemeOption) => {
    updateUser({ theme });
    try { await apiClient.put('/api/user/profile', { theme }); } catch { /* ignore */ }
  };

  const currentTheme = (user?.theme as ThemeOption | undefined) ?? 'system';

  const THEME_OPTIONS: { id: ThemeOption; label: string; Icon: typeof Moon }[] = [
    { id: 'dark',   label: t('settings.dark'),   Icon: Moon    },
    { id: 'system', label: t('settings.system'), Icon: Monitor },
    { id: 'light',  label: t('settings.light'),  Icon: Sun     },
  ];

  return (
    <ScreenWrapper padded={false}>
      <ScrollView contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: colors.text, fontSize: FONT.xl, fontWeight: WEIGHT.bold, paddingHorizontal: SPACE.lg, marginBottom: 20 }}>
          {t('settings.title')}
        </Text>

        {/* ─── Theme ─── */}
        <View style={{ marginHorizontal: SPACE.lg, marginBottom: SPACE.sm + 2 }}>
          <Text style={{
            color: colors.textMuted, fontSize: FONT.xs, fontWeight: WEIGHT.semibold,
            textTransform: 'uppercase', letterSpacing: 0.8,
            paddingHorizontal: 4, marginBottom: SPACE.sm,
          }}>
            {t('settings.appearance')}
          </Text>
          <View style={{
            backgroundColor: colors.card, borderColor: colors.border,
            borderWidth: 1, borderRadius: RADIUS.xl, padding: 6,
            flexDirection: 'row', gap: 4,
          }}>
            {THEME_OPTIONS.map(({ id, label, Icon }) => {
              const active = currentTheme === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setTheme(id)}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    gap: 6, paddingVertical: 10, borderRadius: RADIUS.lg,
                    backgroundColor: active ? '#8b5cf6' : 'transparent',
                  }}
                >
                  <Icon size={13} color={active ? '#fff' : colors.textMuted} />
                  <Text style={{ fontSize: FONT.xs, fontWeight: WEIGHT.semibold, color: active ? '#fff' : colors.textMuted }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Section title={t('profile.sectionAccount')}>
          <MenuItem icon={User}        label={t('settings.account')}       sub={user?.fullName ?? ''}                    onPress={() => router.push('/settings/account')} />
          <MenuItem icon={CreditCard}  label={t('settings.subscription')}  sub={(user?.plan ?? 'free').toUpperCase()}    onPress={() => router.push('/settings/subscription')} />
          <MenuItem icon={Gift}        label={t('settings.referral')}      sub={t('settings.referralSub')}               onPress={() => router.push('/referral' as never)} />
          <MenuItem icon={Trophy}      label={t('settings.achievements')}  sub={t('settings.achievementsSub')}           onPress={() => router.push('/achievements' as never)} last />
        </Section>

        <Section title={t('profile.sectionSecurity')}>
          <MenuItem icon={Shield}      label={t('settings.security')}      sub={t('settings.securitySub')}               onPress={() => router.push('/settings/security')} />
          <MenuItem icon={Fingerprint} label={t('settings.biometric')}     sub={t('settings.biometricSub')}              onPress={() => router.push('/settings/biometric')} last />
        </Section>

        <Section title={t('settings.preferencesSection')}>
          <MenuItem icon={Globe}       label={t('settings.preferencesLabel')}      sub={t('settings.preferencesSub')}    onPress={() => router.push('/settings/preferences' as never)} />
          <MenuItem icon={Bell}        label={t('settings.notificationsSettings')} sub={t('settings.notificationsSub')}  onPress={() => router.push('/settings/notifications')} last />
        </Section>

        <Section title={t('settings.communitySection')}>
          <MenuItem icon={Users}       label={t('settings.communityLabel')} sub={t('settings.communitySub')}             onPress={() => router.push('/discover' as never)} />
          <MenuItem icon={LifeBuoy}    label={t('settings.support')}        sub={t('settings.supportSub')}               onPress={() => router.push('/support' as never)} last />
        </Section>

        <Section title={t('settings.appSection')}>
          <MenuItem
            icon={Info}
            label={t('settings.about')}
            sub="Borsa v1.0.0"
            onPress={() =>
              Alert.alert(
                t('settings.about'),
                t('settings.aboutContent'),
                [{ text: t('settings.ok'), style: 'cancel' }],
              )
            }
            last
          />
        </Section>

        <Section>
          <MenuItem icon={LogOut} label={t('auth.logout')} onPress={handleLogout} danger />
          <MenuItem
            icon={Trash2}
            label={t('common.delete') + ' ' + t('profile.sectionAccount')}
            sub={t('settings.deleteAccountSub')}
            onPress={() => router.push('/settings/danger' as never)}
            danger
            last
          />
        </Section>
      </ScrollView>
    </ScreenWrapper>
  );
}
