import React from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  User, Shield, Bell, CreditCard, Fingerprint,
  ChevronRight, ChevronLeft, Info, LogOut, Trash2, Moon, Sun, Monitor,
  Gift, Trophy, LifeBuoy, Globe, Users,
} from 'lucide-react-native';
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
        <Text style={{ color: colors.text, fontSize: FONT.xl, fontWeight: WEIGHT.bold, paddingHorizontal: SPACE.lg, marginBottom: 20 }}>
          الإعدادات
        </Text>

        {/* ─── Theme ─── */}
        <View style={{ marginHorizontal: SPACE.lg, marginBottom: SPACE.sm + 2 }}>
          <Text style={{
            color: colors.textMuted, fontSize: FONT.xs, fontWeight: WEIGHT.semibold,
            textTransform: 'uppercase', letterSpacing: 0.8,
            paddingHorizontal: 4, marginBottom: SPACE.sm,
          }}>
            المظهر
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

        <Section title="الحساب">
          <MenuItem icon={User}        label="البيانات الشخصية"  sub={user?.fullName ?? ''}                    onPress={() => router.push('/settings/account')} />
          <MenuItem icon={CreditCard}  label="الاشتراك والخطة"   sub={(user?.plan ?? 'free').toUpperCase()}    onPress={() => router.push('/settings/subscription')} />
          <MenuItem icon={Gift}        label="برنامج الإحالة"    sub="ادعُ أصدقاء — احصل على Pro مجاناً"      onPress={() => router.push('/referral' as never)} />
          <MenuItem icon={Trophy}      label="إنجازاتي"           sub="تتبّع تقدمك ومستواك"                    onPress={() => router.push('/achievements' as never)} last />
        </Section>

        <Section title="الأمان">
          <MenuItem icon={Shield}      label="الأمان والخصوصية"  sub="كلمة المرور والمصادقة الثنائية"          onPress={() => router.push('/settings/security')} />
          <MenuItem icon={Fingerprint} label="البصمة والـ PIN"    sub="ادخل بسرعة بالبصمة أو PIN"             onPress={() => router.push('/settings/biometric')} last />
        </Section>

        <Section title="التفضيلات والخصوصية">
          <MenuItem icon={Globe}       label="اللغة والخصوصية"   sub="اللغة والوضع الإسلامي وإعدادات الظهور"  onPress={() => router.push('/settings/preferences' as never)} />
          <MenuItem icon={Bell}        label="إعدادات الإشعارات" sub="تخصيص ما تستقبله"                       onPress={() => router.push('/settings/notifications')} last />
        </Section>

        <Section title="المجتمع والدعم">
          <MenuItem icon={Users}       label="مجتمع بورصة"        sub="متابعة المتداولين والتوقعات"             onPress={() => router.push('/discover' as never)} />
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
            sub="المنطقة الخطرة — إجراء لا يمكن التراجع عنه"
            onPress={() => router.push('/settings/danger' as never)}
            danger
            last
          />
        </Section>
      </ScrollView>
    </ScreenWrapper>
  );
}
