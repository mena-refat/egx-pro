import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, Animated, Modal, StyleSheet,
} from 'react-native';
import { Trophy, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import { BRAND, FONT, WEIGHT, RADIUS, SPACE } from '../../../lib/theme';

const CARD_DURATION_MS = 4000;

interface Props {
  title: string;
  description: string;
  onComplete: () => void;
}

export function AchievementCongratsCard({ title, description, onComplete }: Props) {
  const { colors } = useTheme();
  const [progress, setProgress] = useState(100);
  const scaleAnim   = useRef(new Animated.Value(0.82)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // ─── Enter animation ────────────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 110,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Countdown + auto-complete ──────────────────────────────────
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed  = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / CARD_DURATION_MS) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        onComplete();
      }
    }, 50);
    return () => clearInterval(id);
  }, [onComplete]);

  return (
    <Modal transparent statusBarTranslucent animationType="none">
      {/* ── Backdrop (tap to dismiss) ─────────────────────────── */}
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onComplete} />

        {/* ── Card ─────────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Icons */}
          <View style={styles.iconRow}>
            <Trophy size={60} color={BRAND} strokeWidth={1.5} />
            <Sparkles size={28} color={BRAND} strokeWidth={1.5} />
          </View>

          {/* Texts */}
          <Text style={[styles.congrats, { color: BRAND }]}>مبروك! 🎉</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            حققت إنجاز جديد
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.desc, { color: colors.textMuted }]}>{description}</Text>

          {/* Countdown bar */}
          <View style={[styles.barBg, { backgroundColor: colors.hover }]}>
            <View
              style={[
                styles.barFill,
                { width: `${progress}%`, backgroundColor: BRAND },
              ]}
            />
          </View>

          {/* Skip hint */}
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            اضغط خارج الكارت للتخطي
          </Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACE.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: RADIUS['2xl'],
    borderWidth: 1,
    padding: SPACE.xl + 4,
    alignItems: 'center',
    gap: SPACE.md,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginBottom: SPACE.xs,
  },
  congrats: {
    fontSize: FONT.xl,
    fontWeight: WEIGHT.extrabold,
  },
  subtitle: {
    fontSize: FONT.sm,
    marginTop: -SPACE.xs,
  },
  title: {
    fontSize: FONT['2xl'],
    fontWeight: WEIGHT.extrabold,
    textAlign: 'center',
  },
  desc: {
    fontSize: FONT.sm,
    textAlign: 'center',
    lineHeight: 21,
  },
  barBg: {
    width: '100%',
    height: 5,
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: SPACE.sm,
  },
  barFill: {
    height: '100%',
    borderRadius: 99,
  },
  hint: {
    fontSize: 11,
  },
});
