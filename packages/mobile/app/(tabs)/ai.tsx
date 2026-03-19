import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Brain, GitCompare, Sparkles, Zap, Calculator,
  Target, TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
} from 'lucide-react-native';
import { I18nManager } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../lib/api/client';

interface Prediction {
  id: string;
  ticker: string;
  direction: 'UP' | 'DOWN';
  targetPrice?: number | null;
  deadline: string;
  status: 'PENDING' | 'CORRECT' | 'WRONG' | 'EXPIRED';
}

function usePredictionsPreview() {
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/predictions');
      const data = res.data as { items?: Prediction[] };
      setPreds(data.items ?? (Array.isArray(res.data) ? res.data : []));
    } catch { setPreds([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const total = preds.length;
  const correct = preds.filter((p) => p.status === 'CORRECT').length;
  const wrong = preds.filter((p) => p.status === 'WRONG').length;
  const winRate = correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : null;
  const recent = preds.filter((p) => p.status === 'PENDING').slice(0, 3);

  return { total, winRate, recent, loading };
}

const AI_CARDS = [
  {
    id: 'analyze',
    icon: Brain,
    title: 'تحليل سهم',
    desc: 'تحليل شامل — فني وأساسي مع توصية',
    href: '/ai/analyze',
    cost: '1 تحليل',
    color: '#8b5cf6',
    bg: '#8b5cf610',
    border: '#8b5cf620',
  },
  {
    id: 'compare',
    icon: GitCompare,
    title: 'مقارنة سهمين',
    desc: 'اعرف أيهما أفضل للاستثمار الآن',
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
    desc: 'مخصصة لمحفظتك وأهدافك',
    href: '/ai/recommendations',
    cost: '1 تحليل',
    color: '#f59e0b',
    bg: '#f59e0b10',
    border: '#f59e0b20',
  },
] as const;

export default function AnalyticsPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const used = user?.aiAnalysisUsedThisMonth ?? 0;
  const { total, winRate, recent, loading: predsLoading } = usePredictionsPreview();

  const ChevronIcon = I18nManager.isRTL ? ChevronRight : ChevronLeft;

  return (
    <ScreenWrapper padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ─── Header ─── */}
        <View style={{ borderBottomColor: colors.border, borderBottomWidth: 1, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14 }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>تحليلات</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 3 }}>
            ذكاء اصطناعي وتوقعات البورصة المصرية
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 16 }}>

          {/* ─── AI Quota ─── */}
          {user && (
            <View style={{
              backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
              borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Zap size={14} color="#8b5cf6" />
                <Text style={{ color: colors.textSub, fontSize: 13 }}>التحليلات المستخدمة هذا الشهر</Text>
              </View>
              <View style={{ backgroundColor: '#8b5cf618', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#8b5cf6' }}>{used}</Text>
              </View>
            </View>
          )}

          {/* ─── AI Tools ─── */}
          <View>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 12 }}>
              الذكاء الاصطناعي
            </Text>
            <View style={{ gap: 12 }}>
              {AI_CARDS.map((card) => (
                <Pressable
                  key={card.id}
                  onPress={() => router.push(card.href)}
                  style={({ pressed }) => ({
                    backgroundColor: card.bg,
                    borderWidth: 1,
                    borderColor: card.border,
                    borderRadius: 16,
                    padding: 16,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: `${card.color}22` }}>
                      <card.icon size={20} color={card.color} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{card.title}</Text>
                      <Text style={{ color: colors.textSub, fontSize: 12, lineHeight: 18 }}>{card.desc}</Text>
                      <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Zap size={10} color={card.color} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: card.color }}>{card.cost}</Text>
                      </View>
                    </View>
                    <ChevronIcon size={16} color={colors.textMuted} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* ─── My Predictions ─── */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>توقعاتي</Text>
              <Pressable onPress={() => router.push('/predictions')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 12, color: '#8b5cf6' }}>عرض الكل</Text>
                <ChevronIcon size={12} color="#8b5cf6" />
              </Pressable>
            </View>

            <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, overflow: 'hidden' }}>
              {/* Stats row */}
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRightWidth: 1, borderRightColor: colors.border }}>
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{total}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>إجمالي التوقعات</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}>
                  {winRate !== null ? (
                    <>
                      <Text style={{ color: '#4ade80', fontSize: 18, fontWeight: '700' }}>{winRate}%</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>نسبة الإصابة</Text>
                    </>
                  ) : (
                    <>
                      <Text style={{ color: colors.textMuted, fontSize: 18, fontWeight: '700' }}>—</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>لا نتائج بعد</Text>
                    </>
                  )}
                </View>
              </View>

              {/* Recent pending predictions */}
              {predsLoading ? (
                <View style={{ padding: 16, gap: 12 }}>
                  {[1, 2].map((i) => <View key={i} style={{ backgroundColor: colors.border, height: 40, borderRadius: 8 }} />)}
                </View>
              ) : recent.length === 0 ? (
                <Pressable onPress={() => router.push('/predictions')} style={{ paddingVertical: 32, alignItems: 'center', gap: 8 }}>
                  <Target size={22} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>لا توجد توقعات نشطة</Text>
                  <Text style={{ color: '#8b5cf6', fontSize: 12, fontWeight: '600' }}>أضف توقعاتك للسوق</Text>
                </Pressable>
              ) : (
                recent.map((p, i) => (
                  <Pressable
                    key={p.id}
                    onPress={() => router.push('/predictions')}
                    style={({ pressed }) => [
                      { borderBottomColor: colors.border2, backgroundColor: pressed ? colors.hover : 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
                      i < recent.length - 1 && { borderBottomWidth: 1 },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: p.direction === 'UP' ? '#4ade8018' : '#f8717118' }}>
                        {p.direction === 'UP'
                          ? <TrendingUp size={14} color="#4ade80" />
                          : <TrendingDown size={14} color="#f87171" />}
                      </View>
                      <View>
                        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{p.ticker}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                          {new Date(p.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                    </View>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: p.direction === 'UP' ? '#4ade8018' : '#f8717118' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: p.direction === 'UP' ? '#4ade80' : '#f87171' }}>
                        {p.direction === 'UP' ? '▲ صعود' : '▼ هبوط'}
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </View>

          {/* ─── Calculator ─── */}
          <View>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 12 }}>أدوات</Text>
            <Pressable
              onPress={() => router.push('/calculator')}
              style={({ pressed }) => ({
                backgroundColor: '#10b98110',
                borderWidth: 1, borderColor: '#10b98120',
                borderRadius: 16, padding: 16, opacity: pressed ? 0.8 : 1,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#10b98120' }}>
                  <Calculator size={20} color="#10b981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>حاسبة الاستثمار</Text>
                  <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 2 }}>
                    احسب نمو استثمارك — مقارنة البنك والذهب والبورصة
                  </Text>
                </View>
                <ChevronIcon size={16} color={colors.textMuted} />
              </View>
            </Pressable>
          </View>

          {/* ─── Disclaimer ─── */}
          <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 18, paddingHorizontal: 8 }}>
            التحليلات للأغراض التعليمية فقط وليست توصيات استثمارية.
          </Text>

        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
