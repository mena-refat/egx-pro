import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Fingerprint, Shield, ChevronRight } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';

export default function SecurityPage() {
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
        <Text className="text-base font-bold text-white">الأمان والخصوصية</Text>
      </View>

      <ScrollView
        contentContainerClassName="px-4 py-5 gap-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-[#111118] border border-white/[0.07] rounded-2xl overflow-hidden">
          <Pressable
            onPress={() => router.push('/settings/biometric')}
            className="flex-row items-center gap-3 px-4 py-4 border-b border-white/[0.04] active:bg-white/[0.03]"
          >
            <View className="w-8 h-8 rounded-xl bg-white/[0.06] items-center justify-center">
              <Fingerprint size={15} color="#94a3b8" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-white">تسجيل الدخول بالبصمة</Text>
              <Text className="text-xs text-slate-500 mt-0.5">استخدم بصمتك لتسجيل الدخول بسرعة</Text>
            </View>
            <ChevronRight size={14} color="#475569" />
          </Pressable>

          <View className="flex-row items-center gap-3 px-4 py-4">
            <View className="w-8 h-8 rounded-xl bg-white/[0.06] items-center justify-center">
              <Shield size={15} color="#94a3b8" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-white">المصادقة الثنائية (2FA)</Text>
              <Text className="text-xs text-amber-500 mt-0.5">قريباً — حماية إضافية لحسابك</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
