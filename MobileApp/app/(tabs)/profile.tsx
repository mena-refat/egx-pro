import React from 'react';
import { View, Text, Pressable, ScrollView, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  Settings,
  CreditCard,
  LogOut,
  ChevronRight,
  ChevronLeft,
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
      className="flex-row items-center gap-3 px-4 py-3.5 border-b border-[#21262d] active:bg-[#1c2128]"
    >
      <View
        className={`w-8 h-8 rounded-xl items-center justify-center ${
          danger ? 'bg-red-500/10' : 'bg-white/[0.04]'
        }`}
      >
        <Icon size={15} color={danger ? '#f87171' : '#8b949e'} />
      </View>
      <Text
        className={`flex-1 text-sm font-medium ${
          danger ? 'text-red-400' : 'text-[#e6edf3]'
        }`}
      >
        {label}
      </Text>
      {!danger && (I18nManager.isRTL
        ? <ChevronLeft size={14} color="#656d76" />
        : <ChevronRight size={14} color="#656d76" />)}
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
        {/* Profile Card */}
        <View className="px-4 pt-6 pb-5">
          <View className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 flex-row items-center gap-4">
            <View className="w-14 h-14 rounded-full bg-brand/20 items-center justify-center">
              <Text className="text-xl font-bold text-brand">
                {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-[#e6edf3]">
                {user?.fullName ?? '—'}
              </Text>
              <Text className="text-xs text-[#8b949e] mt-0.5">
                @{user?.username ?? '—'}
              </Text>
              <View className="mt-2">
                <Badge label={user?.plan ?? 'free'} />
              </View>
            </View>
          </View>
        </View>

        {/* Menu */}
        <View className="bg-[#161b22] border border-[#30363d] mx-4 rounded-2xl overflow-hidden mb-3">
          <MenuItem icon={User}       label="تعديل الملف الشخصي" onPress={() => router.push('/settings/account')} />
          <MenuItem icon={Bell}       label="الإشعارات"           onPress={() => router.push('/settings/notifications')} />
          <MenuItem icon={Shield}     label="الأمان و2FA"         onPress={() => router.push('/settings/security')} />
          <MenuItem icon={CreditCard} label="الاشتراك"            onPress={() => router.push('/settings/subscription')} />
          <MenuItem icon={Settings}   label="الإعدادات"           onPress={() => router.push('/settings')} />
          <MenuItem icon={Target}     label="التوقعات"            onPress={() => router.push('/predictions')} />
          <MenuItem icon={Compass}    label="الأهداف المالية"     onPress={() => router.push('/goals')} />
        </View>

        <View className="bg-[#161b22] border border-[#30363d] mx-4 rounded-2xl overflow-hidden">
          <MenuItem icon={LogOut} label="تسجيل الخروج" onPress={handleLogout} danger />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
