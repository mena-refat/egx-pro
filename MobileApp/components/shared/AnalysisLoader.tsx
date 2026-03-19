import { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { Sparkles, Brain, GitCompare, Star } from 'lucide-react-native';

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
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const startRef = useRef(Date.now());
  const sparkleAnim = useRef(new Animated.Value(0.4)).current;
  // Animated.Value for the progress bar width (0 → 1) so we never pass a
  // string percentage to Animated.View — which causes a render crash.
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Sparkle pulse animation (opacity only — useNativeDriver safe)
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

  // Progress bar — drive state AND the Animated.Value in sync
  useEffect(() => {
    startRef.current = Date.now();
    setProgress(0);
    progressAnim.setValue(0);
    const timer = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(PROGRESS_CAP, (elapsed / PROGRESS_DURATION_MS) * PROGRESS_CAP);
      const rounded = Math.round(p);
      setProgress(rounded);
      // Drive the Animated.Value as a fraction (0–1) — avoids string-percentage crashes
      Animated.timing(progressAnim, {
        toValue: rounded / 100,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false, // width layout animation requires JS driver
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
    <View className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 gap-4">
      {/* Header */}
      <View className="flex-row items-center gap-3">
        <Animated.View
          className="w-11 h-11 rounded-xl items-center justify-center"
          style={{ backgroundColor: bg, opacity: sparkleAnim }}
        >
          <Icon size={20} color={color} />
        </Animated.View>
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-1.5">
            <Sparkles size={13} color={color} />
            <Text className="text-sm font-bold text-[#e6edf3]">جاري التحليل</Text>
          </View>
          <Text className="text-xs text-[#8b949e]" key={msgIndex}>
            {messages[msgIndex]}
          </Text>
        </View>
        <Text className="text-base font-bold tabular-nums" style={{ color: progressColor }}>
          {progress}%
        </Text>
      </View>

      {/* Progress bar */}
      <View className="gap-1.5">
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.fill,
              {
                // Use Animated.Value as a multiplier of the container width
                // Never pass a template-string percentage to Animated.View
                width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                backgroundColor: progressColor,
              },
            ]}
          />
        </View>
        <Text className="text-xs text-[#656d76] text-center">
          لا تغلق الشاشة — قد يستغرق دقيقة أو دقيقتين
        </Text>
      </View>

      {/* Steps */}
      <View className="flex-row justify-around pt-1">
        {[
          { label: 'جمع البيانات', threshold: 20 },
          { label: 'التحليل',      threshold: 50 },
          { label: 'الإعداد',      threshold: 80 },
        ].map(({ label, threshold }) => {
          const done = progress >= threshold;
          return (
            <View key={label} className="items-center gap-1">
              <View
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: done ? '#4ade80' : '#30363d' }}
              />
              <Text className="text-xs" style={{ color: done ? '#4ade80' : '#656d76' }}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: '#21262d',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
