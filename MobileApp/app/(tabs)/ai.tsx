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
    bgClass: 'bg-violet-500/10',
    borderClass: 'border-violet-500/20',
  },
  {
    id: 'compare',
    icon: GitCompare,
    title: 'مقارنة سهمين',
    desc: 'اعرف أيهما أفضل للاستثمار الآن',
    href: '/ai/compare',
    cost: '2 تحليل',
    color: '#3b82f6',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/20',
  },
  {
    id: 'recommendations',
    icon: Sparkles,
    title: 'توصيات شخصية',
    desc: 'مخصصة لمحفظتك وأهدافك',
    href: '/ai/recommendations',
    cost: '1 تحليل',
    color: '#f59e0b',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/20',
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* ─── Header ─── */}
        <View
          style={{ borderBottomColor: colors.border, borderBottomWidth: 0.5 }}
          className="px-4 pt-5 pb-4"
        >
          <Text style={{ color: colors.text }} className="text-xl font-bold">تحليلات</Text>
          <Text style={{ color: colors.textMuted }} className="text-xs mt-0.5">
            ذكاء اصطناعي وتوقعات البورصة المصرية
          </Text>
        </View>

        <View className="px-4 pt-4 gap-4">
          {/* ─── AI Quota ─── */}
          {user && (
            <View
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
              className="border rounded-2xl px-4 py-3 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-2">
                <Zap size={14} color="#8b5cf6" />
                <Text style={{ color: colors.textSub }} className="text-sm">التحليلات المستخدمة هذا الشهر</Text>
              </View>
              <View className="bg-brand/15 px-3 py-1 rounded-lg">
                <Text className="text-sm font-bold text-brand">{used}</Text>
              </View>
            </View>
          )}

          {/* ─── AI Tools ─── */}
          <View>
            <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider mb-3">
              الذكاء الاصطناعي
            </Text>
            <View className="gap-3">
              {AI_CARDS.map((card) => (
                <Pressable
                  key={card.id}
                  onPress={() => router.push(card.href)}
                  className={`${card.bgClass} border ${card.borderClass} rounded-2xl p-4 active:opacity-80`}
                >
                  <View className="flex-row items-center gap-4">
                    <View
                      className="w-11 h-11 rounded-xl items-center justify-center"
                      style={{ backgroundColor: `${card.color}22` }}
                    >
                      <card.icon size={20} color={card.color} />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text style={{ color: colors.text }} className="text-sm font-bold">{card.title}</Text>
                      <Text style={{ color: colors.textSub }} className="text-xs leading-5">{card.desc}</Text>
                      <View className="mt-1 flex-row items-center gap-1.5">
                        <Zap size={10} color={card.color} />
                        <Text className="text-xs font-medium" style={{ color: card.color }}>{card.cost}</Text>
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
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider">
                توقعاتي
              </Text>
              <Pressable onPress={() => router.push('/predictions')} className="flex-row items-center gap-1">
                <Text className="text-xs text-brand">عرض الكل</Text>
                <ChevronIcon size={12} color="#8b5cf6" />
              </Pressable>
            </View>

            <View
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
              className="border rounded-2xl overflow-hidden"
            >
              {/* Stats row */}
              <View
                style={{ borderBottomColor: colors.border }}
                className="flex-row border-b"
              >
                <View
                  style={{ borderRightColor: colors.border }}
                  className="flex-1 items-center py-3 border-r"
                >
                  <Text style={{ color: colors.text }} className="text-lg font-bold">{total}</Text>
                  <Text style={{ color: colors.textMuted }} className="text-xs mt-0.5">إجمالي التوقعات</Text>
                </View>
                <View className="flex-1 items-center py-3">
                  {winRate !== null ? (
                    <>
                      <Text className="text-lg font-bold text-emerald-400">{winRate}%</Text>
                      <Text style={{ color: colors.textMuted }} className="text-xs mt-0.5">نسبة الإصابة</Text>
                    </>
                  ) : (
                    <>
                      <Text style={{ color: colors.textMuted }} className="text-lg font-bold">—</Text>
                      <Text style={{ color: colors.textMuted }} className="text-xs mt-0.5">لا نتائج بعد</Text>
                    </>
                  )}
                </View>
              </View>

              {/* Recent pending predictions */}
              {predsLoading ? (
                <View className="p-4 gap-3">
                  {[1, 2].map((i) => <View key={i} style={{ backgroundColor: colors.border2, height: 40, borderRadius: 8 }} />)}
                </View>
              ) : recent.length === 0 ? (
                <Pressable onPress={() => router.push('/predictions')} className="py-8 items-center gap-2">
                  <Target size={22} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted }} className="text-sm">لا توجد توقعات نشطة</Text>
                  <Text className="text-xs text-brand">أضف توقعاتك للسوق</Text>
                </Pressable>
              ) : (
                recent.map((p, i) => (
                  <Pressable
                    key={p.id}
                    onPress={() => router.push('/predictions')}
                    style={({ pressed }) => [
                      { borderBottomColor: colors.border2, backgroundColor: pressed ? colors.hover : 'transparent' },
                      i < recent.length - 1 && { borderBottomWidth: 1 },
                    ]}
                    className="flex-row items-center justify-between px-4 py-3"
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className="w-8 h-8 rounded-xl items-center justify-center"
                        style={{ backgroundColor: p.direction === 'UP' ? '#4ade8018' : '#f8717118' }}
                      >
                        {p.direction === 'UP'
                          ? <TrendingUp size={14} color="#4ade80" />
                          : <TrendingDown size={14} color="#f87171" />}
                      </View>
                      <View>
                        <Text style={{ color: colors.text }} className="text-sm font-bold">{p.ticker}</Text>
                        <Text style={{ color: colors.textMuted }} className="text-xs">
                          {new Date(p.deadline).toLocaleDateString('ar-EG')}
                        </Text>
                      </View>
                    </View>
                    <View
                      className="px-2.5 py-1 rounded-lg"
                      style={{ backgroundColor: p.direction === 'UP' ? '#4ade8018' : '#f8717118' }}
                    >
                      <Text
                        className="text-xs font-bold"
                        style={{ color: p.direction === 'UP' ? '#4ade80' : '#f87171' }}
                      >
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
            <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider mb-3">
              أدوات
            </Text>
            <Pressable
              onPress={() => router.push('/calculator')}
              className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 active:opacity-80"
            >
              <View className="flex-row items-center gap-4">
                <View className="w-11 h-11 rounded-xl items-center justify-center bg-emerald-500/20">
                  <Calculator size={20} color="#10b981" />
                </View>
                <View className="flex-1">
                  <Text style={{ color: colors.text }} className="text-sm font-bold">حاسبة الاستثمار</Text>
                  <Text style={{ color: colors.textSub }} className="text-xs mt-0.5">
                    احسب نمو استثمارك — مقارنة البنك والذهب والبورصة
                  </Text>
                </View>
                <ChevronIcon size={16} color={colors.textMuted} />
              </View>
            </Pressable>
          </View>

          {/* ─── Disclaimer ─── */}
          <Text style={{ color: colors.textMuted }} className="text-xs text-center leading-5 px-2">
            التحليلات للأغراض التعليمية فقط وليست توصيات استثمارية.
          </Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
