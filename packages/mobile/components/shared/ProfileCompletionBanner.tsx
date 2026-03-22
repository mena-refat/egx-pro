import { useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { User, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useProfileCompletion, FIELD_LABELS } from '../../hooks/useProfileCompletion';
import { FONT, WEIGHT, RADIUS, SPACE } from '../../lib/theme';

const AMBER = '#f59e0b';

/**
 * variant="card"   – standalone card with its own border + bg (home screen)
 * variant="inline" – borderTop separator only, sits inside a parent card (profile hero)
 */
export function ProfileCompletionBanner({ variant = 'card' }: { variant?: 'card' | 'inline' }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, loading } = useProfileCompletion();
  const [expanded, setExpanded] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const expandAnim   = useRef(new Animated.Value(0)).current;

  const pct      = data?.percentage ?? 0;
  const isDone   = !loading && pct === 100;
  const barColor = isDone ? '#4ade80' : AMBER;
  const missing  = data?.missing ?? [];

  // Animate the progress bar fill
  useEffect(() => {
    if (loading) return;
    Animated.timing(progressAnim, {
      toValue: pct,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [pct, loading, progressAnim]);

  // Animate expand/collapse of chips
  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: expanded ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [expanded, expandAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  // Card variant: hide completely once done (home screen is clean, user already knows)
  if (variant === 'card' && !loading && isDone) return null;

  const outerStyle =
    variant === 'card'
      ? {
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderColor: barColor + '45',
          backgroundColor: barColor + '0c',
          padding: SPACE.lg,
        }
      : {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          marginTop: SPACE.md,
          paddingTop: SPACE.md,
        };

  const canExpand = !loading && !isDone && missing.length > 0;

  return (
    <View style={outerStyle}>
      {/* ── Header row (tappable) ── */}
      <Pressable
        onPress={() => canExpand && setExpanded((v) => !v)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: 10 }}
      >
        {/* Icon */}
        <View style={{
          width: 28, height: 28, borderRadius: RADIUS.md,
          backgroundColor: barColor + '22',
          alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {isDone
            ? <CheckCircle2 size={14} color={barColor} />
            : <User size={14} color={barColor} />
          }
        </View>

        {/* Labels */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: isDone ? '#4ade80' : colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.semibold }}>
            {isDone ? 'ملفك الشخصي مكتمل' : 'أكمل ملفك الشخصي'}
          </Text>
          {canExpand && (
            <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 1 }}>
              {expanded ? 'اضغط لإخفاء التفاصيل' : 'اضغط لمعرفة ما ينقصك'}
            </Text>
          )}
        </View>

        {/* Percentage badge */}
        <View style={{
          backgroundColor: barColor + '20',
          paddingHorizontal: 8, paddingVertical: 3,
          borderRadius: RADIUS.full,
          flexShrink: 0,
        }}>
          <Text style={{ color: barColor, fontSize: FONT.xs, fontWeight: WEIGHT.extrabold }}>
            {loading ? '…' : `${pct}%`}
          </Text>
        </View>

        {/* Chevron toggle */}
        {canExpand && (
          expanded
            ? <ChevronUp size={14} color={colors.textMuted} />
            : <ChevronDown size={14} color={colors.textMuted} />
        )}
      </Pressable>

      {/* ── Progress bar ── */}
      <View style={{
        height: 7,
        backgroundColor: colors.border,
        borderRadius: RADIUS.full,
        overflow: 'hidden',
        marginBottom: expanded ? SPACE.md : 0,
      }}>
        <Animated.View style={{
          height: '100%',
          backgroundColor: loading ? colors.border : barColor,
          borderRadius: RADIUS.full,
          width: progressWidth,
        }} />
      </View>

      {/* ── Missing field chips (when expanded) ── */}
      {canExpand && expanded && (
        <Animated.View style={{
          opacity: expandAnim,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: SPACE.sm,
          marginTop: SPACE.sm,
        }}>
          {missing.map((m) => (
            <Pressable
              key={m.field}
              onPress={() => router.push(m.route as never)}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: pressed ? AMBER + '30' : AMBER + '15',
                paddingHorizontal: 10, paddingVertical: 6,
                borderRadius: RADIUS.lg,
                borderWidth: 1, borderColor: AMBER + '35',
              })}
            >
              <Text style={{ color: AMBER, fontSize: 11, fontWeight: WEIGHT.bold }}>
                + {FIELD_LABELS[m.field]}
              </Text>
            </Pressable>
          ))}
        </Animated.View>
      )}
    </View>
  );
}
