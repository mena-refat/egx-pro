import { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Fingerprint, Hash } from 'lucide-react-native';
import { I18nManager } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Button } from '../../components/ui/Button';
import { OTPInput } from '../../components/ui/OTPInput';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import { tw } from '../../lib/tw';

const BIOMETRIC_CREDS_KEY = 'borsa_biometric_creds';
const PIN_KEY = 'borsa_pin';

type PinStep = 'idle' | 'enter' | 'confirm' | 'remove';

export default function BiometricPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors } = useTheme();

  const [supported, setSupported] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinStep, setPinStep] = useState<PinStep>('idle');
  const [pinFirst, setPinFirst] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinInputKey, setPinInputKey] = useState(0); // force OTPInput remount

  useEffect(() => {
    const check = async () => {
      const hw = await LocalAuthentication.hasHardwareAsync();
      const enr = await LocalAuthentication.isEnrolledAsync();
      const creds = await SecureStore.getItemAsync(BIOMETRIC_CREDS_KEY).catch(() => null);
      const pin = await SecureStore.getItemAsync(PIN_KEY).catch(() => null);
      setSupported(hw);
      setEnrolled(enr);
      setBiometricEnabled(Boolean(creds));
      setPinEnabled(Boolean(pin));
    };
    void check();
  }, []);

  const resetPinInput = () => setPinInputKey((k) => k + 1);

  /* ─── Biometric ─── */

  const enableBiometric = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'تأكيد تفعيل الدخول بالبصمة',
      cancelLabel: 'إلغاء',
    });
    if (!result.success) return;

    const existing = await SecureStore.getItemAsync(BIOMETRIC_CREDS_KEY).catch(() => null);
    if (existing) {
      setBiometricEnabled(true);
      Alert.alert('تم التفعيل ✓', 'يمكنك الآن الدخول بالبصمة');
      return;
    }

    // User is already authenticated — save their identifier now
    const emailOrPhone = user?.email ?? user?.phone ?? '';
    if (!emailOrPhone) {
      Alert.alert('خطأ', 'تعذّر قراءة بيانات المستخدم');
      return;
    }

    await SecureStore.setItemAsync(
      BIOMETRIC_CREDS_KEY,
      JSON.stringify({ emailOrPhone }),
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
    );
    setBiometricEnabled(true);
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
          setBiometricEnabled(false);
        },
      },
    ]);
  };

  /* ─── PIN ─── */

  const handlePinComplete = async (pin: string) => {
    if (pinStep === 'enter') {
      setPinFirst(pin);
      setPinError(null);
      setPinStep('confirm');
      resetPinInput();
      return;
    }

    if (pinStep === 'confirm') {
      if (pin !== pinFirst) {
        setPinError('الـ PIN غير متطابق — حاول مرة أخرى');
        setPinFirst('');
        setPinStep('enter');
        resetPinInput();
        return;
      }
      await SecureStore.setItemAsync(PIN_KEY, pin, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      setPinEnabled(true);
      setPinStep('idle');
      setPinError(null);
      Alert.alert('تم تفعيل PIN ✓', 'يمكنك الآن الدخول بالـ PIN');
      return;
    }

    if (pinStep === 'remove') {
      const storedPin = await SecureStore.getItemAsync(PIN_KEY).catch(() => null);
      if (!storedPin || storedPin !== pin) {
        setPinError('الـ PIN غير صحيح');
        resetPinInput();
        return;
      }
      await SecureStore.deleteItemAsync(PIN_KEY).catch(() => null);
      setPinEnabled(false);
      setPinStep('idle');
      setPinError(null);
    }
  };

  const cancelPin = () => {
    setPinStep('idle');
    setPinError(null);
    setPinFirst('');
    resetPinInput();
  };

  const pinStepTitle = pinStep === 'enter'
    ? 'أدخل رمز PIN الجديد'
    : pinStep === 'confirm'
    ? 'أكد رمز PIN'
    : 'أدخل رمز PIN الحالي';

  const pinStepSub = pinStep === 'enter'
    ? 'اختر رمزاً مكوناً من 6 أرقام'
    : pinStep === 'confirm'
    ? 'أعد إدخال الرمز للتأكيد'
    : 'أدخل رمزك الحالي لتعطيله';

  return (
    <ScreenWrapper padded={false}>
      {/* Header */}
      <View
        style={[
          { borderBottomColor: colors.border },
          tw('flex-row items-center gap-3 px-4 pt-5 pb-4 border-b'),
        ]}
      >
        <Pressable
          onPress={() => pinStep !== 'idle' ? cancelPin() : router.back()}
          style={[
            { backgroundColor: colors.hover, borderColor: colors.border },
            tw('w-9 h-9 rounded-xl border items-center justify-center'),
          ]}
        >
          {I18nManager.isRTL ? <ArrowRight size={16} color={colors.textMuted} /> : <ArrowLeft size={16} color={colors.textMuted} />}
        </Pressable>
        <View style={tw('w-8 h-8 rounded-xl bg-brand/15 items-center justify-center')}>
          {pinStep !== 'idle' ? <Hash size={15} color="#8b5cf6" /> : <Fingerprint size={15} color="#8b5cf6" />}
        </View>
        <Text style={[{ color: colors.text }, tw('text-base font-bold')]}>
          {pinStep !== 'idle' ? 'إعداد PIN' : 'البصمة والـ PIN'}
        </Text>
      </View>

      {/* PIN entry screen */}
      {pinStep !== 'idle' ? (
        <View style={tw('flex-1 px-4 justify-center items-center gap-6')}>
          <View style={tw('w-20 h-20 rounded-full bg-brand/10 items-center justify-center')}>
            <Hash size={36} color="#8b5cf6" />
          </View>
          <View style={tw('items-center gap-1')}>
            <Text style={[{ color: colors.text }, tw('text-xl font-bold')]}>{pinStepTitle}</Text>
            <Text style={[{ color: colors.textMuted }, tw('text-sm text-center')]}>{pinStepSub}</Text>
          </View>

          <OTPInput
            key={pinInputKey}
            onComplete={handlePinComplete}
            error={Boolean(pinError)}
          />

          {pinError && (
            <Text style={tw('text-sm text-red-400 bg-red-500/10 px-4 py-2.5 rounded-xl text-center')}>
              {pinError}
            </Text>
          )}

          <Pressable onPress={cancelPin} style={tw('py-3')}>
            <Text style={[{ color: colors.textMuted }, tw('text-sm') ]}>إلغاء</Text>
          </Pressable>
        </View>
      ) : (
        <View style={tw('flex-1 px-4 pt-6 gap-5')}>
          {/* ─── Biometric section ─── */}
          <View
            style={[
              { backgroundColor: colors.card, borderColor: colors.border },
              tw('border rounded-2xl p-5 items-center gap-4'),
            ]}
          >
            <View
              style={[
                tw('w-20 h-20 rounded-full items-center justify-center'),
                { backgroundColor: biometricEnabled ? '#4ade8018' : colors.hover },
              ]}
            >
              <Fingerprint size={36} color={biometricEnabled ? '#4ade80' : colors.textMuted} />
            </View>
            <View style={tw('items-center gap-1')}>
              <Text style={[{ color: colors.text }, tw('text-base font-bold')]}>
                {biometricEnabled ? 'الدخول بالبصمة مفعّل' : 'الدخول بالبصمة معطّل'}
              </Text>
              <Text style={[{ color: colors.textSub }, tw('text-sm text-center leading-5')]}>
                {!supported
                  ? 'جهازك لا يدعم المصادقة البيومترية'
                  : !enrolled
                    ? 'أضف بصمة في إعدادات الجهاز أولاً'
                    : biometricEnabled
                      ? 'يمكنك الدخول للتطبيق بدون كلمة مرور'
                      : 'فعّل للدخول بسرعة وأمان'}
              </Text>
            </View>

            {supported && enrolled && (
              biometricEnabled ? (
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
          </View>

          {/* ─── PIN section ─── */}
          <View
            style={[
              { backgroundColor: colors.card, borderColor: colors.border },
              tw('border rounded-2xl p-5 items-center gap-4'),
            ]}
          >
            <View
              style={[
                tw('w-20 h-20 rounded-full items-center justify-center'),
                { backgroundColor: pinEnabled ? '#4ade8018' : colors.hover },
              ]}
            >
              <Hash size={36} color={pinEnabled ? '#4ade80' : colors.textMuted} />
            </View>
            <View style={tw('items-center gap-1')}>
              <Text style={[{ color: colors.text }, tw('text-base font-bold')]}>
                {pinEnabled ? 'رمز PIN مفعّل' : 'رمز PIN معطّل'}
              </Text>
              <Text style={[{ color: colors.textSub }, tw('text-sm text-center leading-5')]}>
                {pinEnabled
                  ? 'يمكنك الدخول للتطبيق برمز 6 أرقام'
                  : 'فعّل للدخول برمز سري من 6 أرقام'}
              </Text>
            </View>

            {pinEnabled ? (
              <Button
                label="تعطيل رمز PIN"
                onPress={() => { setPinError(null); setPinStep('remove'); }}
                variant="danger"
                fullWidth
                size="lg"
              />
            ) : (
              <Button
                label="إعداد رمز PIN"
                onPress={() => { setPinError(null); setPinStep('enter'); }}
                fullWidth
                size="lg"
              />
            )}
          </View>

          <View
            style={[
              { backgroundColor: colors.card, borderColor: colors.border },
              tw('border rounded-2xl px-4 py-3'),
            ]}
          >
            <Text style={[{ color: colors.textMuted }, tw('text-xs leading-5 text-center')]}>
              بياناتك محفوظة في Keychain (iOS) أو Keystore (Android) — أمان تخزين على جهازك
            </Text>
          </View>
        </View>
      )}
    </ScreenWrapper>
  );
}
