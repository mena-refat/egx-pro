import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Fingerprint, Shield, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../hooks/useTheme';
import { BRAND } from '../../lib/theme';

export default function SecurityPage() {
  const router = useRouter();
  const { colors, isRTL } = useTheme();

  return (
    <ScreenWrapper padded={false}>
      <View
        style={{
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 16,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            backgroundColor: colors.hover,
            borderColor: colors.border,
            borderWidth: 1,
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isRTL ? <ArrowRight size={16} color={colors.textSub} /> : <ArrowLeft size={16} color={colors.textSub} />}
        </Pressable>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 12,
            backgroundColor: `${BRAND}15`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Shield size={15} color={BRAND} />
        </View>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
          الأمان والخصوصية
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          // Tailwind `border rounded-2xl overflow-hidden`
          // rounded-2xl = 24px, overflow hidden is needed for inner content.
          // gap/layout is handled by contentContainerStyle above.
        >
          <View style={{ borderWidth: 1, borderRadius: 24, overflow: 'hidden' }}>
            <Pressable
              onPress={() => router.push('/settings/biometric')}
              style={({ pressed }) => ({ backgroundColor: pressed ? colors.hover : 'transparent' })}
              // flex-row items-center gap-3 px-4 py-4
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16 }}>
                <View
                  style={{
                    backgroundColor: `${colors.textSub}15`,
                    width: 32,
                    height: 32,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Fingerprint size={15} color={colors.textSub} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '500' }}>البصمة والـ PIN</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                    ادخل بسرعة عبر البصمة أو رمز 6 أرقام
                  </Text>
                </View>
                {isRTL ? <ChevronLeft size={14} color={colors.textMuted} /> : <ChevronRight size={14} color={colors.textMuted} />}
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
