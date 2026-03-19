import { View, Text, Pressable, ScrollView, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Fingerprint, Shield, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../hooks/useTheme';

export default function SecurityPage() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <ScreenWrapper padded={false}>
      <View
        style={{ borderBottomColor: colors.border, borderBottomWidth: 1 }}
        className="flex-row items-center gap-3 px-4 pt-5 pb-4"
      >
        <Pressable
          onPress={() => router.back()}
          style={{ backgroundColor: colors.hover, borderColor: colors.border }}
          className="w-9 h-9 rounded-xl border items-center justify-center"
        >
          {I18nManager.isRTL ? <ArrowRight size={16} color={colors.textSub} /> : <ArrowLeft size={16} color={colors.textSub} />}
        </Pressable>
        <View className="w-8 h-8 rounded-xl bg-brand/15 items-center justify-center">
          <Shield size={15} color="#8b5cf6" />
        </View>
        <Text style={{ color: colors.text }} className="text-base font-bold">الأمان والخصوصية</Text>
      </View>

      <ScrollView contentContainerClassName="px-4 py-5 gap-4" showsVerticalScrollIndicator={false}>
        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="border rounded-2xl overflow-hidden"
        >
          <Pressable
            onPress={() => router.push('/settings/biometric')}
            style={({ pressed }) => ({ backgroundColor: pressed ? colors.hover : 'transparent' })}
            className="flex-row items-center gap-3 px-4 py-4"
          >
            <View
              style={{ backgroundColor: `${colors.textSub}15` }}
              className="w-8 h-8 rounded-xl items-center justify-center"
            >
              <Fingerprint size={15} color={colors.textSub} />
            </View>
            <View className="flex-1">
              <Text style={{ color: colors.text }} className="text-sm font-medium">البصمة والـ PIN</Text>
              <Text style={{ color: colors.textMuted }} className="text-xs mt-0.5">ادخل بسرعة عبر البصمة أو رمز 6 أرقام</Text>
            </View>
            {I18nManager.isRTL
              ? <ChevronLeft size={14} color={colors.textMuted} />
              : <ChevronRight size={14} color={colors.textMuted} />}
          </Pressable>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
