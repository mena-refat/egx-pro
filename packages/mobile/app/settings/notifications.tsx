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
import { ArrowLeft, ArrowRight, Bell } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import apiClient from '../../lib/api/client';
import { BRAND } from '../../lib/theme';

type NotifKey = 'notifySignals' | 'notifyPortfolio' | 'notifyNews' | 'notifyAchievements' | 'notifyGoals';

export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const { colors, isRTL } = useTheme();
  const [saving, setSaving] = useState<NotifKey | null>(null);

  const NOTIF_KEYS: { key: NotifKey; label: string; sub: string }[] = [
    { key: 'notifySignals',      label: t('notifications.signals'),         sub: t('notifications.signalsSub') },
    { key: 'notifyPortfolio',    label: t('notifications.portfolio'),        sub: t('notifications.portfolioSub') },
    { key: 'notifyNews',         label: t('notifications.news'),             sub: t('notifications.newsSub') },
    { key: 'notifyAchievements', label: t('notifications.achievements'),     sub: t('notifications.achievementsSub') },
    { key: 'notifyGoals',        label: t('notifications.goalReminders'),    sub: t('notifications.goalRemindersSub') },
  ];

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
      <View
        style={{
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 16,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            backgroundColor: colors.hover,
            borderColor: colors.border,
            borderWidth: 1,
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isRTL
            ? <ArrowRight size={16} color={colors.textSub} />
            : <ArrowLeft size={16} color={colors.textSub} />}
        </Pressable>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 12,
            backgroundColor: `${BRAND}33`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bell size={15} color={BRAND} />
        </View>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
          {t('settings.notificationsSettings')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <View style={{ borderWidth: 1, borderRadius: 24, overflow: 'hidden' }}>
            {NOTIF_KEYS.map(({ key, label, sub }, i) => {
              const value =
                (user?.[key as keyof typeof user] as boolean | undefined) ?? true;
              return (
                <View
                  key={key}
                  style={
                    i < NOTIF_KEYS.length - 1
                      ? { borderBottomColor: colors.border, borderBottomWidth: 1 }
                      : undefined
                  }
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 16,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '500' }}>
                        {label}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                        {sub}
                      </Text>
                    </View>
                    {saving === key ? (
                      <ActivityIndicator size="small" color={BRAND} />
                    ) : (
                      <Switch
                        value={value}
                        onValueChange={() => toggle(key)}
                        trackColor={{ false: colors.border, true: BRAND }}
                        thumbColor="#fff"
                        ios_backgroundColor={colors.border}
                      />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
