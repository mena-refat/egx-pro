import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl,
  ActivityIndicator, Alert,
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
import { BRAND, WEIGHT } from '../lib/theme';

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
  const { colors, isRTL } = useTheme();
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

  const ArrowIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <ScreenWrapper padded={false}>
      {/* Header */}
      <View
        style={{
          borderBottomColor: colors.border,
          borderBottomWidth: 0.5,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 16,
        }}
      >
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              backgroundColor: colors.hover,
              borderColor: colors.border,
              width: 36,
              height: 36,
              borderRadius: 12,
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowIcon size={16} color={colors.textSub} />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: WEIGHT.bold }}>الإشعارات</Text>
            {unreadCount > 0 && (
              <View
                style={{
                  backgroundColor: BRAND,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 999,
                  minWidth: 20,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: WEIGHT.bold, color: '#fff' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {unreadCount > 0 && (
            <Pressable
              onPress={markAllRead}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                backgroundColor: colors.hover,
                borderColor: colors.border,
                borderWidth: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 12,
              }}
            >
              {markingAll
                ? <ActivityIndicator size="small" color="#8b5cf6" />
                : <CheckCheck size={13} color="#8b5cf6" />}
              <Text style={{ fontSize: 11, color: BRAND, fontWeight: WEIGHT.medium }}>قراءة الكل</Text>
            </Pressable>
          )}
          {items.length > 0 && (
            <Pressable
              onPress={clearAll}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                backgroundColor: colors.hover,
                borderColor: colors.border,
                borderWidth: 1,
                width: 32,
                height: 32,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={13} color={colors.textSub} />
            </Pressable>
          )}
          <Pressable
            onPress={() => router.navigate('/settings/notifications')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              backgroundColor: colors.hover,
              borderColor: colors.border,
              borderWidth: 1,
              width: 32,
              height: 32,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Settings size={13} color={colors.textSub} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} colors={[BRAND]} />
        }
      >
        {loading ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}
              >
                <Skeleton.Circle size={40} />
                <View style={{ flex: 1, gap: 8 }}>
                  <Skeleton.Line height={14} width="75%" />
                  <Skeleton.Line height={12} />
                </View>
              </View>
            ))}
          </View>
        ) : items.length === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 96,
              gap: 12,
            }}
          >
            <View
              style={{
                backgroundColor: colors.hover,
                borderColor: colors.border,
                width: 64,
                height: 64,
                borderRadius: 999,
                borderWidth: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={28} color={colors.textMuted} />
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
              لا توجد إشعارات
            </Text>
          </View>
        ) : (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 16,
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 24,
              overflow: 'hidden',
            }}
            >
            {items.map((notif, i) => {
              const hasRoute = !!notif.route;
              const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;
              return (
                <Pressable
                  key={notif.id}
                  onPress={() => markOneRead(notif)}
                  style={({ pressed }) => [
                    {
                      position: 'relative',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      backgroundColor: pressed
                        ? colors.hover
                        : notif.isRead
                          ? 'transparent'
                          : `${colors.border}55`,
                      borderBottomColor: colors.border2,
                    },
                    i < items.length - 1 ? { borderBottomWidth: 1 } : null,
                  ]}
                >
                  {!notif.isRead && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 12,
                        bottom: 12,
                        width: 2,
                        borderRadius: 999,
                        backgroundColor: BRAND,
                        ...(isRTL ? { right: 0 } : { left: 0 }),
                      }}
                    />
                  )}

                  {/* Icon */}
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      backgroundColor: iconBg(notif.type),
                    }}
                  >
                    <NotifIcon type={notif.type} />
                  </View>

                  {/* Content */}
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 13,
                          flex: 1,
                          fontWeight: notif.isRead ? WEIGHT.normal : WEIGHT.semibold,
                        }}
                        numberOfLines={1}
                      >
                        {notif.title}
                      </Text>
                      <Text
                        style={{
                          color: colors.textMuted,
                          fontSize: 10,
                          flexShrink: 0,
                        }}
                      >
                        {timeAgo(notif.createdAt)}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: colors.textSub,
                        fontSize: 11,
                        lineHeight: 20,
                      }}
                      numberOfLines={2}
                    >
                      {notif.body}
                    </Text>
                    {hasRoute && (
                      <Text style={{ fontSize: 10, color: BRAND, marginTop: 2 }}>
                        اضغط للانتقال ←
                      </Text>
                    )}
                  </View>

                  {/* Right: chevron if navigable, else unread dot */}
                  {hasRoute ? (
                    <ChevronIcon size={14} color={colors.textMuted} />
                  ) : !notif.isRead ? (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: BRAND,
                        flexShrink: 0,
                      }}
                    />
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
