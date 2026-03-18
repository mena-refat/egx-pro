import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, TrendingUp } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';

export default function PredictionsPage() {
  const router = useRouter();

  return (
    <ScreenWrapper padded={false}>
      <View className="flex-row items-center gap-3 px-4 pt-5 pb-4 border-b border-white/[0.06]">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white/[0.05] items-center justify-center"
        >
          <ArrowLeft size={16} color="#94a3b8" />
        </Pressable>
        <Text className="text-base font-bold text-white">التوقعات</Text>
      </View>

      <View className="flex-1 items-center justify-center gap-4 px-6">
        <View className="w-16 h-16 rounded-2xl bg-brand/10 items-center justify-center">
          <TrendingUp size={30} color="#10b981" />
        </View>
        <Text className="text-lg font-bold text-white text-center">توقعات السوق</Text>
        <Text className="text-sm text-slate-400 text-center">
          قريباً — تحليلات وتوقعات ذكية مدعومة بالذكاء الاصطناعي لأسهم البورصة المصرية
        </Text>
      </View>
    </ScreenWrapper>
  );
}
