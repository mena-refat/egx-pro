import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import apiClient from '../lib/api/client';
import { ENDPOINTS } from '../lib/api/endpoints';
import { useAuthStore, type MobileUser } from '../store/authStore';
import {
  loginSchema,
  type LoginForm,
  normalizePhone,
  isEmailInput,
  isValidEgyptianPhone,
  validateRegisterPassword,
  registerSchema,
  type RegisterForm,
} from '../lib/validations';

const BIOMETRIC_CREDS_KEY = 'borsa_biometric_creds';
const PIN_KEY = 'borsa_pin';

export function useLogin() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [show2FA, setShow2FA] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [twoFAToken, setTwoFAToken] = useState('');
  const twoFAExpiryRef = useRef<number>(0);
  const [twoFACode, setTwoFACode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [biometricAvail, setBiometricAvail] = useState(false);
  const [pinAvail, setPinAvail] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { emailOrPhone: '', password: '' },
  });

  const checkBiometric = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const hasCreds = await SecureStore.getItemAsync(BIOMETRIC_CREDS_KEY).catch(() => null);
    setBiometricAvail(compatible && enrolled && !!hasCreds);
    const pin = await SecureStore.getItemAsync(PIN_KEY).catch(() => null);
    setPinAvail(Boolean(pin));
  };

  const loginWithPin = async (pin: string) => {
    setLoading(true);
    setError(null);
    try {
      // TODO: backend must support POST /api/auth/login with { loginMethod: 'pin', pin }
      // PIN verification is done server-side — never compare client-side from SecureStore
      const res = await apiClient.post(ENDPOINTS.auth.login, {
        loginMethod: 'pin',
        pin,
      });
      const body = res.data as { user: MobileUser; accessToken: string; refreshToken?: string };
      await setAuth(body.user, body.accessToken, body.refreshToken);
      router.replace('/');
    } catch (err: unknown) {
      const code = (err as { error?: string })?.error;
      if (code === 'INVALID_PIN') setError('رمز PIN غير صحيح');
      else setError('فشل تسجيل الدخول، حاول إدخال كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  const loginWithBiometric = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'تسجيل الدخول إلى Borsa',
      cancelLabel: 'إلغاء',
      fallbackLabel: 'استخدم كلمة المرور',
    });

    if (!result.success) return;

    const credsRaw = await SecureStore.getItemAsync(BIOMETRIC_CREDS_KEY);
    if (!credsRaw) return;

    const creds = JSON.parse(credsRaw) as { emailOrPhone: string; refreshToken?: string };
    form.setValue('emailOrPhone', creds.emailOrPhone);
    // نعتمد على refreshToken لتجديد الجلسة عبر backend
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post(ENDPOINTS.auth.refresh, {});
      const body = res.data as { user: MobileUser; accessToken: string; refreshToken?: string };
      await setAuth(body.user, body.accessToken, body.refreshToken);
      router.replace('/');
    } catch {
      setError('فشل تسجيل الدخول بالبصمة، حاول إدخال كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  const saveBiometricCreds = async (emailOrPhone: string, refreshToken?: string) => {
    if (!refreshToken) return;
    await SecureStore.setItemAsync(
      BIOMETRIC_CREDS_KEY,
      JSON.stringify({ emailOrPhone, refreshToken }),
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
    );
  };

  const handleLogin = async (data: LoginForm) => {
    setLoading(true);
    setError(null);

    const identifier = isEmailInput(data.emailOrPhone)
      ? data.emailOrPhone.trim().toLowerCase()
      : normalizePhone(data.emailOrPhone);

    if (!isEmailInput(data.emailOrPhone) && !isValidEgyptianPhone(identifier)) {
      setError('رقم الموبايل غير صحيح — يجب أن يبدأ بـ 010، 011، 012، أو 015');
      setLoading(false);
      return;
    }

    try {
      const res = await apiClient.post(ENDPOINTS.auth.login, {
        emailOrPhone: identifier,
        password: data.password,
      });

      const body = res.data as {
        requires2FA?: boolean;
        tempToken?: string;
        user?: MobileUser;
        accessToken?: string;
        refreshToken?: string;
      };

      if (body.requires2FA && body.tempToken) {
        setTwoFAToken(body.tempToken);
        // 2FA token expires in 5 minutes — track on client to reject stale attempts
        twoFAExpiryRef.current = Date.now() + 5 * 60 * 1000;
        setShow2FA(true);
        setLoading(false);
        return;
      }

      if (body.user && body.accessToken) {
        await setAuth(body.user, body.accessToken, body.refreshToken);
        await saveBiometricCreds(identifier, body.refreshToken);
        router.replace('/');
      }
    } catch (err: unknown) {
      const code = (err as { error?: string })?.error;
      if (code === 'INVALID_CREDENTIALS') setError('البريد أو كلمة المرور غير صحيحة');
      else if (code === 'ACCOUNT_LOCKED') setError('الحساب محجوب مؤقتاً — حاول بعد 30 دقيقة');
      else if (code === 'ACCOUNT_SUSPENDED') setError('هذا الحساب موقوف — تواصل مع الدعم الفني');
      // Never expose raw backend messages — they may leak implementation details
      else setError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const handle2FA = async (codeOverride?: string) => {
    const code = codeOverride ?? twoFACode;
    if (code.length !== 6) return;
    // Reject if 2FA session has expired client-side (server also enforces this)
    if (twoFAExpiryRef.current && Date.now() > twoFAExpiryRef.current) {
      setShow2FA(false);
      setTwoFAToken('');
      twoFAExpiryRef.current = 0;
      setError('انتهت صلاحية رمز التحقق — سجّل دخولك مرة أخرى');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post(ENDPOINTS.auth.twoFA.authenticate, {
        code,
        tempToken: twoFAToken,
      });
      const body = res.data as { user: MobileUser; accessToken: string; refreshToken?: string };
      await setAuth(body.user, body.accessToken, body.refreshToken);
      router.replace('/');
    } catch {
      setError('كود التحقق غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    loading,
    error,
    show2FA,
    showPin,
    setShowPin,
    twoFACode,
    setTwoFACode,
    showPassword,
    setShowPassword,
    biometricAvail,
    pinAvail,
    checkBiometric,
    loginWithBiometric,
    loginWithPin,
    onSubmit: form.handleSubmit(handleLogin),
    handle2FA,
  };
}

export function useRegister() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', emailOrPhone: '', password: '' },
  });

  const handleRegister = async (data: RegisterForm) => {
    setLoading(true);
    setError(null);

    const pwCheck = validateRegisterPassword(data.password, data.emailOrPhone);
    if (!pwCheck.ok) {
      form.setError('password', { message: pwCheck.message });
      setLoading(false);
      return;
    }

    const identifier = isEmailInput(data.emailOrPhone)
      ? data.emailOrPhone.trim().toLowerCase()
      : normalizePhone(data.emailOrPhone);

    if (!isEmailInput(data.emailOrPhone) && !isValidEgyptianPhone(identifier)) {
      form.setError('emailOrPhone', { message: 'رقم الموبايل غير صحيح' });
      setLoading(false);
      return;
    }

    try {
      const res = await apiClient.post(ENDPOINTS.auth.register, {
        fullName: data.fullName,
        emailOrPhone: identifier,
        password: data.password,
      });

      const body = res.data as { user: MobileUser; accessToken: string; refreshToken?: string };
      await setAuth(body.user, body.accessToken, body.refreshToken);
      router.replace('/');
    } catch (err: unknown) {
      const code = (err as { error?: string })?.error;
      if (code === 'EMAIL_EXISTS' || code === 'PHONE_EXISTS') {
        setError('هذا البريد أو الموبايل مسجل بالفعل');
      } else {
        setError('حدث خطأ، حاول مرة أخرى');
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    loading,
    error,
    showPassword,
    setShowPassword,
    onSubmit: form.handleSubmit(handleRegister),
  };
}

