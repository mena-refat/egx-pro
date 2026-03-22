import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSpring, withSequence,
  interpolate, Easing, FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import { BRAND, BRAND_DARK, GREEN, RED, FONT, WEIGHT, RADIUS, SPACE } from '../../../lib/theme';

// ─── Decorative sparkline heights (ratio 0-1) ───────────────────
const BARS = [0.38, 0.55, 0.30, 0.72, 0.48, 0.82, 0.58, 0.90, 0.65, 0.96, 0.62, 0.78];

interface Props {
  stockCount: number;
  gainers: number;
  losers: number;
}

export function StocksHeroCard({ stockCount, gainers, losers }: Props) {
  const router   = useRouter();
  const { t }    = useTranslation();
  const { isRTL } = useTheme();

  // ── Animations ──────────────────────────────────────────────
  const scale          = useSharedValue(1);
  const shimmerProgress = useSharedValue(0);
  const ringScale       = useSharedValue(1);
  const ringOpacity     = useSharedValue(0.7);

  // ── Counter ─────────────────────────────────────────────────
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    // Shimmer sweep: left → right, looping
    shimmerProgress.value = 0;
    shimmerProgress.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.linear }),
      -1, false,
    );

    // Sonar ring: expands and fades like a ripple
    ringScale.value = withRepeat(
      withSequence(
        withTiming(1,   { duration: 0 }),
        withTiming(2.2, { duration: 1800, easing: Easing.out(Easing.ease) }),
      ),
      -1, false,
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 0 }),
        withTiming(0,    { duration: 1800, easing: Easing.out(Easing.ease) }),
      ),
      -1, false,
    );
  }, []);

  useEffect(() => {
    if (stockCount === 0) return;
    setDisplayCount(0);
    let current = 0;
    const step = Math.max(1, Math.ceil(stockCount / 28));
    const id = setInterval(() => {
      current = Math.min(current + step, stockCount);
      setDisplayCount(current);
      if (current >= stockCount) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [stockCount]);

  const onPressIn  = useCallback(() => { scale.value = withSpring(0.965, { damping: 22, stiffness: 450 }); }, []);
  const onPressOut = useCallback(() => { scale.value = withSpring(1,     { damping: 14, stiffness: 280 }); }, []);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmerProgress.value, [0, 1], [-160, 440]) }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const rowDir = isRTL ? 'row-reverse' : 'row';

  return (
    <Animated.View
      entering={FadeInDown.duration(520).delay(180)}
      style={[styles.wrapper, pressStyle]}
    >
      <Pressable
        onPress={() => router.push('/stocks')}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.pressable}
      >
        <LinearGradient
          colors={['#1b0840', '#0d1428', '#111827']}
          start={{ x: 0.0, y: 0.0 }}
          end={{ x: 1.0, y: 1.0 }}
          style={styles.gradient}
        >
          {/* ── Background orbs ─────────────────────────── */}
          <View style={styles.orbPurple} />
          <View style={styles.orbGreen} />

          {/* ── Shimmer sweep ───────────────────────────── */}
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <Animated.View style={[styles.shimmerTrack, shimmerStyle]}>
              <LinearGradient
                colors={[
                  'transparent',
                  'rgba(255,255,255,0.05)',
                  'rgba(255,255,255,0.11)',
                  'rgba(255,255,255,0.05)',
                  'transparent',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerStrip}
              />
            </Animated.View>
          </View>

          {/* ── Decorative sparkline ─────────────────────── */}
          <View style={styles.barsContainer} pointerEvents="none">
            {BARS.map((h, i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    height: 30 * h,
                    backgroundColor:
                      h > 0.75 ? `${GREEN}60`
                      : h > 0.5 ? `${BRAND}50`
                      : `${BRAND}28`,
                  },
                ]}
              />
            ))}
          </View>

          {/* ── Main content row ─────────────────────────── */}
          <View style={[styles.contentRow, { flexDirection: rowDir }]}>

            {/* Icon with sonar ring */}
            <View style={styles.iconWrapper}>
              <Animated.View style={[styles.sonarRing, ringStyle]} />
              <LinearGradient
                colors={[BRAND, BRAND_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconCircle}
              >
                <TrendingUp size={22} color="#fff" />
              </LinearGradient>
            </View>

            {/* Text block */}
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t('market.stocks')}</Text>
              <Text style={styles.subtitle}>{t('market.stocksDesc')}</Text>
            </View>

            {/* CTA arrow */}
            <View style={styles.arrowBox}>
              <ArrowUpRight size={17} color={`${BRAND}dd`} />
            </View>
          </View>

          {/* ── Divider ─────────────────────────────────── */}
          <View style={styles.divider} />

          {/* ── Stats row ───────────────────────────────── */}
          <View style={[styles.statsRow, { flexDirection: rowDir }]}>
            {/* Total */}
            <View style={styles.chip}>
              <Text style={styles.chipNum}>{displayCount}</Text>
              <Text style={styles.chipLbl}>{t('market.stocks').toLowerCase()}</Text>
            </View>

            {/* Gainers */}
            {gainers > 0 && (
              <View style={[styles.chip, styles.chipGreen]}>
                <TrendingUp size={10} color={GREEN} />
                <Text style={[styles.chipNum, { color: GREEN }]}>{gainers}</Text>
                <Text style={[styles.chipLbl, { color: `${GREEN}aa` }]}>▲</Text>
              </View>
            )}

            {/* Losers */}
            {losers > 0 && (
              <View style={[styles.chip, styles.chipRed]}>
                <TrendingDown size={10} color={RED} />
                <Text style={[styles.chipNum, { color: RED }]}>{losers}</Text>
                <Text style={[styles.chipLbl, { color: `${RED}aa` }]}>▼</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: SPACE.lg,
    marginBottom: SPACE.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.32)',
    // Purple glow shadow
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.40,
    shadowRadius: 20,
    elevation: 14,
  },
  pressable: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  gradient: {
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.lg,
    paddingBottom: SPACE.md,
  },

  // ── Background elements ────────────────────────
  orbPurple: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: BRAND,
    opacity: 0.13,
  },
  orbGreen: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: GREEN,
    opacity: 0.06,
  },
  shimmerTrack: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 160,
  },
  shimmerStrip: {
    flex: 1,
    width: 160,
  },
  barsContainer: {
    position: 'absolute',
    right: SPACE.lg,
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    opacity: 0.65,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },

  // ── Main row ───────────────────────────────────
  contentRow: {
    alignItems: 'center',
    gap: SPACE.md,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sonarRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: BRAND,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    color: '#f1f5f9',
    fontSize: FONT.base,
    fontWeight: WEIGHT.extrabold,
    letterSpacing: 0.2,
  },
  subtitle: {
    color: 'rgba(148,163,184,0.80)',
    fontSize: FONT.xs,
    marginTop: 3,
    lineHeight: 15,
  },
  arrowBox: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(139,92,246,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Stats row ──────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginTop: SPACE.md,
    marginBottom: SPACE.md,
  },
  statsRow: {
    gap: SPACE.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: SPACE.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  chipGreen: {
    backgroundColor: 'rgba(34,197,94,0.10)',
    borderColor: 'rgba(34,197,94,0.22)',
  },
  chipRed: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.22)',
  },
  chipNum: {
    color: '#f1f5f9',
    fontSize: FONT.xs,
    fontWeight: WEIGHT.bold,
    fontVariant: ['tabular-nums'],
  },
  chipLbl: {
    color: 'rgba(148,163,184,0.70)',
    fontSize: FONT.xs,
  },
});
