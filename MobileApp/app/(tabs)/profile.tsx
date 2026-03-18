import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  Settings,
  CreditCard,
  LogOut,
  ChevronRight,
  Shield,
  Bell,
  Target,
  Compass,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuthStore } from '../../store/authStore';
import { Badge } from '../../components/ui/Badge';

function MenuItem({
  icon: Icon,
  label,
  onPress,
  danger = false,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-4 py-3.5 border-b border-white/[0.04] active:bg-white/[0.03]"
    >
      <View
        className={`w-8 h-8 rounded-xl items-center justify-center ${
          danger ? 'bg-red-500/10' : 'bg-white/[0.06]'
        }`}
      >
        <Icon size={15} color={danger ? '#ef4444' : '#94a3b8'} />
      </View>
      <Text
        className={`flex-1 text-sm font-medium ${
          danger ? 'text-red-400' : 'text-white'
        }`}
      >
        {label}
      </Text>
      {!danger && <ChevronRight size={14} color="#475569" />}
    </Pressable>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScreenWrapper padded={false}>
      <ScrollView
        contentContainerClassName="pb-10"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-6 pb-5">
          <View className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5 flex-row items-center gap-4">
            <View className="w-14 h-14 rounded-full bg-brand/20 items-center justify-center">
              <Text className="text-xl font-bold text-brand">
                {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-white">
                {user?.fullName ?? '—'}
              </Text>
              <Text className="text-xs text-slate-400 mt-0.5">
                @{user?.username ?? '—'}
              </Text>
              <View className="mt-2">
                <Badge label={user?.plan ?? 'free'} />
              </View>
            </View>
          </View>
        </View>

        <View className="bg-[#111118] border border-white/[0.07] mx-4 rounded-2xl overflow-hidden mb-3">
          <MenuItem
            icon={User}
            label="تعديل الملف الشخصي"
            onPress={() => router.push('/settings/account')}
          />
          <MenuItem
            icon={Bell}
            label="الإشعارات"
            onPress={() => router.push('/settings/notifications')}
          />
          <MenuItem
            icon={Shield}
            label="الأمان و2FA"
            onPress={() => router.push('/settings/security')}
          />
          <MenuItem
            icon={CreditCard}
            label="الاشتراك"
            onPress={() => router.push('/settings/subscription')}
          />
          <MenuItem
            icon={Settings}
            label="الإعدادات"
            onPress={() => router.push('/settings')}
          />
          <MenuItem
            icon={Target}
            label="التوقعات"
            onPress={() => router.push('/predictions/index')}
          />
          <MenuItem
            icon={Compass}
            label="الأهداف المالية"
            onPress={() => router.push('/goals/index')}
          />
        </View>

        <View className="bg-[#111118] border border-white/[0.07] mx-4 rounded-2xl overflow-hidden">
          <MenuItem icon={LogOut} label="تسجيل الخروج" onPress={handleLogout} danger />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

