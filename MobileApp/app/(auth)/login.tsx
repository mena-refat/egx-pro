import { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { Fingerprint } from 'lucide-react-native';
import { Controller } from 'react-hook-form';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { OTPInput } from '../../components/ui/OTPInput';
import { useLogin } from '../../hooks/useLogin';

export default function LoginPage() {
  const {
    form,
    loading,
    error,
    show2FA,
    twoFACode,
    setTwoFACode,
    biometricAvail,
    checkBiometric,
    loginWithBiometric,
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

  if (show2FA) {
    return (
      <ScreenWrapper>
        <View className="flex-1 justify-center items-center gap-6 px-6">
          <View className="w-16 h-16 rounded-full bg-brand/10 items-center justify-center">
            <Fingerprint size={32} color="#10b981" />
          </View>
          <View className="items-center gap-2">
            <Text className="text-xl font-bold text-white">التحقق بخطوتين</Text>
            <Text className="text-sm text-slate-400 text-center">
              أدخل الكود من تطبيق المصادقة
            </Text>
          </View>
          <OTPInput
            onComplete={(code) => {
              setTwoFACode(code);
              void handle2FA();
            }}
            error={!!error}
          />
          {error && (
            <Text className="text-sm text-red-400 bg-red-500/10 px-4 py-2.5 rounded-xl">
              {error}
            </Text>
          )}
          <Button label={loading ? 'جارٍ التحقق...' : 'تأكيد'} loading={loading} onPress={handle2FA} fullWidth />
        </View>
      </ScreenWrapper>
    );
  }

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
          <View className="items-center mb-10">
            <View className="w-14 h-14 rounded-2xl bg-brand items-center justify-center mb-4">
              <Text className="text-2xl font-bold text-white">B</Text>
            </View>
            <Text className="text-2xl font-bold text-white">Borsa</Text>
            <Text className="text-sm text-slate-400 mt-1">بورصة مصر في يدك</Text>
          </View>

          <View className="bg-[#111118] border border-white/[0.07] rounded-2xl p-6 gap-5">
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

            {biometricAvail && (
              <Pressable onPress={loginWithBiometric} className="flex-row items-center justify-center gap-2 py-3">
                <Fingerprint size={20} color="#10b981" />
                <Text className="text-sm text-brand font-medium">الدخول بالبصمة / Face ID</Text>
              </Pressable>
            )}
          </View>

          <View className="flex-row justify-center gap-1 mt-6">
            <Text className="text-sm text-slate-400">مش عندك حساب؟</Text>
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

