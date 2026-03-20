import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform, StatusBar, Dimensions } from 'react-native';
import { Link } from 'expo-router';
import { Controller, useWatch } from 'react-hook-form';
import { User, Mail, Lock, CheckCircle2 } from 'lucide-react-native';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useRegister } from '../../hooks/useLogin';
import { useTheme } from '../../hooks/useTheme';
import {
  BRAND, BRAND_LIGHT, BRAND_BG_STRONG,
  GREEN, YELLOW, RED,
  FONT, WEIGHT, RADIUS, SPACE,
} from '../../lib/theme';

const { height: SCREEN_H } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_H * 0.28;

// Password strength: 0=none, 1=weak, 2=medium, 3=strong
function getStrength(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  return Math.min(score, 3) as 0 | 1 | 2 | 3;
}

const STRENGTH_META = [
  { label: '',        color: 'transparent' },
  { label: 'ضعيفة',  color: RED },
  { label: 'متوسطة', color: YELLOW },
  { label: 'قوية',   color: GREEN },
] as const;

function PasswordStrengthBar({ password }: { password: string }) {
  const { colors } = useTheme();
  const level = getStrength(password);
  if (!password) return null;
  const meta = STRENGTH_META[level];

  return (
    <View style={{ gap: SPACE.xs }}>
      <View style={{ flexDirection: 'row', gap: SPACE.xs }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1, height: 3, borderRadius: 2,
              backgroundColor: i <= level ? meta.color : colors.border,
            }}
          />
        ))}
      </View>
      <Text style={{ color: meta.color, fontSize: FONT.xs, fontWeight: WEIGHT.medium }}>
        كلمة المرور {meta.label}
      </Text>
    </View>
  );
}

export default function RegisterPage() {
  const { form, loading, error, onSubmit } = useRegister();
  const { colors, isDark } = useTheme();
  const { control, formState: { errors } } = form;
  const passwordValue = useWatch({ control, name: 'password', defaultValue: '' });

  return (
    <View style={{ flex: 1, backgroundColor: '#090e1a' }}>
      <StatusBar barStyle="light-content" />

      {/* Hero */}
      <View style={{ height: HERO_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: SPACE.md }}>
        <View style={{
          width: 60, height: 60, borderRadius: RADIUS.xl,
          backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: FONT.xl, fontWeight: WEIGHT.extrabold, color: '#fff' }}>E</Text>
        </View>
        <Text style={{ color: '#f1f5f9', fontSize: FONT.xl, fontWeight: WEIGHT.bold }}>إنشاء حساب جديد</Text>
        <Text style={{ color: BRAND_LIGHT, fontSize: FONT.sm }}>ابدأ رحلتك في البورصة</Text>
      </View>

      {/* Form card */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View style={{
            flex: 1,
            backgroundColor: colors.card,
            borderTopLeftRadius:  32,
            borderTopRightRadius: 32,
            paddingHorizontal: SPACE.xl + SPACE.sm,
            paddingTop: SPACE.xl + SPACE.sm,
            paddingBottom: SPACE['3xl'],
            gap: SPACE.lg,
          }}>
            <Text style={{ color: colors.text, fontSize: FONT.xl, fontWeight: WEIGHT.bold }}>
              بياناتك
            </Text>

            {error && (
              <View style={{ backgroundColor: '#ef444418', borderColor: '#ef444430', borderWidth: 1, borderRadius: RADIUS.lg, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md }}>
                <Text style={{ color: '#ef4444', fontSize: FONT.sm, textAlign: 'center' }}>{error}</Text>
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
                  leftIcon={<User size={16} color={colors.textMuted} />}
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
                  leftIcon={<Mail size={16} color={colors.textMuted} />}
                />
              )}
            />

            <View style={{ gap: SPACE.sm }}>
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
                    leftIcon={<Lock size={16} color={colors.textMuted} />}
                  />
                )}
              />
              <PasswordStrengthBar password={passwordValue} />
            </View>

            <Button
              label={loading ? 'جارٍ التسجيل...' : 'إنشاء الحساب'}
              loading={loading}
              onPress={onSubmit}
              fullWidth
              size="lg"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: SPACE.xs }}>
              <Text style={{ color: colors.textSub, fontSize: FONT.sm }}>عندك حساب بالفعل؟</Text>
              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text style={{ color: BRAND, fontSize: FONT.sm, fontWeight: WEIGHT.semibold }}>سجّل دخول</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
