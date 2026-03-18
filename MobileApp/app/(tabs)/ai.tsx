import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Brain, GitCompare, Sparkles, Zap } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuthStore } from '../../store/authStore';

const CARDS = [
  {
    id: 'analyze',
    icon: Brain,
    title: 'تحليل سهم',
    desc: 'تحليل شامل لأي سهم بالذكاء الاصطناعي — فني وأساسي مع توصية',
    href: '/ai/analyze',
    cost: '1 تحليل',
    color: '#8b5cf6',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  {
    id: 'compare',
    icon: GitCompare,
    title: 'مقارنة سهمين',
    desc: 'قارن بين سهمين واعرف أيهما أفضل للاستثمار الآن',
    href: '/ai/compare',
    cost: '2 تحليل',
    color: '#3b82f6',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    id: 'recommendations',
    icon: Sparkles,
    title: 'توصيات شخصية',
    desc: 'توصيات مخصصة بناءً على محفظتك وأهدافك الاستثمارية',
    href: '/ai/recommendations',
    cost: '1 تحليل',
    color: '#f59e0b',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
] as const;

export default function AIHubPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const used = user?.aiAnalysisUsedThisMonth ?? 0;

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pt-4 pb-10 gap-6">

        {/* Header */}
        <View className="items-center gap-2 pb-2">
          <View className="w-14 h-14 rounded-2xl bg-brand/15 items-center justify-center mb-1">
            <Zap size={26} color="#8b5cf6" />
          </View>
          <Text className="text-2xl font-bold text-[#e6edf3]">مساعد AI</Text>
          <Text className="text-sm text-[#8b949e] text-center">
            تحليلات بالذكاء الاصطناعي للبورصة المصرية
          </Text>
        </View>

        {/* Quota */}
        {user && (
          <View className="bg-[#161b22] border border-[#30363d] rounded-2xl px-4 py-3 flex-row items-center justify-between">
            <Text className="text-sm text-[#8b949e]">التحليلات المستخدمة هذا الشهر</Text>
            <View className="bg-brand/15 px-3 py-1 rounded-lg">
              <Text className="text-sm font-bold text-brand">{used}</Text>
            </View>
          </View>
        )}

        {/* 3 Cards */}
        <View className="gap-4">
          {CARDS.map((card) => (
            <Pressable
              key={card.id}
              onPress={() => router.push(card.href)}
              className={`${card.bg} border ${card.border} rounded-2xl p-5 active:opacity-80`}
            >
              <View className="flex-row items-start gap-4">
                <View
                  className="w-12 h-12 rounded-xl items-center justify-center"
                  style={{ backgroundColor: `${card.color}22` }}
                >
                  <card.icon size={22} color={card.color} />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-base font-bold text-[#e6edf3]">{card.title}</Text>
                  <Text className="text-sm text-[#8b949e] leading-5">{card.desc}</Text>
                  <View className="mt-2 flex-row items-center gap-1.5">
                    <Zap size={11} color={card.color} />
                    <Text className="text-xs font-medium" style={{ color: card.color }}>
                      {card.cost}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Disclaimer */}
        <Text className="text-xs text-[#656d76] text-center px-4 leading-5">
          التحليلات للأغراض التعليمية فقط وليست توصيات استثمارية. تحقق دائماً من مصادر متعددة قبل اتخاذ أي قرار.
        </Text>
      </ScrollView>
    </ScreenWrapper>
  );
}
