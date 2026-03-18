import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Compass } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';

export default function GoalsPage() {
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
        <Text className="text-base font-bold text-white">الأهداف المالية</Text>
      </View>

      <View className="flex-1 items-center justify-center gap-4 px-6">
        <View className="w-16 h-16 rounded-2xl bg-brand/10 items-center justify-center">
          <Compass size={30} color="#10b981" />
        </View>
        <Text className="text-lg font-bold text-white text-center">أهدافك المالية</Text>
        <Text className="text-sm text-slate-400 text-center">
          قريباً — حدد أهدافك المالية وتابع تقدمك نحو تحقيقها
        </Text>
      </View>
    </ScreenWrapper>
  );
}
