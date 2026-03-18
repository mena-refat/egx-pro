import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../lib/api/client';

const NOTIF_KEYS = [
  {
    key: 'notifySignals',
    label: 'إشارات السوق',
    sub: 'تنبيهات عند وصول الأسعار لأهدافك',
  },
  {
    key: 'notifyPortfolio',
    label: 'المحفظة',
    sub: 'تغيرات مهمة في محفظتك',
  },
  {
    key: 'notifyNews',
    label: 'الأخبار',
    sub: 'آخر أخبار البورصة المصرية',
  },
  {
    key: 'notifyAchievements',
    label: 'الإنجازات',
    sub: 'احتفل بإنجازاتك الجديدة',
  },
  {
    key: 'notifyGoals',
    label: 'الأهداف المالية',
    sub: 'تذكيرات لأهدافك وتقدمك',
  },
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
      <View className="flex-row items-center gap-3 px-4 pt-5 pb-4 border-b border-white/[0.06]">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white/[0.05] items-center justify-center"
        >
          <ArrowLeft size={16} color="#94a3b8" />
        </Pressable>
        <Text className="text-base font-bold text-white">إعدادات الإشعارات</Text>
      </View>

      <ScrollView
        contentContainerClassName="px-4 py-5"
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-[#111118] border border-white/[0.07] rounded-2xl overflow-hidden">
          {NOTIF_KEYS.map(({ key, label, sub }, i) => {
            const value =
              (user?.[key as keyof typeof user] as boolean | undefined) ?? true;
            return (
              <View
                key={key}
                className={`flex-row items-center gap-3 px-4 py-4 ${
                  i < NOTIF_KEYS.length - 1 ? 'border-b border-white/[0.04]' : ''
                }`}
              >
                <View className="flex-1">
                  <Text className="text-sm font-medium text-white">{label}</Text>
                  <Text className="text-xs text-slate-500 mt-0.5">{sub}</Text>
                </View>
                {saving === key ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <Switch
                    value={value}
                    onValueChange={() => toggle(key)}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#10b981' }}
                    thumbColor="#fff"
                    ios_backgroundColor="rgba(255,255,255,0.1)"
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

