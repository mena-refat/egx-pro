import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  Shield,
  Bell,
  CreditCard,
  Fingerprint,
  Globe,
  ChevronRight,
  Info,
  LogOut,
  Trash2,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuthStore } from '../../store/authStore';

interface MenuItemProps {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  sub?: string;
  onPress: () => void;
  danger?: boolean;
  accent?: string;
}

function MenuItem({ icon: Icon, label, sub, onPress, danger, accent }: MenuItemProps) {
  const c = danger ? '#ef4444' : accent ?? '#94a3b8';
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-4 py-3.5 border-b border-white/[0.04] active:bg-white/[0.03]"
    >
      <View
        className="w-9 h-9 rounded-xl items-center justify-center"
        style={{ backgroundColor: danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)' }}
      >
        <Icon size={16} color={c} />
      </View>
      <View className="flex-1">
        <Text className={`text-sm font-medium ${danger ? 'text-red-400' : 'text-white'}`}>
          {label}
        </Text>
        {sub && <Text className="text-xs text-slate-500 mt-0.5">{sub}</Text>}
      </View>
      {!danger && <ChevronRight size={14} color="#475569" />}
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mx-4 mb-3">
      <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 mb-2">
        {title}
      </Text>
      <View className="bg-[#111118] border border-white/[0.07] rounded-2xl overflow-hidden">
        {children}
      </View>
    </View>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScreenWrapper padded={false}>
      <ScrollView
        contentContainerClassName="pt-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-xl font-bold text-white px-4 mb-5">الإعدادات</Text>

        <Section title="الحساب">
          <MenuItem
            icon={User}
            label="تعديل البيانات الشخصية"
            sub={user?.fullName ?? ''}
            onPress={() => router.push('/settings/account')}
          />
          <MenuItem
            icon={CreditCard}
            label="الاشتراك والخطة"
            sub={user?.plan ?? 'free'}
            onPress={() => router.push('/settings/subscription')}
          />
        </Section>

        <Section title="الأمان والخصوصية">
          <MenuItem
            icon={Shield}
            label="الأمان و2FA"
            sub="كلمة المرور والجلسات"
            onPress={() => router.push('/settings/security')}
          />
          <MenuItem
            icon={Fingerprint}
            label="البصمة / Face ID"
            sub="تسجيل الدخول البيومتري"
            onPress={() => router.push('/settings/biometric')}
          />
        </Section>

        <Section title="الإشعارات">
          <MenuItem
            icon={Bell}
            label="إعدادات الإشعارات"
            sub="تخصيص ما تستقبله"
            onPress={() => router.push('/settings/notifications')}
          />
        </Section>

        <Section title="التطبيق">
          <MenuItem icon={Globe} label="اللغة" sub="العربية" onPress={() => {}} />
          <MenuItem icon={Info} label="عن التطبيق" sub="Borsa v1.0.0" onPress={() => {}} />
        </Section>

        <Section title="">
          <MenuItem icon={LogOut} label="تسجيل الخروج" onPress={handleLogout} danger />
          <MenuItem
            icon={Trash2}
            label="حذف الحساب"
            onPress={() => router.push('/settings/delete-account')}
            danger
          />
        </Section>
      </ScrollView>
    </ScreenWrapper>
  );
}

