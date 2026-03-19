import React from 'react';
import { View, Text, Pressable, ScrollView, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import {
  User, Shield, Bell, CreditCard, LogOut,
  ChevronRight, ChevronLeft, Moon, Sun, Monitor,
  LifeBuoy, Gift, Trophy, Fingerprint,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import { Badge } from '../../components/ui/Badge';
import apiClient from '../../lib/api/client';

type ThemeOption = 'dark' | 'light' | 'system';

const PLAN_LABELS: Record<string, string> = {
  free: 'مجاني', pro: 'Pro', yearly: 'Pro سنوي',
  ultra: 'Ultra', ultra_yearly: 'Ultra سنوي',
};

function MenuItem({
  icon: Icon,
  label,
  sub,
  onPress,
  danger = false,
  iconColor,
  badge,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  sub?: string;
  onPress: () => void;
  danger?: boolean;
  iconColor?: string;
  badge?: number;
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
        style={{ backgroundColor: danger ? '#f8717115' : `${ic}18` }}
      >
        <Icon size={16} color={ic} />
      </View>
      <View className="flex-1">
        <Text style={{ color: danger ? '#f87171' : colors.text }} className="text-sm font-medium">{label}</Text>
        {sub && <Text style={{ color: colors.textMuted }} className="text-xs mt-0.5">{sub}</Text>}
      </View>
      <View className="flex-row items-center gap-2">
        {badge != null && badge > 0 && (
          <View className="bg-brand px-1.5 py-0.5 rounded-full min-w-[18px] items-center">
            <Text className="text-[10px] font-bold text-white">{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
        {!danger && <ChevronIcon size={14} color={colors.textMuted} />}
      </View>
    </Pressable>
  );
}

function Section({
  title, children, last = false,
}: { title?: string; children: React.ReactNode; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View className={`mx-4 ${last ? '' : 'mb-3'}`}>
      {title && (
        <Text style={{ color: colors.textSub, fontSize: 13, fontWeight: '700', paddingHorizontal: 4, marginBottom: 8 }}>
          {title}
        </Text>
      )}
      <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl overflow-hidden">
        {children}
      </View>
    </View>
  );
}

export default function ProfilePage() {
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

  const THEME_OPTIONS: { id: ThemeOption; label: string; Icon: typeof Moon }[] = [
    { id: 'dark',   label: 'داكن',   Icon: Moon    },
    { id: 'system', label: 'تلقائي', Icon: Monitor },
    { id: 'light',  label: 'فاتح',   Icon: Sun     },
  ];

  const currentTheme = (user?.theme as ThemeOption | undefined) ?? 'system';
  const planLabel = PLAN_LABELS[user?.plan ?? 'free'] ?? 'مجاني';
  const isPro = user?.plan && user.plan !== 'free';

  return (
    <ScreenWrapper padded={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: 36 }} showsVerticalScrollIndicator={false}>

        {/* ─── Header ─── */}
        <View style={{ borderBottomColor: colors.border, borderBottomWidth: 1, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14 }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>حسابي</Text>
        </View>

        {/* ─── Profile Card ─── */}
        <View className="px-4 pt-4 pb-3">
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl p-4">
            <View className="flex-row items-center gap-4">
              {/* Avatar */}
              <View className="w-16 h-16 rounded-full bg-brand/20 items-center justify-center">
                <Text className="text-2xl font-bold text-brand">
                  {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
                </Text>
              </View>

              {/* Info */}
              <View className="flex-1 gap-0.5">
                <Text style={{ color: colors.text }} className="text-base font-bold" numberOfLines={1}>
                  {user?.fullName ?? '—'}
                </Text>
                <Text style={{ color: colors.textSub }} className="text-sm">
                  @{user?.username ?? '—'}
                </Text>
                <View className="flex-row items-center gap-2 mt-1.5">
                  <Badge label={user?.plan ?? 'free'} />
                  {user?.planExpiresAt && (
                    <Text style={{ color: colors.textMuted }} className="text-[10px]">
                      حتى {new Date(user.planExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  )}
                </View>
              </View>

              {/* Edit */}
              <Pressable
                onPress={() => router.push('/settings/account')}
                style={{ backgroundColor: colors.hover, borderColor: colors.border }}
                className="border rounded-xl px-3 py-1.5"
              >
                <Text style={{ color: colors.textSub }} className="text-xs font-medium">تعديل</Text>
              </Pressable>
            </View>

            {/* Stats row */}
            <View style={{ borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', marginTop: 16, paddingTop: 14 }}>
              {[
                { label: 'الخطة', value: planLabel, color: isPro ? '#8b5cf6' : colors.textSub },
                { label: 'التحليلات', value: String(user?.aiAnalysisUsedThisMonth ?? 0), color: colors.text },
              ].map((s, i) => (
                <View
                  key={s.label}
                  style={i === 0 ? { borderRightColor: colors.border, borderRightWidth: 1 } : undefined}
                  className="flex-1 items-center"
                >
                  <Text style={{ color: s.color }} className="text-sm font-bold">{s.value}</Text>
                  <Text style={{ color: colors.textMuted }} className="text-xs mt-0.5">{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ─── Theme Switcher ─── */}
        <View className="px-4 mb-3">
          <Text style={{ color: colors.textSub, fontSize: 13, fontWeight: '700', paddingHorizontal: 4, marginBottom: 8 }}>
            المظهر
          </Text>
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl p-1.5 flex-row gap-1">
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

        {/* ─── Account ─── */}
        <Section title="الحساب">
          <MenuItem icon={User}        label="البيانات الشخصية"  sub={user?.email ?? user?.phone ?? ''} onPress={() => router.push('/settings/account')}       iconColor="#8b5cf6" />
          <MenuItem icon={CreditCard}  label="الاشتراك والخطة"   sub={planLabel}                        onPress={() => router.push('/settings/subscription')}  iconColor="#4ade80" />
          <MenuItem icon={Gift}        label="برنامج الإحالة"    sub="ادعُ أصدقاء واحصل على Pro مجاناً" onPress={() => router.push('/referral' as never)}               iconColor="#f59e0b" />
          <MenuItem icon={Trophy}      label="إنجازاتي"           sub="اكتشف ما أنجزته حتى الآن"         onPress={() => router.push('/achievements' as never)}           iconColor="#f59e0b" />
        </Section>

        {/* ─── Security ─── */}
        <Section title="الأمان">
          <MenuItem icon={Shield}      label="الأمان والخصوصية"  sub="كلمة المرور و2FA"                 onPress={() => router.push('/settings/security')}      iconColor="#f59e0b" />
          <MenuItem icon={Fingerprint} label="البصمة والـ PIN"    sub="ادخل بسرعة بالبصمة أو PIN"       onPress={() => router.push('/settings/biometric')}     iconColor="#3b82f6" />
        </Section>

        {/* ─── Support & Notifications ─── */}
        <Section title="المساعدة">
          <MenuItem icon={Bell}        label="الإشعارات"          sub="تخصيص ما تستقبله"                onPress={() => router.push('/settings/notifications')} iconColor="#8b5cf6" />
          <MenuItem icon={LifeBuoy}    label="الدعم الفني"         sub="تواصل مع فريق الدعم"             onPress={() => router.push('/support' as never)}                iconColor="#38bdf8" />
        </Section>

        {/* ─── Logout ─── */}
        <Section last>
          <MenuItem icon={LogOut} label="تسجيل الخروج" onPress={handleLogout} danger />
        </Section>

      </ScrollView>
    </ScreenWrapper>
  );
}
