import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { Controller } from 'react-hook-form';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useRegister } from '../../hooks/useLogin';
import { useTheme } from '../../hooks/useTheme';

export default function RegisterPage() {
  const { form, loading, error, onSubmit } = useRegister();
  const { colors } = useTheme();
  const {
    control,
    formState: { errors },
  } = form;

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View style={{
              width: 56, height: 56, borderRadius: 16,
              backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff' }}>B</Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>إنشاء حساب جديد</Text>
            <Text style={{ fontSize: 13, color: colors.textSub, marginTop: 4 }}>ابدأ رحلتك في البورصة</Text>
          </View>

          <View style={{
            backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
            borderRadius: 20, padding: 24, gap: 20,
          }}>
            {error && (
              <View style={{
                backgroundColor: '#ef444418', borderWidth: 1, borderColor: '#ef444430',
                borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
              }}>
                <Text style={{ fontSize: 13, color: '#f87171', textAlign: 'center' }}>{error}</Text>
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

            <View style={{
              backgroundColor: colors.hover, borderRadius: 12, padding: 12, gap: 4,
            }}>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>متطلبات كلمة المرور:</Text>
              <Text style={{ fontSize: 11, color: colors.textSub }}>• 8 أحرف على الأقل</Text>
              <Text style={{ fontSize: 11, color: colors.textSub }}>• حرف كبير واحد على الأقل (A-Z)</Text>
              <Text style={{ fontSize: 11, color: colors.textSub }}>• رقم واحد على الأقل (0-9)</Text>
            </View>

            <Button
              label={loading ? 'جارٍ التسجيل...' : 'إنشاء الحساب'}
              loading={loading}
              onPress={onSubmit}
              fullWidth
              size="lg"
            />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 24 }}>
            <Text style={{ fontSize: 13, color: colors.textSub }}>عندك حساب بالفعل؟</Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={{ fontSize: 13, color: '#8b5cf6', fontWeight: '600' }}>سجّل دخول</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}
