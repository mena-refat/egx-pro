import React from 'react';
import { View, Text, Pressable, ScrollView, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import {
  User, Shield, Bell, CreditCard, LogOut,
  ChevronRight, ChevronLeft, Settings, Moon, Sun, Monitor,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import { Badge } from '../../components/ui/Badge';
import apiClient from '../../lib/api/client';

type ThemeOption = 'dark' | 'light' | 'system';

function MenuItem({
  icon: Icon,
  label,
  sub,
  onPress,
  danger = false,
  iconColor,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  sub?: string;
  onPress: () => void;
  danger?: boolean;
  iconColor?: string;
}) {
  const { colors } = useTheme();
  const ChevronIcon = I18nManager.isRTL ? ChevronRight : ChevronLeft;
  const ic = danger ? '#f87171' : (iconColor ?? colors.textSub);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { borderBottomColor: colors.border2, backgroundColor: pressed ? colors.hover : 'transparent' },
      ]}
      className="flex-row items-center gap-3 px-4 py-3.5 border-b"
    >
      <View
        className="w-9 h-9 rounded-xl items-center justify-center"
        style={{ backgroundColor: danger ? '#f8717115' : `${ic}15` }}
      >
        <Icon size={16} color={ic} />
      </View>
      <View className="flex-1">
        <Text style={{ color: danger ? '#f87171' : colors.text }} className="text-sm font-medium">{label}</Text>
        {sub && <Text style={{ color: colors.textMuted }} className="text-xs mt-0.5">{sub}</Text>}
      </View>
      {!danger && <ChevronIcon size={14} color={colors.textMuted} />}
    </Pressable>
  );
}

function Section({
  title,
  children,
  last = false,
}: {
  title?: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View className={`mx-4 ${last ? '' : 'mb-3'}`}>
      {title && (
        <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider px-1 mb-2">
          {title}
        </Text>
      )}
      <View
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
        className="border rounded-2xl overflow-hidden"
      >
        {children}
      </View>
    </View>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuthStore();
  const { colors, isDark } = useTheme();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const setTheme = async (theme: ThemeOption) => {
    updateUser({ theme });
    try { await apiClient.put('/api/user/profile', { theme }); } catch { /* ignore */ }
  };

  const THEME_OPTIONS: { id: ThemeOption; label: string; Icon: typeof Moon }[] = [
    { id: 'dark',   label: 'داكن',   Icon: Moon    },
    { id: 'system', label: 'تلقائي', Icon: Monitor },
    { id: 'light',  label: 'فاتح',   Icon: Sun     },
  ];

  const currentTheme = (user?.theme as ThemeOption | undefined) ?? 'system';

  return (
    <ScreenWrapper padded={false}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header ─── */}
        <View
          style={{ borderBottomColor: colors.border, borderBottomWidth: 0.5 }}
          className="px-4 pt-5 pb-4"
        >
          <Text style={{ color: colors.text }} className="text-xl font-bold">حسابي</Text>
        </View>

        {/* ─── Profile Card ─── */}
        <View className="px-4 pt-4 pb-3">
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border rounded-2xl p-5"
          >
            <View className="flex-row items-center gap-4">
              <View className="w-16 h-16 rounded-full bg-brand/20 items-center justify-center">
                <Text className="text-2xl font-bold text-brand">
                  {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
                </Text>
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className="text-base font-bold">
                  {user?.fullName ?? '—'}
                </Text>
                <Text style={{ color: colors.textSub }} className="text-sm mt-0.5">
                  @{user?.username ?? '—'}
                </Text>
                <View className="mt-2">
                  <Badge label={user?.plan ?? 'free'} />
                </View>
              </View>
              <Pressable
                onPress={() => router.push('/settings/account')}
                style={{ backgroundColor: colors.hover, borderColor: colors.border }}
                className="border rounded-xl px-3 py-1.5"
              >
                <Text style={{ color: colors.textSub }} className="text-xs font-medium">تعديل</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ─── Theme Switcher ─── */}
        <View className="px-4 mb-3">
          <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider px-1 mb-2">
            المظهر
          </Text>
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border rounded-2xl p-1.5 flex-row gap-1"
          >
            {THEME_OPTIONS.map(({ id, label, Icon }) => {
              const active = currentTheme === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setTheme(id)}
                  className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl"
                  style={{ backgroundColor: active ? '#8b5cf6' : 'transparent' }}
                >
                  <Icon size={13} color={active ? '#fff' : colors.textMuted} />
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: active ? '#fff' : colors.textMuted }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ─── Account Settings ─── */}
        <Section title="الحساب">
          <MenuItem icon={User}       label="البيانات الشخصية"  sub={user?.fullName ?? ''} onPress={() => router.push('/settings/account')}       iconColor="#8b5cf6" />
          <MenuItem icon={Bell}       label="الإشعارات"          onPress={() => router.push('/settings/notifications')} iconColor="#3b82f6" />
          <MenuItem icon={Shield}     label="الأمان و2FA"        sub="كلمة المرور والحماية" onPress={() => router.push('/settings/security')}   iconColor="#f59e0b" />
          <MenuItem icon={CreditCard} label="الاشتراك والخطة"   sub={(user?.plan ?? 'free').toUpperCase()} onPress={() => router.push('/settings/subscription')} iconColor="#4ade80" />
        </Section>

        {/* ─── App Settings ─── */}
        <Section title="التطبيق">
          <MenuItem icon={Settings}   label="الإعدادات"          onPress={() => router.push('/settings')} iconColor={colors.textSub} />
        </Section>

        {/* ─── Logout ─── */}
        <Section last>
          <MenuItem icon={LogOut} label="تسجيل الخروج" onPress={handleLogout} danger />
        </Section>
      </ScrollView>
    </ScreenWrapper>
  );
}
