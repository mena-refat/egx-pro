import { View, Text, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight, Inbox, MessageSquare, Star } from 'lucide-react-native';
import { Skeleton } from '../../ui/Skeleton';
import { useTheme } from '../../../hooks/useTheme';
import type { SupportTicket } from './supportTypes';
import { STATUS_CFG, timeAgo } from './supportTypes';
import { BRAND_BG_STRONG } from '../../../lib/theme';

export function SupportTicketList({
  loading,
  canUseSupport,
  tickets,
  onSelectTicket,
  onCreateTicket,
}: {
  loading: boolean;
  canUseSupport: boolean;
  tickets: SupportTicket[];
  onSelectTicket: (ticket: SupportTicket) => void;
  onCreateTicket: () => void;
}) {
  const { colors, isRTL } = useTheme();
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  if (loading) {
    return (
      <View style={{ gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 }}
          >
            <Skeleton.Line height={14} width="75%" />
            <Skeleton.Line height={11} />
            <Skeleton.Line height={11} width="50%" />
          </View>
        ))}
      </View>
    );
  }

  if (tickets.length === 0 && canUseSupport) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 80, gap: 12 }}>
        <View
          style={{
            backgroundColor: colors.hover,
            borderColor: colors.border,
            borderWidth: 1,
            width: 64,
            height: 64,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Inbox size={26} color={colors.textMuted} />
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>لا توجد تذاكر دعم</Text>
        <Pressable
          onPress={onCreateTicket}
          style={{
            backgroundColor: '#8b5cf6',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
            marginTop: -4,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>إنشاء تذكرة</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {tickets.map((t) => {
        const cfg = STATUS_CFG[t.status];
        const hasUnread = !!(t.reply && !t.replyRead);
        const rating = t.rating ?? null;

        return (
          <Pressable
            key={t.id}
            onPress={() => onSelectTicket(t)}
            style={({ pressed }) => [
              {
                backgroundColor: pressed ? colors.hover : colors.card,
                borderColor: hasUnread ? BRAND_BG_STRONG : colors.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 16,
              },
            ]}
          >
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                {t.subject}
              </Text>
              <View style={{ backgroundColor: cfg.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 }}>
                <Text style={{ color: cfg.color, fontSize: 11, fontWeight: '800' }}>{cfg.label}</Text>
              </View>
            </View>

            <Text style={{ color: colors.textSub, fontSize: 12.5, lineHeight: 20, marginTop: 6 }} numberOfLines={2}>
              {t.message}
            </Text>

            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>{timeAgo(t.createdAt)}</Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {hasUnread && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BRAND_BG_STRONG, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                    <MessageSquare size={12} color="#8b5cf6" />
                    <Text style={{ color: '#8b5cf6', fontSize: 10, fontWeight: '800' }}>رد جديد</Text>
                  </View>
                )}

                {rating != null && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Star size={12} color="#f59e0b" fill="#f59e0b" />
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>{rating}</Text>
                  </View>
                )}

                <ChevronIcon size={14} color={colors.textMuted} />
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

