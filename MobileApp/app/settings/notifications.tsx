import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Bell } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../lib/api/client';

const NOTIF_KEYS = [
  { key: 'notifySignals',      label: 'إشارات السوق',     sub: 'تنبيهات عند وصول الأسعار لأهدافك' },
  { key: 'notifyPortfolio',    label: 'المحفظة',           sub: 'تغيرات مهمة في محفظتك' },
  { key: 'notifyNews',         label: 'الأخبار',           sub: 'آخر أخبار البورصة المصرية' },
  { key: 'notifyAchievements', label: 'الإنجازات',         sub: 'احتفل بإنجازاتك الجديدة' },
  { key: 'notifyGoals',        label: 'الأهداف المالية',   sub: 'تذكيرات لأهدافك وتقدمك' },
] as const;

type NotifKey = (typeof NOTIF_KEYS)[number]['key'];

export default function NotificationsPage() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [saving, setSaving] = useState<NotifKey | null>(null);

  const toggle = async (key: NotifKey) => {
    const current = (user?.[key as keyof typeof user] as boolean | undefined) ?? true;
    updateUser({ [key]: !current } as never);
    setSaving(key);
    try {
      await apiClient.put('/api/user/profile', { [key]: !current });
    } catch {
      updateUser({ [key]: current } as never);
    } finally {
      setSaving(null);
    }
  };

  return (
    <ScreenWrapper padded={false}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 pt-5 pb-4 border-b border-[#30363d]">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white/[0.04] border border-[#30363d] items-center justify-center"
        >
          {I18nManager.isRTL
            ? <ArrowRight size={16} color="#8b949e" />
            : <ArrowLeft size={16} color="#8b949e" />}
        </Pressable>
        <View className="w-8 h-8 rounded-xl bg-brand/20 items-center justify-center">
          <Bell size={15} color="#8b5cf6" />
        </View>
        <Text className="text-base font-bold text-[#e6edf3]">إعدادات الإشعارات</Text>
      </View>

      <ScrollView
        contentContainerClassName="px-4 py-5"
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden">
          {NOTIF_KEYS.map(({ key, label, sub }, i) => {
            const value =
              (user?.[key as keyof typeof user] as boolean | undefined) ?? true;
            return (
              <View
                key={key}
                className={`flex-row items-center gap-3 px-4 py-4 ${
                  i < NOTIF_KEYS.length - 1 ? 'border-b border-[#21262d]' : ''
                }`}
              >
                <View className="flex-1">
                  <Text className="text-sm font-medium text-[#e6edf3]">{label}</Text>
                  <Text className="text-xs text-[#656d76] mt-0.5">{sub}</Text>
                </View>
                {saving === key ? (
                  <ActivityIndicator size="small" color="#8b5cf6" />
                ) : (
                  <Switch
                    value={value}
                    onValueChange={() => toggle(key)}
                    trackColor={{ false: '#30363d', true: '#8b5cf6' }}
                    thumbColor="#fff"
                    ios_backgroundColor="#30363d"
                  />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
