import { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Fingerprint } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Button } from '../../components/ui/Button';

const BIOMETRIC_CREDS_KEY = 'borsa_biometric_creds';

export default function BiometricPage() {
  const router = useRouter();
  const [supported, setSupported] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const check = async () => {
      const hw = await LocalAuthentication.hasHardwareAsync();
      const enr = await LocalAuthentication.isEnrolledAsync();
      const creds = await SecureStore.getItemAsync(BIOMETRIC_CREDS_KEY).catch(() => null);
      setSupported(hw);
      setEnrolled(enr);
      setEnabled(Boolean(creds));
    };
    void check();
  }, []);

  const enableBiometric = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'تأكيد تفعيل الدخول بالبصمة',
      cancelLabel: 'إلغاء',
    });
    if (!result.success) return;

    const existing = await SecureStore.getItemAsync(BIOMETRIC_CREDS_KEY).catch(() => null);
    if (!existing) {
      Alert.alert('تنبيه', 'سجّل الدخول مرة واحدة أولاً لحفظ بياناتك');
      return;
    }
    setEnabled(true);
    Alert.alert('تم التفعيل ✓', 'يمكنك الآن الدخول بالبصمة');
  };

  const disableBiometric = () => {
    Alert.alert('تعطيل الدخول بالبصمة', 'هل أنت متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تعطيل',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync(BIOMETRIC_CREDS_KEY).catch(() => null);
          setEnabled(false);
        },
      },
    ]);
  };

  return (
    <ScreenWrapper padded={false}>
      <View className="flex-row items-center gap-3 px-4 pt-5 pb-4 border-b border-white/[0.06]">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white/[0.05] items-center justify-center"
        >
          <ArrowLeft size={16} color="#94a3b8" />
        </Pressable>
        <Text className="text-base font-bold text-white">البصمة / Face ID</Text>
      </View>

      <View className="flex-1 px-4 pt-8 gap-6">
        <View className="bg-[#111118] border border-white/[0.07] rounded-2xl p-6 items-center gap-4">
          <View
            className={`w-20 h-20 rounded-full items-center justify-center ${
              enabled ? 'bg-emerald-500/15' : 'bg-white/[0.05]'
            }`}
          >
            <Fingerprint size={36} color={enabled ? '#10b981' : '#64748b'} />
          </View>
          <View className="items-center gap-1">
            <Text className="text-base font-bold text-white">
              {enabled ? 'الدخول بالبصمة مفعّل' : 'الدخول بالبصمة معطّل'}
            </Text>
            <Text className="text-sm text-slate-400 text-center leading-5">
              {!supported
                ? 'جهازك لا يدعم المصادقة البيومترية'
                : !enrolled
                  ? 'أضف بصمة أو Face ID في إعدادات الجهاز أولاً'
                  : enabled
                    ? 'يمكنك الدخول للتطبيق بدون كلمة مرور'
                    : 'فعّل للدخول بسرعة وأمان'}
            </Text>
          </View>
        </View>

        {supported && enrolled && (
          enabled ? (
            <Button
              label="تعطيل الدخول بالبصمة"
              onPress={disableBiometric}
              variant="danger"
              fullWidth
              size="lg"
            />
          ) : (
            <Button
              label="تفعيل الدخول بالبصمة"
              onPress={enableBiometric}
              fullWidth
              size="lg"
            />
          )
        )}

        <View className="bg-blue-500/10 border border-blue-500/20 rounded-2xl px-4 py-3">
          <Text className="text-xs text-blue-400 leading-5 text-center">
            بياناتك محفوظة في Keychain (iOS) أو Keystore (Android) — أمن تخزين على جهازك
          </Text>
        </View>
      </View>
    </ScreenWrapper>
  );
}

