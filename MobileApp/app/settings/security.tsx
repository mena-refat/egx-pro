import { View, Text, Pressable, ScrollView, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Fingerprint, Shield, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';

export default function SecurityPage() {
  const router = useRouter();

  return (
    <ScreenWrapper padded={false}>
      <View className="flex-row items-center gap-3 px-4 pt-5 pb-4 border-b border-[#30363d]">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white/[0.04] border border-[#30363d] items-center justify-center"
        >
          {I18nManager.isRTL ? <ArrowRight size={16} color="#8b949e" /> : <ArrowLeft size={16} color="#8b949e" />}
        </Pressable>
        <View className="w-8 h-8 rounded-xl bg-brand/15 items-center justify-center">
          <Shield size={15} color="#8b5cf6" />
        </View>
        <Text className="text-base font-bold text-[#e6edf3]">الأمان والخصوصية</Text>
      </View>

      <ScrollView contentContainerClassName="px-4 py-5 gap-4" showsVerticalScrollIndicator={false}>
        <View className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden">
          <Pressable
            onPress={() => router.push('/settings/biometric')}
            className="flex-row items-center gap-3 px-4 py-4 border-b border-[#21262d] active:bg-white/[0.03]"
          >
            <View className="w-8 h-8 rounded-xl bg-white/[0.05] items-center justify-center">
              <Fingerprint size={15} color="#8b949e" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-[#e6edf3]">تسجيل الدخول بالبصمة</Text>
              <Text className="text-xs text-[#656d76] mt-0.5">استخدم بصمتك لتسجيل الدخول بسرعة</Text>
            </View>
            {I18nManager.isRTL
              ? <ChevronLeft size={14} color="#30363d" />
              : <ChevronRight size={14} color="#30363d" />}
          </Pressable>

          <View className="flex-row items-center gap-3 px-4 py-4">
            <View className="w-8 h-8 rounded-xl bg-white/[0.05] items-center justify-center">
              <Shield size={15} color="#8b949e" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-[#e6edf3]">المصادقة الثنائية (2FA)</Text>
              <Text className="text-xs text-[#f59e0b] mt-0.5">قريباً — حماية إضافية لحسابك</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
