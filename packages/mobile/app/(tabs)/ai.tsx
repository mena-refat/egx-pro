import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Brain, GitCompare, Sparkles, Zap, Calculator,
  Target, TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../lib/api/client';
import {
  BRAND, BRAND_BG_STRONG,
  FONT, WEIGHT, RADIUS, SPACE,
} from '../../lib/theme';

interface Prediction {
  id: string;
  ticker: string;
  direction: 'UP' | 'DOWN';
  targetPrice?: number | null;
  deadline: string;
  status: 'PENDING' | 'CORRECT' | 'WRONG' | 'EXPIRED';
}

function usePredictionsPreview() {
  const [preds, setPreds]     = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res  = await apiClient.get('/api/predictions');
      const data = res.data as { items?: Prediction[] };
      setPreds(data.items ?? (Array.isArray(res.data) ? (res.data as Prediction[]) : []));
    } catch { setPreds([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const total   = preds.length;
  const correct = preds.filter((p) => p.status === 'CORRECT').length;
  const wrong   = preds.filter((p) => p.status === 'WRONG').length;
  const winRate = correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : null;
  const recent  = preds.filter((p) => p.status === 'PENDING').slice(0, 3);

  return { total, winRate, recent, loading };
}

const AI_TOOLS = [
  {
    id: 'analyze',
    icon: Brain,
    title: 'تحليل سهم',
    desc: 'تحليل شامل فني وأساسي',
    href: '/ai/analyze',
    cost: '1 تحليل',
    color: BRAND,
    bg: BRAND + '10',
    border: BRAND + '20',
  },
  {
    id: 'compare',
    icon: GitCompare,
    title: 'مقارنة سهمين',
    desc: 'أيهما أفضل الآن؟',
    href: '/ai/compare',
    cost: '2 تحليل',
    color: '#3b82f6',
    bg: '#3b82f610',
    border: '#3b82f620',
  },
  {
    id: 'recommendations',
    icon: Sparkles,
    title: 'توصيات شخصية',
    desc: 'مخصصة لمحفظتك',
    href: '/ai/recommendations',
    cost: '1 تحليل',
    color: '#f59e0b',
    bg: '#f59e0b10',
    border: '#f59e0b20',
  },
] as const;

const CALCULATOR_CARD = {
  id: 'calculator',
  icon: Calculator,
  title: 'حاسبة الاستثمار',
  desc: 'احسب سيناريوهات العائد بدقة',
  href: '/calculator',
  cost: 'مجاني',
  color: '#10b981',
  bg: '#10b98110',
  border: '#10b98120',
} as const;

export default function AnalyticsPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const user   = useAuthStore((s) => s.user);
  const used   = user?.aiAnalysisUsedThisMonth ?? 0;
  const { total, winRate, recent, loading: predsLoading } = usePredictionsPreview();
  const ChevronIcon = I18nManager.isRTL ? ChevronRight : ChevronLeft;

  return (
    <ScreenWrapper padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ─── Header ─── */}
        <View style={{ borderBottomColor: colors.border, borderBottomWidth: 1, paddingHorizontal: SPACE.lg, paddingTop: 18, paddingBottom: 14 }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: WEIGHT.extrabold }}>تحليلات</Text>
          <Text style={{ color: colors.textMuted, fontSize: FONT.xs, marginTop: 3 }}>
            ذكاء اصطناعي وتوقعات البورصة المصرية
          </Text>
        </View>

        <View style={{ paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg, gap: SPACE.xl }}>

          {/* ─── AI Quota ─── */}
          {user && (
            <View style={{
              backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
              borderRadius: RADIUS.xl, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
                <Zap size={14} color={BRAND} />
                <Text style={{ color: colors.textSub, fontSize: FONT.sm }}>التحليلات المستخدمة هذا الشهر</Text>
              </View>
              <View style={{ backgroundColor: BRAND_BG_STRONG, paddingHorizontal: SPACE.md, paddingVertical: 4, borderRadius: RADIUS.md }}>
                <Text style={{ fontSize: FONT.sm, fontWeight: WEIGHT.bold, color: BRAND }}>{used}</Text>
              </View>
            </View>
          )}

          {/* ─── AI Tools (2-column grid) ─── */}
          <View>
            <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold, marginBottom: SPACE.md }}>
              الذكاء الاصطناعي
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
              {AI_TOOLS.map((card) => (
                <Pressable
                  key={card.id}
                  onPress={() => router.push(card.href as never)}
                  style={({ pressed }) => ({
                    backgroundColor: card.bg,
                    borderWidth: 1, borderColor: card.border,
                    borderRadius: RADIUS.xl,
                    padding: SPACE.lg,
                    width: '48%',
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <View style={{ width: 40, height: 40, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', backgroundColor: card.color + '22', marginBottom: SPACE.sm }}>
                    <card.icon size={18} color={card.color} />
                  </View>
                  <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>{card.title}</Text>
                  <Text style={{ color: colors.textSub, fontSize: FONT.xs, marginTop: 3, lineHeight: 16 }}>{card.desc}</Text>
                  <View style={{ marginTop: SPACE.sm, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Zap size={10} color={card.color} />
                    <Text style={{ fontSize: FONT.xs, fontWeight: WEIGHT.semibold, color: card.color }}>{card.cost}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* ─── Calculator (separate from AI) ─── */}
          <View>
            <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold, marginTop: SPACE.xl, marginBottom: SPACE.md }}>
              الحاسبة
            </Text>
            <Pressable
              onPress={() => router.push(CALCULATOR_CARD.href as never)}
              style={({ pressed }) => ({
                backgroundColor: CALCULATOR_CARD.bg,
                borderWidth: 1,
                borderColor: CALCULATOR_CARD.border,
                borderRadius: RADIUS.xl,
                padding: SPACE.lg,
                width: '100%',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
                <View style={{ width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', backgroundColor: CALCULATOR_CARD.color + '22' }}>
                  <CALCULATOR_CARD.icon size={20} color={CALCULATOR_CARD.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>{CALCULATOR_CARD.title}</Text>
                  <Text style={{ color: colors.textSub, fontSize: FONT.xs, marginTop: 3, lineHeight: 16 }}>
                    {CALCULATOR_CARD.desc}
                  </Text>
                  <View style={{ marginTop: SPACE.sm, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Zap size={10} color={CALCULATOR_CARD.color} />
                    <Text style={{ fontSize: FONT.xs, fontWeight: WEIGHT.semibold, color: CALCULATOR_CARD.color }}>{CALCULATOR_CARD.cost}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          </View>

          {/* ─── My Predictions ─── */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md }}>
              <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>توقعاتي</Text>
              <Pressable onPress={() => router.push('/predictions')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: FONT.xs, color: BRAND }}>عرض الكل</Text>
                <ChevronIcon size={12} color={BRAND} />
              </Pressable>
            </View>

            <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: RADIUS.xl, overflow: 'hidden' }}>
              {/* Stats row */}
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ flex: 1, alignItems: 'center', paddingVertical: SPACE.md, borderRightWidth: 1, borderRightColor: colors.border }}>
                  <Text style={{ color: colors.text, fontSize: FONT.xl, fontWeight: WEIGHT.bold }}>{total}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>إجمالي التوقعات</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center', paddingVertical: SPACE.md }}>
                  {winRate !== null ? (
                    <>
                      <Text style={{ color: '#4ade80', fontSize: FONT.xl, fontWeight: WEIGHT.bold }}>{winRate}%</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>نسبة الإصابة</Text>
                    </>
                  ) : (
                    <>
                      <Text style={{ color: colors.textMuted, fontSize: FONT.xl, fontWeight: WEIGHT.bold }}>—</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>لا نتائج بعد</Text>
                    </>
                  )}
                </View>
              </View>

              {/* Recent pending predictions */}
              {predsLoading ? (
                <View style={{ padding: SPACE.lg, gap: SPACE.md }}>
                  {[1, 2].map((i) => <View key={i} style={{ backgroundColor: colors.border, height: 40, borderRadius: RADIUS.sm }} />)}
                </View>
              ) : recent.length === 0 ? (
                <Pressable onPress={() => router.push('/predictions')} style={{ paddingVertical: 32, alignItems: 'center', gap: SPACE.sm }}>
                  <Target size={22} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontSize: FONT.sm }}>لا توجد توقعات نشطة</Text>
                  <Text style={{ color: BRAND, fontSize: FONT.xs, fontWeight: WEIGHT.semibold }}>أضف توقعاتك للسوق</Text>
                </Pressable>
              ) : (
                recent.map((p, i) => (
                  <Pressable
                    key={p.id}
                    onPress={() => router.push('/predictions')}
                    style={({ pressed }) => [
                      {
                        borderBottomColor: colors.border, backgroundColor: pressed ? colors.hover : 'transparent',
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
                      },
                      i < recent.length - 1 && { borderBottomWidth: 1 },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
                      <View style={{ width: 32, height: 32, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', backgroundColor: p.direction === 'UP' ? '#4ade8018' : '#f8717118' }}>
                        {p.direction === 'UP'
                          ? <TrendingUp   size={14} color="#4ade80" />
                          : <TrendingDown size={14} color="#f87171" />}
                      </View>
                      <View>
                        <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>{p.ticker}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                          {new Date(p.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                    </View>
                    <View style={{ paddingHorizontal: SPACE.sm, paddingVertical: 4, borderRadius: RADIUS.md, backgroundColor: p.direction === 'UP' ? '#4ade8018' : '#f8717118' }}>
                      <Text style={{ fontSize: FONT.xs, fontWeight: WEIGHT.bold, color: p.direction === 'UP' ? '#4ade80' : '#f87171' }}>
                        {p.direction === 'UP' ? '▲ صعود' : '▼ هبوط'}
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </View>

          {/* ─── Disclaimer ─── */}
          <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 18, paddingHorizontal: SPACE.sm }}>
            التحليلات للأغراض التعليمية فقط وليست توصيات استثمارية.
          </Text>

        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
