import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl,
  ActivityIndicator, I18nManager, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, ArrowRight, ChevronLeft, ChevronRight,
  Bell, TrendingUp, Briefcase,
  Newspaper, Trophy, Target, Settings, CheckCheck, Trash2,
} from 'lucide-react-native';
import { ScreenWrapper } from '../components/layout/ScreenWrapper';
import { Skeleton } from '../components/ui/Skeleton';
import { useTheme } from '../hooks/useTheme';
import apiClient from '../lib/api/client';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  route?: string | null;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
  if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} ي`;
  return new Date(dateStr).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
}

function NotifIcon({ type }: { type: string }) {
  const { colors } = useTheme();
  const t = type.toLowerCase();
  if (t.includes('signal') || t.includes('price')) return <TrendingUp size={16} color="#8b5cf6" />;
  if (t.includes('portfolio') || t.includes('holding')) return <Briefcase size={16} color="#38bdf8" />;
  if (t.includes('news') || t.includes('market')) return <Newspaper size={16} color="#fbbf24" />;
  if (t.includes('achievement')) return <Trophy size={16} color="#f59e0b" />;
  if (t.includes('goal')) return <Target size={16} color="#4ade80" />;
  return <Bell size={16} color={colors.textSub} />;
}

function iconBg(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('signal') || t.includes('price')) return '#8b5cf620';
  if (t.includes('portfolio') || t.includes('holding')) return '#38bdf820';
  if (t.includes('news') || t.includes('market')) return '#fbbf2420';
  if (t.includes('achievement')) return '#f59e0b20';
  if (t.includes('goal')) return '#4ade8020';
  return '#8b949e20';
}

export default function NotificationsPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await apiClient.get('/api/notifications?limit=50', { signal });
      const data = res.data as { notifications?: Notification[]; unreadCount?: number };
      if (!signal?.aborted && mountedRef.current) {
        setItems(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {
      /* silent */
    } finally {
      if (!signal?.aborted && mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const c = new AbortController();
    await load(c.signal);
    if (mountedRef.current) setRefreshing(false);
  }, [load]);

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await apiClient.patch('/api/notifications/read-all');
      if (mountedRef.current) {
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch { /* silent */ }
    finally { if (mountedRef.current) setMarkingAll(false); }
  }, [unreadCount]);

  const clearAll = useCallback(() => {
    Alert.alert('مسح الإشعارات', 'هتمسح كل الإشعارات؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'مسح',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete('/api/notifications/clear-all');
            if (mountedRef.current) { setItems([]); setUnreadCount(0); }
          } catch { /* silent */ }
        },
      },
    ]);
  }, []);

  const markOneRead = useCallback(async (notif: Notification) => {
    if (!notif.isRead) {
      setItems((prev) => prev.map((n) => n.id === notif.id ? { ...n, isRead: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
      apiClient.patch(`/api/notifications/${notif.id}/read`).catch(() => null);
    }
    if (notif.route) {
      try { router.push(notif.route as never); } catch { /* invalid route */ }
    }
  }, [router]);

  const ArrowIcon = I18nManager.isRTL ? ArrowRight : ArrowLeft;

  return (
    <ScreenWrapper padded={false}>
      {/* Header */}
      <View
        style={{ borderBottomColor: colors.border, borderBottomWidth: 0.5 }}
        className="flex-row items-center justify-between px-4 pt-5 pb-4"
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ backgroundColor: colors.hover, borderColor: colors.border }}
            className="w-9 h-9 rounded-xl border items-center justify-center"
          >
            <ArrowIcon size={16} color={colors.textSub} />
          </Pressable>
          <View className="flex-row items-center gap-2">
            <Text style={{ color: colors.text }} className="text-base font-bold">الإشعارات</Text>
            {unreadCount > 0 && (
              <View className="bg-brand px-1.5 py-0.5 rounded-full min-w-[20px] items-center">
                <Text className="text-[10px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View className="flex-row items-center gap-2">
          {unreadCount > 0 && (
            <Pressable
              onPress={markAllRead}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ backgroundColor: colors.hover, borderColor: colors.border }}
              className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-xl border"
            >
              {markingAll
                ? <ActivityIndicator size="small" color="#8b5cf6" />
                : <CheckCheck size={13} color="#8b5cf6" />}
              <Text className="text-xs text-brand font-medium">قراءة الكل</Text>
            </Pressable>
          )}
          {items.length > 0 && (
            <Pressable
              onPress={clearAll}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ backgroundColor: colors.hover, borderColor: colors.border }}
              className="w-8 h-8 rounded-xl border items-center justify-center"
            >
              <Trash2 size={13} color={colors.textSub} />
            </Pressable>
          )}
          <Pressable
            onPress={() => router.navigate('/settings/notifications')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ backgroundColor: colors.hover, borderColor: colors.border }}
            className="w-8 h-8 rounded-xl border items-center justify-center"
          >
            <Settings size={13} color={colors.textSub} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" colors={['#8b5cf6']} />
        }
      >
        {loading ? (
          <View className="px-4 pt-4 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} className="flex-row items-start gap-3">
                <Skeleton.Circle size={40} />
                <View className="flex-1 gap-2">
                  <Skeleton.Line height={14} width="75%" />
                  <Skeleton.Line height={12} />
                </View>
              </View>
            ))}
          </View>
        ) : items.length === 0 ? (
          <View className="flex-1 items-center justify-center py-24 gap-3">
            <View
              style={{ backgroundColor: colors.hover, borderColor: colors.border }}
              className="w-16 h-16 rounded-full border items-center justify-center"
            >
              <Bell size={28} color={colors.textMuted} />
            </View>
            <Text style={{ color: colors.textMuted }} className="text-sm text-center">
              لا توجد إشعارات
            </Text>
          </View>
        ) : (
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="mx-4 mt-4 border rounded-2xl overflow-hidden"
          >
            {items.map((notif, i) => {
              const hasRoute = !!notif.route;
              const ChevronIcon = I18nManager.isRTL ? ChevronRight : ChevronLeft;
              return (
                <Pressable
                  key={notif.id}
                  onPress={() => markOneRead(notif)}
                  style={({ pressed }) => [
                    {
                      backgroundColor: pressed
                        ? colors.hover
                        : notif.isRead
                        ? 'transparent'
                        : `${colors.border}55`,
                      borderBottomColor: colors.border2,
                    },
                    i < items.length - 1 && { borderBottomWidth: 1 },
                  ]}
                  className="flex-row items-center gap-3 px-4 py-3.5"
                >
                  {/* Unread indicator bar */}
                  {!notif.isRead && (
                    <View className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-brand" />
                  )}

                  {/* Icon */}
                  <View
                    className="w-9 h-9 rounded-full items-center justify-center shrink-0"
                    style={{ backgroundColor: iconBg(notif.type) }}
                  >
                    <NotifIcon type={notif.type} />
                  </View>

                  {/* Content */}
                  <View className="flex-1 gap-0.5">
                    <View className="flex-row items-center gap-2">
                      <Text
                        style={{ color: colors.text }}
                        className={`text-sm flex-1 ${notif.isRead ? '' : 'font-semibold'}`}
                        numberOfLines={1}
                      >
                        {notif.title}
                      </Text>
                      <Text style={{ color: colors.textMuted }} className="text-[10px] shrink-0">
                        {timeAgo(notif.createdAt)}
                      </Text>
                    </View>
                    <Text style={{ color: colors.textSub }} className="text-xs leading-5" numberOfLines={2}>
                      {notif.body}
                    </Text>
                    {hasRoute && (
                      <Text className="text-[10px] text-brand mt-0.5">اضغط للانتقال ←</Text>
                    )}
                  </View>

                  {/* Right: chevron if navigable, else unread dot */}
                  {hasRoute ? (
                    <ChevronIcon size={14} color={colors.textMuted} />
                  ) : !notif.isRead ? (
                    <View className="w-2 h-2 rounded-full bg-brand shrink-0" />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
