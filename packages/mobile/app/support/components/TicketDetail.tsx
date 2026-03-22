import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  LifeBuoy,
  Star,
} from 'lucide-react-native';
import apiClient from '../../../lib/api/client';
import { useTheme } from '../../../hooks/useTheme';
import { BRAND_BG_STRONG, BRAND_BG } from '../../../lib/theme';
import type { SupportTicket } from '../supportTypes';
import { STATUS_CFG, timeAgo } from '../supportTypes';

export function TicketDetail({
  ticket,
  onBack,
  onReplyMarkedRead,
  onRated,
}: {
  ticket: SupportTicket;
  onBack: () => void;
  onReplyMarkedRead: (ticketId: string) => void;
  onRated: (ticketId: string, stars: number) => void;
}) {
  const { colors, isRTL } = useTheme();
  const [rating, setRating] = useState<number>(ticket.rating ?? 0);
  const [ratingLoading, setRatingLoading] = useState(false);
  const cfg = STATUS_CFG[ticket.status];

  useEffect(() => {
    setRating(ticket.rating ?? 0);
  }, [ticket.id, ticket.rating]);

  const hasRated = useMemo(() => ticket.rating != null || rating > 0, [rating, ticket.rating]);
  const ArrowIcon = isRTL ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (ticket.reply && !ticket.replyRead) {
      void apiClient
        .patch(`/api/support/${ticket.id}/read-reply`)
        .then(() => onReplyMarkedRead(ticket.id))
        .catch(() => {});
    }
  }, [onReplyMarkedRead, ticket.id, ticket.reply, ticket.replyRead]);

  const submitRating = async (stars: number) => {
    if (hasRated || ratingLoading) return;
    const prevRating = rating;
    setRating(stars);
    setRatingLoading(true);

    try {
      await apiClient.patch(`/api/support/${ticket.id}/rate`, { rating: stars });
      onRated(ticket.id, stars);
    } catch {
      // Revert optimistic rating if backend call fails.
      setRating(prevRating);
    } finally {
      setRatingLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          opacity: 0.5,
        }}
      >
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 16,
            paddingTop: 20,
            paddingBottom: 16,
          }}
        >
          <Pressable
            onPress={onBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ backgroundColor: colors.hover, borderColor: colors.border, borderWidth: 1, width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowIcon size={16} color={colors.textSub} />
          </Pressable>

          <Text
            style={{ color: colors.text, fontWeight: '700', fontSize: 16, flex: 1 }}
            numberOfLines={1}
          >
            {ticket.subject}
          </Text>

          <View
            style={{
              backgroundColor: cfg.bg,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: cfg.color }}>{cfg.label}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
      >
        {/* Original message */}
        <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>رسالتك</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{timeAgo(ticket.createdAt)}</Text>
          </View>
          <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>{ticket.message}</Text>
        </View>

        {/* Reply */}
        {ticket.reply ? (
          <View
            style={{
              backgroundColor: BRAND_BG,
              borderColor: BRAND_BG_STRONG,
              borderWidth: 1,
              borderRadius: 16,
              padding: 16,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <LifeBuoy size={13} color="#8b5cf6" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#8b5cf6' }}>رد فريق الدعم</Text>
              </View>
              {ticket.repliedAt && (
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{timeAgo(ticket.repliedAt)}</Text>
              )}
            </View>
            <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>{ticket.reply}</Text>

            {/* Rating */}
            {ticket.status === 'RESOLVED' && (
              <View style={{ marginTop: 10, borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 10 }}>
                <Text style={{ color: colors.textSub, fontSize: 12, marginBottom: 8 }}>
                  {hasRated ? 'تقييمك للدعم' : 'قيّم تجربتك مع الدعم'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => void submitRating(s)}
                      disabled={hasRated || ratingLoading}
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
          <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}>
            <Clock size={16} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>
              لم يتم الرد بعد — فريق الدعم سيراجع تذكرتك قريباً
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

