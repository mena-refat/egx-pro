import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  RefreshControl, ActivityIndicator, Alert, I18nManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, ArrowRight, LifeBuoy, Plus, Clock,
  CheckCircle, XCircle, AlertCircle, Send, Star, ChevronLeft, ChevronRight,
  MessageSquare, Inbox,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import apiClient from '../../lib/api/client';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  reply?: string | null;
  repliedAt?: string | null;
  replyRead: boolean;
  rating?: number | null;
  createdAt: string;
}

const STATUS_CFG: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  OPEN:        { label: 'مفتوحة',        color: '#3b82f6', bg: '#3b82f615' },
  IN_PROGRESS: { label: 'قيد المعالجة', color: '#f59e0b', bg: '#f59e0b15' },
  RESOLVED:    { label: 'محلولة',        color: '#4ade80', bg: '#4ade8015' },
  CLOSED:      { label: 'مغلقة',         color: '#8b949e', bg: '#8b949e15' },
};

function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
  if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} ي`;
  return new Date(d).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
}

/* ─── Create Ticket Form ─── */
function CreateForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const { colors } = useTheme();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!subject.trim() || !message.trim()) { setError('اكتب الموضوع والرسالة'); return; }
    if (subject.trim().length < 5) { setError('الموضوع قصير جداً (5 أحرف على الأقل)'); return; }
    if (message.trim().length < 10) { setError('الرسالة قصيرة جداً (10 أحرف على الأقل)'); return; }
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/api/support', { subject: subject.trim(), message: message.trim() });
      onCreated();
    } catch {
      setError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl p-4 gap-4">
      <Text style={{ color: colors.text }} className="text-sm font-bold">تذكرة دعم جديدة</Text>

      <View className="gap-1.5">
        <Text style={{ color: colors.textSub }} className="text-xs font-medium">الموضوع</Text>
        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder="موضوع المشكلة أو الاستفسار"
          placeholderTextColor={colors.textMuted}
          maxLength={100}
          style={{ color: colors.text, borderColor: colors.border, backgroundColor: colors.hover }}
          className="border rounded-xl px-3 py-2.5 text-sm"
        />
      </View>

      <View className="gap-1.5">
        <Text style={{ color: colors.textSub }} className="text-xs font-medium">الرسالة</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="اشرح مشكلتك أو سؤالك بالتفصيل..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={5}
          maxLength={1000}
          textAlignVertical="top"
          style={{ color: colors.text, borderColor: colors.border, backgroundColor: colors.hover, minHeight: 120 }}
          className="border rounded-xl px-3 py-2.5 text-sm"
        />
        <Text style={{ color: colors.textMuted }} className="text-xs text-left">
          {message.length}/1000
        </Text>
      </View>

      {error && (
        <View className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          <Text className="text-xs text-red-400">{error}</Text>
        </View>
      )}

      <View className="flex-row gap-2">
        <Pressable
          onPress={onCancel}
          style={{ borderColor: colors.border }}
          className="flex-1 border rounded-xl py-2.5 items-center"
        >
          <Text style={{ color: colors.textSub }} className="text-sm font-medium">إلغاء</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={loading}
          className="flex-1 bg-brand rounded-xl py-2.5 items-center flex-row justify-center gap-2"
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Send size={13} color="#fff" />}
          <Text className="text-sm font-bold text-white">إرسال</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ─── Ticket Detail ─── */
function TicketDetail({ ticket, onBack, onRated }: { ticket: SupportTicket; onBack: () => void; onRated: () => void }) {
  const { colors } = useTheme();
  const [rating, setRating] = useState<number>(ticket.rating ?? 0);
  const [ratingLoading, setRatingLoading] = useState(false);
  const cfg = STATUS_CFG[ticket.status];
  const ArrowIcon = I18nManager.isRTL ? ArrowRight : ArrowLeft;

  // Mark reply as read when user opens the ticket
  useEffect(() => {
    if (ticket.reply && !ticket.replyRead) {
      void apiClient.patch(`/api/support/${ticket.id}/read-reply`).catch(() => {});
    }
  }, [ticket.id, ticket.reply, ticket.replyRead]);

  const submitRating = async (stars: number) => {
    if (ticket.rating) return;
    setRating(stars);
    setRatingLoading(true);
    try {
      await apiClient.patch(`/api/support/${ticket.id}/rate`, { rating: stars });
      onRated();
    } catch {
      // silent
    } finally {
      setRatingLoading(false);
    }
  };

  return (
    <View className="flex-1">
      <View
        style={{ borderBottomColor: colors.border, borderBottomWidth: 0.5 }}
        className="flex-row items-center gap-3 px-4 pt-5 pb-4"
      >
        <Pressable
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ backgroundColor: colors.hover, borderColor: colors.border }}
          className="w-9 h-9 rounded-xl border items-center justify-center"
        >
          <ArrowIcon size={16} color={colors.textSub} />
        </Pressable>
        <Text style={{ color: colors.text }} className="text-base font-bold flex-1" numberOfLines={1}>
          {ticket.subject}
        </Text>
        <View style={{ backgroundColor: cfg.bg }} className="px-2.5 py-1 rounded-lg">
          <Text className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
        {/* Original message */}
        <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl p-4 gap-2">
          <View className="flex-row items-center justify-between">
            <Text style={{ color: colors.textMuted }} className="text-xs font-semibold">رسالتك</Text>
            <Text style={{ color: colors.textMuted }} className="text-xs">{timeAgo(ticket.createdAt)}</Text>
          </View>
          <Text style={{ color: colors.text }} className="text-sm leading-6">{ticket.message}</Text>
        </View>

        {/* Reply */}
        {ticket.reply ? (
          <View className="bg-brand/8 border border-brand/20 rounded-2xl p-4 gap-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <LifeBuoy size={13} color="#8b5cf6" />
                <Text className="text-xs font-semibold text-brand">رد فريق الدعم</Text>
              </View>
              {ticket.repliedAt && (
                <Text style={{ color: colors.textMuted }} className="text-xs">{timeAgo(ticket.repliedAt)}</Text>
              )}
            </View>
            <Text style={{ color: colors.text }} className="text-sm leading-6">{ticket.reply}</Text>

            {/* Rating */}
            {ticket.status === 'RESOLVED' && (
              <View className="mt-2 pt-3" style={{ borderTopColor: colors.border, borderTopWidth: 0.5 }}>
                <Text style={{ color: colors.textSub }} className="text-xs mb-2">
                  {ticket.rating ? 'تقييمك للدعم' : 'قيّم تجربتك مع الدعم'}
                </Text>
                <View className="flex-row gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => void submitRating(s)}
                      disabled={!!ticket.rating || ratingLoading}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <Star
                        size={24}
                        color={s <= rating ? '#f59e0b' : colors.border}
                        fill={s <= rating ? '#f59e0b' : 'transparent'}
                      />
                    </Pressable>
                  ))}
                  {ratingLoading && <ActivityIndicator size="small" color="#8b5cf6" />}
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl p-4 flex-row items-center gap-3">
            <Clock size={16} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted }} className="text-sm">لم يتم الرد بعد — فريق الدعم سيراجع تذكرتك قريباً</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ─── Main Page ─── */
export default function SupportPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const mountedRef = useRef(true);
  const ArrowIcon = I18nManager.isRTL ? ArrowRight : ArrowLeft;
  const ChevronIcon = I18nManager.isRTL ? ChevronRight : ChevronLeft;

  useEffect(() => () => { mountedRef.current = false; }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await apiClient.get('/api/support/my', { signal });
      const data = res.data as { tickets?: SupportTicket[] } | SupportTicket[];
      const list = Array.isArray(data) ? data : (data as { tickets?: SupportTicket[] }).tickets ?? [];
      if (!signal?.aborted && mountedRef.current) setTickets(list);
    } catch {
      // silent
    } finally {
      if (!signal?.aborted && mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    if (mountedRef.current) setRefreshing(false);
  }, [load]);

  const handleCreated = useCallback(() => {
    setShowCreate(false);
    void load();
  }, [load]);

  const handleRated = useCallback(() => {
    void load();
    if (selected) {
      setSelected((prev) => prev ? { ...prev, rating: selected.rating ?? 1 } : null);
    }
  }, [load, selected]);

  // Ticket detail view
  if (selected) {
    return (
      <ScreenWrapper padded={false}>
        <TicketDetail
          ticket={selected}
          onBack={() => setSelected(null)}
          onRated={handleRated}
        />
      </ScreenWrapper>
    );
  }

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
            <View className="w-8 h-8 rounded-xl bg-brand/15 items-center justify-center">
              <LifeBuoy size={15} color="#8b5cf6" />
            </View>
            <Text style={{ color: colors.text }} className="text-base font-bold">الدعم الفني</Text>
          </View>
        </View>
        <Pressable
          onPress={() => setShowCreate((v) => !v)}
          style={{ backgroundColor: showCreate ? colors.hover : '#8b5cf6', borderColor: showCreate ? colors.border : 'transparent' }}
          className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl border"
        >
          <Plus size={13} color={showCreate ? colors.textSub : '#fff'} />
          <Text className="text-xs font-bold" style={{ color: showCreate ? colors.textSub : '#fff' }}>
            {showCreate ? 'إلغاء' : 'تذكرة جديدة'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" colors={['#8b5cf6']} />
        }
      >
        {/* Create form */}
        {showCreate && (
          <CreateForm onCreated={handleCreated} onCancel={() => setShowCreate(false)} />
        )}

        {/* Tickets list */}
        {loading ? (
          <View className="gap-3">
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl p-4 gap-2">
                <Skeleton.Line height={14} width="75%" />
                <Skeleton.Line height={11} />
                <Skeleton.Line height={11} width="50%" />
              </View>
            ))}
          </View>
        ) : tickets.length === 0 && !showCreate ? (
          <View className="items-center py-20 gap-3">
            <View style={{ backgroundColor: colors.hover, borderColor: colors.border }} className="w-16 h-16 rounded-full border items-center justify-center">
              <Inbox size={26} color={colors.textMuted} />
            </View>
            <Text style={{ color: colors.textMuted }} className="text-sm text-center">لا توجد تذاكر دعم</Text>
            <Pressable
              onPress={() => setShowCreate(true)}
              className="bg-brand px-4 py-2 rounded-xl mt-1"
            >
              <Text className="text-sm font-bold text-white">إنشاء تذكرة</Text>
            </Pressable>
          </View>
        ) : (
          tickets.map((t) => {
            const cfg = STATUS_CFG[t.status];
            const hasUnread = t.reply && !t.replyRead;
            return (
              <Pressable
                key={t.id}
                onPress={() => setSelected(t)}
                style={({ pressed }) => [
                  {
                    backgroundColor: pressed ? colors.hover : colors.card,
                    borderColor: hasUnread ? '#8b5cf640' : colors.border,
                  },
                ]}
                className="border rounded-2xl p-4 gap-2.5"
              >
                <View className="flex-row items-start justify-between gap-2">
                  <Text style={{ color: colors.text }} className="text-sm font-semibold flex-1" numberOfLines={1}>
                    {t.subject}
                  </Text>
                  <View style={{ backgroundColor: cfg.bg }} className="px-2 py-0.5 rounded-lg shrink-0">
                    <Text className="text-[11px] font-bold" style={{ color: cfg.color }}>{cfg.label}</Text>
                  </View>
                </View>
                <Text style={{ color: colors.textSub }} className="text-xs leading-5" numberOfLines={2}>
                  {t.message}
                </Text>
                <View className="flex-row items-center justify-between">
                  <Text style={{ color: colors.textMuted }} className="text-[11px]">{timeAgo(t.createdAt)}</Text>
                  <View className="flex-row items-center gap-2">
                    {hasUnread && (
                      <View className="flex-row items-center gap-1 bg-brand/15 px-2 py-0.5 rounded-lg">
                        <MessageSquare size={10} color="#8b5cf6" />
                        <Text className="text-[10px] font-bold text-brand">رد جديد</Text>
                      </View>
                    )}
                    {t.rating && (
                      <View className="flex-row items-center gap-0.5">
                        <Star size={11} color="#f59e0b" fill="#f59e0b" />
                        <Text style={{ color: colors.textMuted }} className="text-[11px]">{t.rating}</Text>
                      </View>
                    )}
                    <ChevronIcon size={13} color={colors.textMuted} />
                  </View>
                </View>
              </Pressable>
            );
          })
        )}

        {/* Info note */}
        {!loading && (
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl px-4 py-3 flex-row items-start gap-3">
            <AlertCircle size={14} color={colors.textMuted} style={{ marginTop: 1 }} />
            <Text style={{ color: colors.textMuted }} className="text-xs leading-5 flex-1">
              متوسط وقت الرد 24 ساعة. للأمور العاجلة راسلنا على واتساب أو البريد الإلكتروني.
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
