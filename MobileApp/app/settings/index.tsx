import React from 'react';
import { View, Text, ScrollView, Pressable, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import {
  User, Shield, Bell, CreditCard, Fingerprint,
  ChevronRight, ChevronLeft, Info, LogOut, Trash2, Moon, Sun, Monitor,
  Gift, Trophy, LifeBuoy,
} from 'lucide-react-native';
import { I18nManager } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import apiClient from '../../lib/api/client';

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
  const { colors } = useTheme();
  const ChevronIcon = I18nManager.isRTL ? ChevronRight : ChevronLeft;
  const iconColor = danger ? '#f87171' : colors.textSub;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { borderBottomColor: colors.border2, backgroundColor: pressed ? colors.hover : 'transparent' },
        !last && { borderBottomWidth: 1 },
      ]}
      className="flex-row items-center gap-3 px-4 py-3.5"
    >
      <View
        className="w-9 h-9 rounded-xl items-center justify-center"
        style={{ backgroundColor: danger ? '#f8717115' : `${colors.textSub}15` }}
      >
        <Icon size={16} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text style={{ color: danger ? '#f87171' : colors.text }} className="text-sm font-medium">{label}</Text>
        {sub && <Text style={{ color: colors.textMuted }} className="text-xs mt-0.5">{sub}</Text>}
      </View>
      {!danger && <ChevronIcon size={14} color={colors.textMuted} />}
    </Pressable>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View className="mx-4 mb-3">
      {title && (
        <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider px-1 mb-2">
          {title}
        </Text>
      )}
      <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl overflow-hidden">
        {children}
      </View>
    </View>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuthStore();
  const { colors } = useTheme();

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
    { id: 'dark',   label: 'داكن',   Icon: Moon    },
    { id: 'system', label: 'تلقائي', Icon: Monitor },
    { id: 'light',  label: 'فاتح',   Icon: Sun     },
  ];

  return (
    <ScreenWrapper padded={false}>
      <ScrollView contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: colors.text }} className="text-xl font-bold px-4 mb-5">الإعدادات</Text>

        {/* ─── Theme ─── */}
        <View className="mx-4 mb-3">
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
                  <Text className="text-xs font-semibold" style={{ color: active ? '#fff' : colors.textMuted }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Section title="الحساب">
          <MenuItem icon={User}        label="البيانات الشخصية"  sub={user?.fullName ?? ''}                    onPress={() => router.push('/settings/account')} />
          <MenuItem icon={CreditCard}  label="الاشتراك والخطة"   sub={(user?.plan ?? 'free').toUpperCase()}    onPress={() => router.push('/settings/subscription')} />
          <MenuItem icon={Gift}        label="برنامج الإحالة"    sub="ادعُ أصدقاء — احصل على Pro مجاناً"      onPress={() => router.push('/referral' as never)} />
          <MenuItem icon={Trophy}      label="إنجازاتي"           sub="تتبّع تقدمك ومستواك"                    onPress={() => router.push('/achievements' as never)} last />
        </Section>

        <Section title="الأمان">
          <MenuItem icon={Shield}      label="الأمان والخصوصية"  sub="كلمة المرور و2FA"                        onPress={() => router.push('/settings/security')} />
          <MenuItem icon={Fingerprint} label="البصمة والـ PIN"    sub="ادخل بسرعة بالبصمة أو PIN"             onPress={() => router.push('/settings/biometric')} last />
        </Section>

        <Section title="الإشعارات والدعم">
          <MenuItem icon={Bell}        label="إعدادات الإشعارات" sub="تخصيص ما تستقبله"                       onPress={() => router.push('/settings/notifications')} />
          <MenuItem icon={LifeBuoy}    label="الدعم الفني"        sub="تواصل مع الفريق — متوسط الرد 24س"       onPress={() => router.push('/support' as never)} last />
        </Section>

        <Section title="التطبيق">
          <MenuItem
            icon={Info}
            label="عن التطبيق"
            sub="Borsa v1.0.0"
            onPress={() =>
              Alert.alert(
                'عن التطبيق',
                'Borsa — منصة البورصة المصرية\nالإصدار 1.0.0\n\nتحليلات بالذكاء الاصطناعي وبيانات فورية.',
                [{ text: 'حسناً', style: 'cancel' }],
              )
            }
            last
          />
        </Section>

        <Section>
          <MenuItem icon={LogOut} label="تسجيل الخروج" onPress={handleLogout} danger />
          <MenuItem
            icon={Trash2}
            label="حذف الحساب"
            onPress={() =>
              Alert.alert(
                'حذف الحساب',
                'لحذف حسابك بشكل نهائي تواصل معنا عبر الدعم الفني.',
                [
                  { text: 'إلغاء', style: 'cancel' },
                  { text: 'تواصل مع الدعم', onPress: () => router.push('/support' as never) },
                ],
              )
            }
            danger
            last
          />
        </Section>
      </ScrollView>
    </ScreenWrapper>
  );
}
