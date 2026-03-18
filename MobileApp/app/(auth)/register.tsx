import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { Controller } from 'react-hook-form';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useRegister } from '../../hooks/useLogin';

export default function RegisterPage() {
  const { form, loading, error, onSubmit } = useRegister();
  const {
    control,
    formState: { errors },
  } = form;

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
          <View className="items-center mb-8">
            <View className="w-14 h-14 rounded-2xl bg-brand items-center justify-center mb-3">
              <Text className="text-2xl font-bold text-white">B</Text>
            </View>
            <Text className="text-2xl font-bold text-white">إنشاء حساب جديد</Text>
            <Text className="text-sm text-slate-400 mt-1">ابدأ رحلتك في البورصة</Text>
          </View>

          <View className="bg-[#111118] border border-white/[0.07] rounded-2xl p-6 gap-5">
            {error && (
              <View className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <Text className="text-sm text-red-400 text-center">{error}</Text>
              </View>
            )}

            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input
                  label="الاسم الكامل"
                  placeholder="Ahmed Mohamed"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="words"
                  error={errors.fullName?.message}
                />
              )}
            />

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
                  placeholder="8 أحرف على الأقل"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  isPassword
                  error={errors.password?.message}
                />
              )}
            />

            <View className="bg-white/[0.04] rounded-xl p-3 gap-1">
              <Text className="text-xs text-slate-500">متطلبات كلمة المرور:</Text>
              <Text className="text-xs text-slate-400">• 8 أحرف على الأقل</Text>
              <Text className="text-xs text-slate-400">• حرف كبير واحد على الأقل (A-Z)</Text>
              <Text className="text-xs text-slate-400">• رقم واحد على الأقل (0-9)</Text>
            </View>

            <Button
              label={loading ? 'جارٍ التسجيل...' : 'إنشاء الحساب'}
              loading={loading}
              onPress={onSubmit}
              fullWidth
              size="lg"
            />
          </View>

          <View className="flex-row justify-center gap-1 mt-6">
            <Text className="text-sm text-slate-400">عندك حساب بالفعل؟</Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text className="text-sm text-brand font-semibold">سجّل دخول</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

