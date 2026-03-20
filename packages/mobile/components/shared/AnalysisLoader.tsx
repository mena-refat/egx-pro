import { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { Sparkles, Brain, GitCompare, Star } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';

const PROGRESS_DURATION_MS = 70_000; // يصل لـ 90% في ~70 ثانية
const PROGRESS_CAP = 90;
const MESSAGE_INTERVAL_MS = 4_500;

const MESSAGES: Record<'analyze' | 'compare' | 'recommendations', string[]> = {
  analyze: [
    'جاري جمع بيانات السهم...',
    'جاري تحليل المؤشرات الفنية...',
    'جاري تقييم الأداء المالي...',
    'جاري مراجعة آخر الأخبار...',
    'جاري إعداد نتيجة التحليل...',
    'لحظة صبر... يستحق الانتظار 😊',
  ],
  compare: [
    'جاري جمع بيانات السهمين...',
    'جاري مقارنة المؤشرات الفنية...',
    'جاري تقييم الأداء المالي لكل سهم...',
    'جاري تحديد الأفضل للاستثمار...',
    'جاري إعداد نتيجة المقارنة...',
    'لحظة صبر... يستحق الانتظار 😊',
  ],
  recommendations: [
    'جاري تحليل محفظتك...',
    'جاري مراجعة قائمة متابعتك...',
    'جاري البحث عن أفضل الفرص...',
    'جاري إعداد التوصيات المناسبة لك...',
    'لحظة صبر... يستحق الانتظار 😊',
  ],
};

const ICONS = {
  analyze:         { Icon: Brain,      color: '#8b5cf6', bg: '#8b5cf615' },
  compare:         { Icon: GitCompare, color: '#3b82f6', bg: '#3b82f615' },
  recommendations: { Icon: Star,       color: '#f59e0b', bg: '#f59e0b15' },
};

interface Props {
  variant: 'analyze' | 'compare' | 'recommendations';
}

export function AnalysisLoader({ variant }: Props) {
  const { colors } = useTheme();
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const startRef = useRef(Date.now());
  const sparkleAnim = useRef(new Animated.Value(0.4)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Sparkle pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, { toValue: 1, duration: 900, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(sparkleAnim, { toValue: 0.4, duration: 900, easing: Easing.ease, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [sparkleAnim]);

  // Progress bar
  useEffect(() => {
    startRef.current = Date.now();
    setProgress(0);
    progressAnim.setValue(0);
    const timer = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(PROGRESS_CAP, (elapsed / PROGRESS_DURATION_MS) * PROGRESS_CAP);
      const rounded = Math.round(p);
      setProgress(rounded);
      Animated.timing(progressAnim, {
        toValue: rounded / 100,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    }, 400);
    return () => clearInterval(timer);
  }, [progressAnim]);

  // Rotating messages
  useEffect(() => {
    setMsgIndex(0);
    const messages = MESSAGES[variant];
    const timer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length);
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [variant]);

  const messages = MESSAGES[variant] ?? MESSAGES.analyze;
  const { Icon, color, bg } = ICONS[variant] ?? ICONS.analyze;
  const progressColor = progress < 30 ? '#8b5cf6' : progress < 65 ? '#3b82f6' : '#4ade80';

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 24,
        padding: 20,
        gap: 16,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Animated.View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: bg,
            opacity: sparkleAnim,
          }}
        >
          <Icon size={20} color={color} />
        </Animated.View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Sparkles size={13} color={color} />
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>جاري التحليل</Text>
          </View>
          <Text style={{ color: colors.textSub, fontSize: 11 }} key={msgIndex}>
            {messages[msgIndex]}
          </Text>
        </View>
        <Text
          style={{
            color: progressColor,
            fontSize: 16,
            fontWeight: '700',
            fontVariant: ['tabular-nums'],
          }}
        >
          {progress}%
        </Text>
      </View>

      {/* Progress bar */}
      <View style={{ gap: 6 }}>
        <View
          style={{ height: 8, backgroundColor: colors.hover, borderRadius: 999, overflow: 'hidden' }}
        >
          <Animated.View
            style={{
              height: '100%',
              borderRadius: 999,
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: progressColor,
            }}
          />
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center' }}>
          لا تغلق الشاشة — قد يستغرق دقيقة أو دقيقتين
        </Text>
      </View>

      {/* Steps */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: 4 }}>
        {[
          { label: 'جمع البيانات', threshold: 20 },
          { label: 'التحليل',      threshold: 50 },
          { label: 'الإعداد',      threshold: 80 },
        ].map(({ label, threshold }) => {
          const done = progress >= threshold;
          return (
            <View key={label} style={{ alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: done ? '#4ade80' : colors.border,
                }}
              />
              <Text style={{ color: done ? '#4ade80' : colors.textMuted, fontSize: 11 }}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
