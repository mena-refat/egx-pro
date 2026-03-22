import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSpring, withSequence,
  interpolate, Easing, FadeInDown, FadeIn,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Brain, GitCompare, Sparkles, Zap, Calculator,
  TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../lib/api/client';
import { BRAND, BRAND_DARK, BRAND_LIGHT, FONT, WEIGHT, RADIUS, SPACE } from '../../lib/theme';

// ─── Data ────────────────────────────────────────────────────────────────────

interface FeedPred {
  id: string;
  ticker: string;
  direction: 'UP' | 'DOWN';
  likeCount?: number;
  user?: { username?: string };
  userRank?: string;
}

interface LeaderEntry {
  position: number;
  user: { id: number; username: string };
  accuracyRate: number;
  rank: string;
}

const RANK_COLOR: Record<string, string> = {
  LEGEND:   '#f59e0b',
  EXPERT:   '#a78bfa',
  SENIOR:   '#60a5fa',
  ANALYST:  '#34d399',
  BEGINNER: '#9ca3af',
};

function usePredictionsPreview() {
  const [topPreds, setTopPreds] = useState<FeedPred[]>([]);
  const [topUsers, setTopUsers] = useState<LeaderEntry[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    try {
      const [feedRes, lbRes] = await Promise.all([
        apiClient.get('/api/predictions/feed?filter=all&limit=20'),
        apiClient.get('/api/predictions/leaderboard?period=alltime'),
      ]);
      const feedData = feedRes.data as { items?: FeedPred[] };
      const sorted = [...(feedData.items ?? [])]
        .sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0))
        .slice(0, 3);
      setTopPreds(sorted);
      const lbData = lbRes.data as { items?: LeaderEntry[] };
      setTopUsers((lbData.items ?? []).slice(0, 3));
    } catch {
      setTopPreds([]);
      setTopUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { topPreds, topUsers, loading };
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function AiHero({ used }: { used: number }) {
  const { t } = useTranslation();

  return (
    <View style={styles.heroWrapper}>
      <LinearGradient
        colors={['#06000f', '#0d0526', '#0a1030']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroGradient}
      >
        <View style={styles.heroOrbPurple} />
        <View style={styles.heroOrbBlue} />
        <View style={styles.heroOrbCyan} />

        <View style={styles.heroContent}>
          <LinearGradient
            colors={[BRAND, BRAND_DARK, '#5b21b6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroIconCircle}
          >
            <Brain size={28} color="#fff" />
          </LinearGradient>

          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>AI Analytics</Text>
            <Text style={styles.heroSubtitle}>{t('ai.subtitle')}</Text>
          </View>

          <View style={styles.quotaBadge}>
            <Zap size={11} color={BRAND_LIGHT} />
            <Text style={styles.quotaNum}>{used}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Tool Card ────────────────────────────────────────────────────────────────

type ToolDef = {
  id: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  title: string;
  desc: string;
  href: string;
  cost: string;
  gradient: readonly [string, string, string];
  glow: string;
};

function ToolCard({ card, index, shimmer, onPress }: {
  card: ToolDef;
  index: number;
  shimmer: SharedValue<number>;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const pressStyle  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const shimmerAnim = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-120, 220]) }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.duration(500).delay(200 + index * 110)}
      style={[styles.toolCardWrap, pressStyle]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.955, { damping: 20, stiffness: 420 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 14, stiffness: 280 }); }}
        style={styles.toolCardPressable}
      >
        <LinearGradient
          colors={card.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.toolCardGradient}
        >
          <View style={[styles.toolOrb, { backgroundColor: card.glow }]} />

          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <Animated.View style={[styles.toolShimmerTrack, shimmerAnim]}>
              <LinearGradient
                colors={['transparent', card.glow + '30', card.glow + '50', card.glow + '30', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.toolShimmerStrip}
              />
            </Animated.View>
          </View>

          <View style={[styles.toolIconWrap, { backgroundColor: card.glow + '40', borderColor: card.glow + '50', shadowColor: card.glow }]}>
            <card.icon size={20} color="#fff" />
          </View>

          <Text style={styles.toolTitle}>{card.title}</Text>
          <Text style={styles.toolDesc} numberOfLines={2}>{card.desc}</Text>

          <View style={[styles.toolCostPill, { backgroundColor: card.glow + '25', borderColor: card.glow + '45' }]}>
            <Zap size={9} color={card.glow} />
            <Text style={[styles.toolCostText, { color: card.glow }]}>{card.cost}</Text>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// ─── Calculator Card (full-width) ────────────────────────────────────────────

// ── Compound growth milestones: EGP 10,000 @ 12.5% p.a. (Y0–Y5) ─────────────
// Pre-computed so nothing recalculates on render
const MILE = [
  { x: 6,   y: 52, r: 5  },
  { x: 62,  y: 39, r: 6  },
  { x: 122, y: 27, r: 7  },
  { x: 184, y: 16, r: 8  },
  { x: 244, y: 8,  r: 9  },
  { x: 300, y: 3,  r: 13 },
] as const;

const ARCS = MILE.slice(0, -1).map((m, i) => {
  const n = MILE[i + 1];
  const dx = n.x - m.x, dy = n.y - m.y;
  return {
    cx: m.x + dx / 2, cy: m.y + dy / 2,
    len: Math.sqrt(dx * dx + dy * dy),
    deg: Math.atan2(dy, dx) * (180 / Math.PI),
    alpha: 0.18 + i * 0.14,
  };
});

function CalculatorCard({ onPress }: { onPress: () => void }) {
  const { t }    = useTranslation();
  const scale    = useSharedValue(1);
  const cursorOp = useSharedValue(1);

  useEffect(() => {
    cursorOp.value = withRepeat(
      withSequence(withTiming(1, { duration: 450 }), withTiming(0, { duration: 450 })),
      -1, false,
    );
  }, []);

  const pressStyle  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const cursorStyle = useAnimatedStyle(() => ({ opacity: cursorOp.value }));

  return (
    <Animated.View entering={FadeInDown.duration(500).delay(650)} style={[styles.calcWrap, pressStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 20, stiffness: 420 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 14, stiffness: 280 }); }}
        style={styles.calcPressable}
      >
        <LinearGradient
          colors={['#010e07', '#001a0c', '#000f07']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.calcGradient}
        >
          <View style={styles.calcOrb} />

          {/* ── Params + result header row ── */}
          <View style={styles.calcHeaderRow}>
            <Text style={styles.calcHeaderParams}>EGP 10K · 12.5% · 5Y</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
              <Text style={styles.calcHeaderVal}>17,931</Text>
              <Text style={styles.calcHeaderPct}>+79%</Text>
            </View>
          </View>

          {/* ── Compound growth arc ── */}
          <View style={styles.arcContainer} pointerEvents="none">
            {/* Connecting lines between milestones */}
            {ARCS.map((l, i) => (
              <View
                key={i}
                style={[styles.arcLine, {
                  left:  l.cx - l.len / 2,
                  top:   l.cy,
                  width: l.len,
                  opacity: l.alpha,
                  transform: [{ rotate: `${l.deg}deg` }],
                }]}
              />
            ))}

            {/* Milestone dots + year labels */}
            {MILE.map((m, i) => {
              const isLast = i === MILE.length - 1;
              const dotAlpha = 0.25 + i * 0.15;
              return (
                <View key={i} style={{ position: 'absolute', left: m.x - m.r, top: m.y - m.r }}>
                  {/* Outer glow ring on Y5 */}
                  {isLast && (
                    <View style={[styles.arcGlowRing, {
                      width: m.r * 2 + 16, height: m.r * 2 + 16,
                      borderRadius: m.r + 8, left: -8, top: -8,
                    }]} />
                  )}
                  {/* Dot */}
                  <View style={{
                    width: m.r * 2, height: m.r * 2, borderRadius: m.r,
                    backgroundColor: isLast ? '#10b981' : 'transparent',
                    borderWidth: isLast ? 0 : 1.5,
                    borderColor: `rgba(16,185,129,${dotAlpha})`,
                    shadowColor: '#10b981',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: isLast ? 0.9 : 0,
                    shadowRadius: isLast ? 10 : 0,
                    elevation: isLast ? 6 : 0,
                  }} />
                  {/* Year label below dot */}
                  <Text style={[styles.arcYearLabel, {
                    color: `rgba(16,185,129,${dotAlpha})`,
                    left: m.r - 12,
                    top:  m.r * 2 + 3,
                  }]}>Y{i}</Text>
                </View>
              );
            })}
          </View>

          {/* ── Divider ── */}
          <View style={styles.calcDivider} />

          {/* ── Bottom row: icon + title▌ + FREE ── */}
          <View style={styles.calcBottomRow}>
            <View style={styles.calcIconWrap}>
              <Calculator size={17} color="#10b981" />
            </View>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text style={styles.calcTitle}>{t('ai.calculator')}</Text>
              <Animated.Text style={[styles.calcCursor, cursorStyle]}>▌</Animated.Text>
            </View>
            <View style={styles.calcFreePill}>
              <Zap size={9} color="#10b981" />
              <Text style={styles.calcFreeText}>{t('ai.free')}</Text>
            </View>
          </View>

        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const router = useRouter();
  const { t }  = useTranslation();
  const { colors, isRTL } = useTheme();
  const user   = useAuthStore((s) => s.user);
  const used   = user?.aiAnalysisUsedThisMonth ?? 0;
  const { topPreds, topUsers, loading: predsLoading } = usePredictionsPreview();
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  // Single shimmer shared across all 3 tool cards → synchronized
  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.linear }), -1, false);
  }, []);

  const tools: ToolDef[] = useMemo(() => [
    {
      id: 'recommendations',
      icon: Sparkles,
      title: t('ai.recommendations'),
      desc: t('ai.recommendationsDesc'),
      href: '/ai/recommendations',
      cost: t('ai.analyzesCost'),
      gradient: ['#150900', '#221500', '#120900'] as const,
      glow: '#f59e0b',
    },
    {
      id: 'compare',
      icon: GitCompare,
      title: t('ai.compare'),
      desc: t('ai.compareDesc'),
      href: '/ai/compare',
      cost: t('ai.comparesCost'),
      gradient: ['#00081e', '#001030', '#000c1e'] as const,
      glow: '#3b82f6',
    },
    {
      id: 'analyze',
      icon: Brain,
      title: t('ai.analyze'),
      desc: t('ai.analyzeDesc'),
      href: '/ai/analyze',
      cost: t('ai.analyzesCost'),
      gradient: ['#0e0020', '#180035', '#0a0018'] as const,
      glow: '#8b5cf6',
    },
  ], [t]);

  return (
    <ScreenWrapper padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ─── Hero ─── */}
        <View style={{ paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg, paddingBottom: SPACE.sm }}>
          <AiHero used={used} />
        </View>

        <View style={{ paddingHorizontal: SPACE.lg, gap: SPACE.lg }}>

          {/* ─── Section label ─── */}
          <Animated.View entering={FadeInDown.duration(400).delay(350)}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: SPACE.sm }}>
              <View style={styles.sectionDot} />
              <Text style={[styles.sectionLabel, { color: colors.textSub }]}>{t('ai.sectionTitle')}</Text>
            </View>
          </Animated.View>

          {/* ─── Tools 2×2 grid ─── */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
            {tools.map((card, i) => (
              <ToolCard
                key={card.id}
                card={card}
                index={i}
                shimmer={shimmer}
                onPress={() => router.push(card.href as never)}
              />
            ))}
          </View>

          {/* ─── Predictions ─── */}
          <Animated.View entering={FadeInDown.duration(450).delay(520)} style={{ gap: SPACE.md }}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: SPACE.sm }}>
                <View style={[styles.sectionDot, { backgroundColor: BRAND }]} />
                <Text style={[styles.sectionLabel, { color: colors.textSub }]}>{t('predictions.title')}</Text>
              </View>
              <Pressable onPress={() => router.push('/predictions')} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: FONT.xs, color: BRAND }}>{t('common.seeAll')}</Text>
                <ChevronIcon size={12} color={BRAND} />
              </Pressable>
            </View>

            <LinearGradient
              colors={['#0e0020', '#0a0a1a', '#080e1a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.predsCard, { borderColor: 'rgba(139,92,246,0.2)' }]}
            >
              {predsLoading ? (
                <View style={{ padding: SPACE.lg, gap: SPACE.md }}>
                  {[1, 2, 3].map((i) => (
                    <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.04)', height: 36, borderRadius: RADIUS.sm }} />
                  ))}
                </View>
              ) : (
                <>
                  {/* ── Top Picks ── */}
                  <View style={{ paddingHorizontal: SPACE.lg, paddingTop: SPACE.md, paddingBottom: SPACE.sm }}>
                    <Text style={{ color: 'rgba(148,163,184,0.55)', fontSize: 10, fontWeight: WEIGHT.semibold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: SPACE.sm }}>
                      🔥 {t('ai.topPicks')}
                    </Text>
                    {topPreds.length === 0 ? (
                      <Text style={{ color: 'rgba(148,163,184,0.45)', fontSize: FONT.xs, textAlign: 'center', paddingVertical: SPACE.sm }}>
                        {t('ai.noPredictions')}
                      </Text>
                    ) : (
                      topPreds.map((p, i) => (
                        <Pressable
                          key={p.id}
                          onPress={() => router.push('/predictions')}
                          style={({ pressed }) => [{
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                            paddingVertical: SPACE.sm,
                            backgroundColor: pressed ? 'rgba(255,255,255,0.03)' : 'transparent',
                            borderBottomWidth: i < topPreds.length - 1 ? 1 : 0,
                            borderBottomColor: 'rgba(255,255,255,0.05)',
                          }]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
                            <LinearGradient
                              colors={p.direction === 'UP' ? ['#052a10', '#0a3d18'] : ['#2a0505', '#3d0a0a']}
                              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                              style={{ width: 28, height: 28, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' }}
                            >
                              {p.direction === 'UP'
                                ? <TrendingUp size={13} color="#4ade80" />
                                : <TrendingDown size={13} color="#f87171" />}
                            </LinearGradient>
                            <View>
                              <Text style={{ color: '#f1f5f9', fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>{p.ticker}</Text>
                              {p.user?.username ? (
                                <Text style={{ color: 'rgba(148,163,184,0.55)', fontSize: 10 }}>@{p.user.username}</Text>
                              ) : null}
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
                            {p.userRank ? (
                              <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm, backgroundColor: (RANK_COLOR[p.userRank] ?? '#9ca3af') + '22' }}>
                                <Text style={{ fontSize: 9, fontWeight: WEIGHT.bold, color: RANK_COLOR[p.userRank] ?? '#9ca3af' }}>{p.userRank}</Text>
                              </View>
                            ) : null}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                              <Text style={{ color: '#f87171', fontSize: 11 }}>♥</Text>
                              <Text style={{ color: 'rgba(148,163,184,0.7)', fontSize: 11, fontVariant: ['tabular-nums'] }}>{p.likeCount ?? 0}</Text>
                            </View>
                          </View>
                        </Pressable>
                      ))
                    )}
                  </View>

                  {/* ── Divider ── */}
                  <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: SPACE.lg }} />

                  {/* ── Top Forecasters ── */}
                  <View style={{ paddingHorizontal: SPACE.lg, paddingTop: SPACE.sm, paddingBottom: SPACE.md }}>
                    <Text style={{ color: 'rgba(148,163,184,0.55)', fontSize: 10, fontWeight: WEIGHT.semibold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: SPACE.sm }}>
                      🏆 {t('ai.topForecasters')}
                    </Text>
                    {topUsers.length === 0 ? (
                      <Text style={{ color: 'rgba(148,163,184,0.45)', fontSize: FONT.xs, textAlign: 'center', paddingVertical: SPACE.sm }}>
                        {t('ai.noPredictions')}
                      </Text>
                    ) : (
                      topUsers.map((u, i) => (
                        <View
                          key={u.user.id}
                          style={{
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                            paddingVertical: SPACE.sm,
                            borderBottomWidth: i < topUsers.length - 1 ? 1 : 0,
                            borderBottomColor: 'rgba(255,255,255,0.05)',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
                            <Text style={{ color: BRAND_LIGHT, fontSize: 12, fontWeight: WEIGHT.bold, width: 20, textAlign: 'center' }}>#{u.position}</Text>
                            <Text style={{ color: '#f1f5f9', fontSize: FONT.sm, fontWeight: WEIGHT.semibold }}>@{u.user.username}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
                            <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm, backgroundColor: (RANK_COLOR[u.rank] ?? '#9ca3af') + '22' }}>
                              <Text style={{ fontSize: 9, fontWeight: WEIGHT.bold, color: RANK_COLOR[u.rank] ?? '#9ca3af' }}>{u.rank}</Text>
                            </View>
                            <Text style={{ color: '#4ade80', fontSize: FONT.sm, fontWeight: WEIGHT.bold, fontVariant: ['tabular-nums'] }}>
                              {u.accuracyRate}%
                            </Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </>
              )}
            </LinearGradient>
          </Animated.View>

          {/* ─── Calculator ─── */}
          <Animated.View entering={FadeInDown.duration(400).delay(720)}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.sm }}>
              <View style={[styles.sectionDot, { backgroundColor: '#10b981' }]} />
              <Text style={[styles.sectionLabel, { color: colors.textSub }]}>{t('ai.calculatorSection')}</Text>
            </View>
          </Animated.View>
          <CalculatorCard onPress={() => router.push('/calculator')} />

          {/* ─── Disclaimer ─── */}
          <Animated.View entering={FadeIn.duration(600).delay(900)}>
            <Text style={{ color: 'rgba(100,116,139,0.7)', fontSize: 11, textAlign: 'center', lineHeight: 18, paddingHorizontal: SPACE.sm }}>
              {t('ai.disclaimer')}
            </Text>
          </Animated.View>

        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Hero
  heroWrapper: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.28)',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
    overflow: 'hidden',
  },
  heroGradient: {
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.md,
    paddingBottom: SPACE.md,
    minHeight: 90,
    overflow: 'hidden',
  },
  heroOrbPurple: {
    position: 'absolute', top: -50, left: -30,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: BRAND, opacity: 0.12,
  },
  heroOrbBlue: {
    position: 'absolute', top: -20, right: 60,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#3b82f6', opacity: 0.07,
  },
  heroOrbCyan: {
    position: 'absolute', bottom: -30, right: -20,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#06b6d4', opacity: 0.06,
  },
  heroContent: {
    flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
  },
  heroIconCircle: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: BRAND, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7, shadowRadius: 12, elevation: 6,
  },
  heroTitle: {
    color: '#f1f5f9', fontSize: FONT.lg, fontWeight: WEIGHT.extrabold,
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    color: 'rgba(148,163,184,0.75)', fontSize: FONT.xs, marginTop: 3, lineHeight: 16,
  },
  quotaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(139,92,246,0.2)', borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.35)',
    paddingHorizontal: SPACE.sm, paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  quotaNum: {
    color: BRAND_LIGHT, fontSize: FONT.sm, fontWeight: WEIGHT.extrabold,
    fontVariant: ['tabular-nums'],
  },

  // Section label
  sectionDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(148,163,184,0.5)',
  },
  sectionLabel: {
    fontSize: FONT.xs, fontWeight: WEIGHT.semibold, letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Tool card
  toolCardWrap: {
    width: '48%',
  },
  toolCardPressable: {
    borderRadius: RADIUS.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  toolCardGradient: {
    padding: SPACE.md, minHeight: 150, overflow: 'hidden',
  },
  toolOrb: {
    position: 'absolute', top: -30, right: -20,
    width: 90, height: 90, borderRadius: 45,
    opacity: 0.12,
  },
  toolShimmerTrack: {
    position: 'absolute', top: 0, bottom: 0, width: 120,
  },
  toolShimmerStrip: {
    flex: 1, width: 120,
  },
  toolIconWrap: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: SPACE.sm,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 10, elevation: 4,
  },
  toolTitle: {
    color: '#f1f5f9', fontSize: FONT.sm, fontWeight: WEIGHT.bold,
    marginBottom: 4,
  },
  toolDesc: {
    color: 'rgba(148,163,184,0.65)', fontSize: 11, lineHeight: 16,
  },
  toolCostPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: RADIUS.sm, borderWidth: 1,
    alignSelf: 'flex-start', marginTop: SPACE.sm,
  },
  toolCostText: {
    fontSize: 10, fontWeight: WEIGHT.semibold,
  },

  // Calculator card
  calcWrap: {
    borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.22)',
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22, shadowRadius: 16, elevation: 7,
    overflow: 'hidden',
  },
  calcPressable: {
    borderRadius: RADIUS.xl, overflow: 'hidden',
  },
  calcGradient: {
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.md,
    paddingBottom: SPACE.md,
  },
  calcOrb: {
    position: 'absolute', top: -60, left: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: '#10b981', opacity: 0.07,
  },

  // Header row
  calcHeaderRow: {
    flexDirection: 'row', alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: SPACE.sm,
  },
  calcHeaderParams: {
    color: 'rgba(16,185,129,0.45)', fontSize: 10, fontWeight: WEIGHT.semibold,
    fontVariant: ['tabular-nums'],
  },
  calcHeaderVal: {
    color: '#10b981', fontSize: 18, fontWeight: WEIGHT.extrabold,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(16,185,129,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  calcHeaderPct: {
    color: 'rgba(16,185,129,0.65)', fontSize: 11, fontWeight: WEIGHT.bold,
  },

  // Compound growth arc
  arcContainer: {
    height: 84,
    marginBottom: SPACE.sm,
  },
  arcLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#10b981',
  },
  arcGlowRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.28)',
  },
  arcYearLabel: {
    position: 'absolute',
    fontSize: 8, fontWeight: WEIGHT.semibold,
    width: 24, textAlign: 'center',
  },

  // Divider
  calcDivider: {
    height: 1,
    backgroundColor: 'rgba(16,185,129,0.1)',
    marginBottom: SPACE.sm,
  },

  // Bottom row
  calcBottomRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
  },
  calcIconWrap: {
    width: 36, height: 36, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)',
  },
  calcTitle: {
    color: '#f1f5f9', fontSize: FONT.sm, fontWeight: WEIGHT.bold,
  },
  calcCursor: {
    color: '#10b981', fontSize: FONT.sm,
  },
  calcFreePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.28)',
    paddingHorizontal: SPACE.sm, paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  calcFreeText: {
    fontSize: 11, fontWeight: WEIGHT.bold, color: '#10b981',
  },

  // Predictions
  predsCard: {
    borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden',
  },
});
