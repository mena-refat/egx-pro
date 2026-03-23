import { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Link } from 'expo-router';
import { Fingerprint, Hash, Mail, Lock } from 'lucide-react-native';
import { Controller } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { OTPInput } from '../../components/ui/OTPInput';
import { Divider } from '../../components/ui/Divider';
import { useTheme } from '../../hooks/useTheme';
import { useLogin } from '../../hooks/useLogin';
import { BRAND, BRAND_BG_STRONG, BRAND_LIGHT, FONT, WEIGHT, RADIUS, SPACE } from '../../lib/theme';

const { height: SCREEN_H } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_H * 0.35;

export default function LoginPage() {
  const { colors, isDark } = useTheme();
  const {
    form, loading, error,
    show2FA, showPin, setShowPin,
    twoFACode, setTwoFACode,
    biometricAvail, pinAvail,
    checkBiometric, loginWithBiometric, loginWithPin,
    onSubmit, handle2FA,
  } = useLogin();

  useEffect(() => { void checkBiometric(); }, []);

  const { control, formState: { errors } } = form;

  /* ─── 2FA screen ──────────────────────────────────────────────── */
  if (show2FA) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACE.xl, paddingHorizontal: SPACE.xl }}>
          <View style={{
            width: 72, height: 72, borderRadius: RADIUS['2xl'],
            backgroundColor: BRAND_BG_STRONG, alignItems: 'center', justifyContent: 'center',
          }}>
            <Fingerprint size={34} color={BRAND} />
          </View>
          <View style={{ alignItems: 'center', gap: SPACE.sm }}>
            <Text style={{ color: colors.text, fontSize: FONT.xl, fontWeight: WEIGHT.bold }}>التحقق بخطوتين</Text>
            <Text style={{ color: colors.textSub, fontSize: FONT.sm, textAlign: 'center' }}>
              أدخل الكود من تطبيق المصادقة
            </Text>
          </View>
          <OTPInput onComplete={(code) => { setTwoFACode(code); void handle2FA(code); }} error={!!error} />
          {error && (
            <View style={{ backgroundColor: '#ef444418', borderRadius: RADIUS.lg, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md }}>
              <Text style={{ color: '#ef4444', fontSize: FONT.sm, textAlign: 'center' }}>{error}</Text>
            </View>
          )}
          <Button
            label={loading ? 'جارٍ التحقق...' : 'تأكيد'}
            loading={loading}
            onPress={() => { void handle2FA(); }}
            fullWidth
            size="lg"
          />
        </View>
      </SafeAreaView>
    );
  }

  /* ─── PIN screen ──────────────────────────────────────────────── */
  if (showPin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACE.xl, paddingHorizontal: SPACE.xl }}>
          <View style={{
            width: 72, height: 72, borderRadius: RADIUS['2xl'],
            backgroundColor: BRAND_BG_STRONG, alignItems: 'center', justifyContent: 'center',
          }}>
            <Hash size={34} color={BRAND} />
          </View>
          <View style={{ alignItems: 'center', gap: SPACE.sm }}>
            <Text style={{ color: colors.text, fontSize: FONT.xl, fontWeight: WEIGHT.bold }}>أدخل رمز PIN</Text>
            <Text style={{ color: colors.textSub, fontSize: FONT.sm, textAlign: 'center' }}>رمزك السري المكون من 4 أرقام</Text>
          </View>
          <OTPInput length={4} onComplete={(pin) => void loginWithPin(pin)} error={!!error} />
          {error && (
            <View style={{ backgroundColor: '#ef444418', borderRadius: RADIUS.lg, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md }}>
              <Text style={{ color: '#ef4444', fontSize: FONT.sm, textAlign: 'center' }}>{error}</Text>
            </View>
          )}
          {loading && <Text style={{ color: colors.textSub, fontSize: FONT.sm }}>جارٍ تسجيل الدخول...</Text>}
          <Pressable onPress={() => setShowPin(false)} style={{ paddingVertical: SPACE.md }}>
            <Text style={{ color: colors.textSub, fontSize: FONT.sm }}>استخدم كلمة المرور</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  /* ─── Main login screen ───────────────────────────────────────── */
  return (
    <View style={{ flex: 1, backgroundColor: '#090e1a' }}>
      <StatusBar barStyle="light-content" />

      {/* Hero section */}
      <View style={{ height: HERO_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: SPACE.md }}>
        <View style={{
          width: 64, height: 64, borderRadius: RADIUS.xl,
          backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: FONT['2xl'], fontWeight: WEIGHT.extrabold, color: '#fff' }}>B</Text>
        </View>
        <Text style={{ color: '#f1f5f9', fontSize: FONT['2xl'], fontWeight: WEIGHT.bold }}>Borsa</Text>
        <Text style={{ color: BRAND_LIGHT, fontSize: FONT.sm, textAlign: 'center', paddingHorizontal: SPACE['3xl'] }}>
          استثمر بذكاء في البورصة
        </Text>
      </View>

      {/* Form card */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
            gap: SPACE.xl,
          }}>
            <Text style={{ color: colors.text, fontSize: FONT.xl, fontWeight: WEIGHT.bold }}>
              تسجيل الدخول
            </Text>

            {error && (
              <View style={{ backgroundColor: '#ef444418', borderColor: '#ef444430', borderWidth: 1, borderRadius: RADIUS.lg, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md }}>
                <Text style={{ color: '#ef4444', fontSize: FONT.sm, textAlign: 'center' }}>{error}</Text>
              </View>
            )}

            <View style={{ gap: SPACE.lg }}>
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
                    leftIcon={<Lock size={16} color={colors.textMuted} />}
                  />
                )}
              />
            </View>

            <Button
              label={loading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
              loading={loading}
              onPress={onSubmit}
              fullWidth
              size="lg"
            />

            {(biometricAvail || pinAvail) && (
              <>
                <Divider label="أو" />
                <View style={{ flexDirection: 'row', gap: SPACE.md }}>
                  {biometricAvail && (
                    <Button
                      variant="outline"
                      size="md"
                      label="البصمة"
                      leftIcon={<Fingerprint size={16} color={BRAND} />}
                      onPress={loginWithBiometric}
                      style={{ flex: 1 }}
                    />
                  )}
                  {pinAvail && (
                    <Button
                      variant="outline"
                      size="md"
                      label="رمز PIN"
                      leftIcon={<Hash size={16} color={BRAND} />}
                      onPress={() => setShowPin(true)}
                      style={{ flex: 1 }}
                    />
                  )}
                </View>
              </>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: SPACE.xs }}>
              <Text style={{ color: colors.textSub, fontSize: FONT.sm }}>مش عندك حساب؟</Text>
              <Link href="/(auth)/register" asChild>
                <Pressable>
                  <Text style={{ color: BRAND, fontSize: FONT.sm, fontWeight: WEIGHT.semibold }}>سجّل الآن</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
