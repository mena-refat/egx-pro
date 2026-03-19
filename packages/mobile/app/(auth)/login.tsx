import { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { Fingerprint, Hash } from 'lucide-react-native';
import { Controller } from 'react-hook-form';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { OTPInput } from '../../components/ui/OTPInput';
import { useTheme } from '../../hooks/useTheme';
import { useLogin } from '../../hooks/useLogin';

export default function LoginPage() {
  const { colors } = useTheme();
  const {
    form,
    loading,
    error,
    show2FA,
    showPin,
    setShowPin,
    twoFACode,
    setTwoFACode,
    biometricAvail,
    pinAvail,
    checkBiometric,
    loginWithBiometric,
    loginWithPin,
    onSubmit,
    handle2FA,
  } = useLogin();

  useEffect(() => {
    void checkBiometric();
  }, []);

  const {
    control,
    formState: { errors },
  } = form;

  /* ─── 2FA screen ─── */
  if (show2FA) {
    return (
      <ScreenWrapper>
        <View className="flex-1 justify-center items-center gap-6 px-6">
          <View className="w-16 h-16 rounded-full bg-brand/10 items-center justify-center">
            <Fingerprint size={32} color="#8b5cf6" />
          </View>
          <View className="items-center gap-2">
            <Text style={{ color: colors.text }} className="text-xl font-bold">التحقق بخطوتين</Text>
            <Text style={{ color: colors.textSub }} className="text-sm text-center">
              أدخل الكود من تطبيق المصادقة
            </Text>
          </View>
          <OTPInput
            onComplete={(code) => {
              setTwoFACode(code);
              void handle2FA(code);
            }}
            error={!!error}
          />
          {error && (
            <Text className="text-sm text-red-400 bg-red-500/10 px-4 py-2.5 rounded-xl">
              {error}
            </Text>
          )}
          <Button
            label={loading ? 'جارٍ التحقق...' : 'تأكيد'}
            loading={loading}
            onPress={handle2FA}
            fullWidth
          />
        </View>
      </ScreenWrapper>
    );
  }

  /* ─── PIN screen ─── */
  if (showPin) {
    return (
      <ScreenWrapper>
        <View className="flex-1 justify-center items-center gap-6 px-6">
          <View className="w-16 h-16 rounded-full bg-brand/10 items-center justify-center">
            <Hash size={32} color="#8b5cf6" />
          </View>
          <View className="items-center gap-2">
            <Text style={{ color: colors.text }} className="text-xl font-bold">أدخل رمز PIN</Text>
            <Text style={{ color: colors.textSub }} className="text-sm text-center">
              رمزك السري المكون من 4 أرقام
            </Text>
          </View>
          <OTPInput
            length={4}
            onComplete={(pin) => void loginWithPin(pin)}
            error={!!error}
          />
          {error && (
            <Text className="text-sm text-red-400 bg-red-500/10 px-4 py-2.5 rounded-xl">
              {error}
            </Text>
          )}
          {loading && (
            <Text style={{ color: colors.textSub }} className="text-sm">جارٍ تسجيل الدخول...</Text>
          )}
          <Pressable onPress={() => setShowPin(false)} className="py-3">
            <Text style={{ color: colors.textSub }} className="text-sm">استخدم كلمة المرور</Text>
          </Pressable>
        </View>
      </ScreenWrapper>
    );
  }

  /* ─── Main login screen ─── */
  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View className="items-center mb-10">
            <View className="w-14 h-14 rounded-2xl bg-brand items-center justify-center mb-4">
              <Text className="text-2xl font-bold text-white">B</Text>
            </View>
            <Text style={{ color: colors.text }} className="text-2xl font-bold">Borsa</Text>
            <Text style={{ color: colors.textSub }} className="text-sm mt-1">بورصة مصر في يدك</Text>
          </View>

          {/* Form */}
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl p-6 gap-5">
            {error && (
              <View className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <Text className="text-sm text-red-400 text-center">{error}</Text>
              </View>
            )}

            <Controller
              control={control}
              name="emailOrPhone"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input
                  label="البريد الإلكتروني أو الموبايل"
                  placeholder="example@email.com أو 010xxxxxxxx"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  error={errors.emailOrPhone?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input
                  label="كلمة المرور"
                  placeholder="••••••••"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  isPassword
                  error={errors.password?.message}
                />
              )}
            />

            <Button
              label={loading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
              loading={loading}
              onPress={onSubmit}
              fullWidth
              size="lg"
            />

            {/* Quick login buttons */}
            {(biometricAvail || pinAvail) && (
              <View className="flex-row gap-3">
                {biometricAvail && (
                  <Pressable
                    onPress={loginWithBiometric}
                    className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl bg-brand/10 border border-brand/20"
                  >
                    <Fingerprint size={18} color="#8b5cf6" />
                    <Text className="text-sm text-brand font-medium">البصمة</Text>
                  </Pressable>
                )}
                {pinAvail && (
                  <Pressable
                    onPress={() => setShowPin(true)}
                    className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl bg-brand/10 border border-brand/20"
                  >
                    <Hash size={18} color="#8b5cf6" />
                    <Text className="text-sm text-brand font-medium">رمز PIN</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          <View className="flex-row justify-center gap-1 mt-6">
            <Text style={{ color: colors.textSub }} className="text-sm">مش عندك حساب؟</Text>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text className="text-sm text-brand font-semibold">سجّل الآن</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}
