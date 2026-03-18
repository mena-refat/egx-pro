import { View, Text, ScrollView, Pressable, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import {
  User, Shield, Bell, CreditCard, Fingerprint,
  ChevronRight, ChevronLeft, Info, LogOut, Trash2, I18nManager,
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
  last?: boolean;
}

function MenuItem({ icon: Icon, label, sub, onPress, danger, accent, last }: MenuItemProps) {
  const c = danger ? '#f87171' : accent ?? '#8b949e';
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 px-4 py-3.5 active:bg-white/[0.03] ${last ? '' : 'border-b border-[#21262d]'}`}
    >
      <View
        className="w-9 h-9 rounded-xl items-center justify-center"
        style={{ backgroundColor: danger ? '#f8717115' : '#ffffff08' }}
      >
        <Icon size={16} color={c} />
      </View>
      <View className="flex-1">
        <Text className={`text-sm font-medium ${danger ? 'text-red-400' : 'text-[#e6edf3]'}`}>{label}</Text>
        {sub && <Text className="text-xs text-[#656d76] mt-0.5">{sub}</Text>}
      </View>
      {!danger && (
        I18nManager.isRTL
          ? <ChevronLeft size={14} color="#30363d" />
          : <ChevronRight size={14} color="#30363d" />
      )}
    </Pressable>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View className="mx-4 mb-3">
      {title ? (
        <Text className="text-xs font-semibold text-[#656d76] uppercase tracking-wider px-1 mb-2">{title}</Text>
      ) : null}
      <View className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden">
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
      <ScrollView contentContainerClassName="pt-5 pb-10" showsVerticalScrollIndicator={false}>
        <Text className="text-xl font-bold text-[#e6edf3] px-4 mb-5">الإعدادات</Text>

        <Section title="الحساب">
          <MenuItem
            icon={User}
            label="البيانات الشخصية"
            sub={user?.fullName ?? ''}
            onPress={() => router.push('/settings/account')}
          />
          <MenuItem
            icon={CreditCard}
            label="الاشتراك والخطة"
            sub={(user?.plan ?? 'free').toUpperCase()}
            onPress={() => router.push('/settings/subscription')}
            last
          />
        </Section>

        <Section title="الأمان">
          <MenuItem
            icon={Shield}
            label="الأمان والخصوصية"
            sub="كلمة المرور و2FA"
            onPress={() => router.push('/settings/security')}
          />
          <MenuItem
            icon={Fingerprint}
            label="البصمة / Face ID"
            sub="تسجيل الدخول البيومتري"
            onPress={() => router.push('/settings/biometric')}
            last
          />
        </Section>

        <Section title="الإشعارات">
          <MenuItem
            icon={Bell}
            label="إعدادات الإشعارات"
            sub="تخصيص ما تستقبله"
            onPress={() => router.push('/settings/notifications')}
            last
          />
        </Section>

        <Section title="التطبيق">
          <MenuItem
            icon={Info}
            label="عن التطبيق"
            sub="Borsa v1.0.0"
            onPress={() =>
              Alert.alert(
                'عن التطبيق',
                'Borsa — منصة البورصة المصرية\nالإصدار 1.0.0\n\nتحليلات بالذكاء الاصطناعي وبيانات فورية لمتابعة سوق الأوراق المالية المصري.',
                [{ text: 'حسناً', style: 'cancel' }],
              )
            }
            last
          />
        </Section>

        <Section>
          <MenuItem
            icon={LogOut}
            label="تسجيل الخروج"
            onPress={handleLogout}
            danger
          />
          <MenuItem
            icon={Trash2}
            label="حذف الحساب"
            onPress={() =>
              Alert.alert(
                'حذف الحساب',
                'لحذف حسابك بشكل نهائي تواصل معنا عبر الدعم الفني.',
                [
                  { text: 'إلغاء', style: 'cancel' },
                  { text: 'تواصل مع الدعم', onPress: () => Linking.openURL('mailto:support@borsa.app') },
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
