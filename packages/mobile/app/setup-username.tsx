import { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '../components/layout/ScreenWrapper';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import apiClient from '../lib/api/client';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export default function SetupUsernamePage() {
  const router = useRouter();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [saving, setSaving] = useState(false);
  const [fmtErr, setFmtErr] = useState<string | null>(null);

  const validate = (v: string) => {
    if (!v) {
      setFmtErr(null);
      return;
    }
    if (!USERNAME_REGEX.test(v)) {
      setFmtErr('3–20 حرف إنجليزي أو رقم أو _');
    } else {
      setFmtErr(null);
    }
  };

  const handleChange = (v: string) => {
    const next = v.toLowerCase();
    setValue(next);
    validate(next);
    setStatus('idle');
  };

  const checkAvailability = async () => {
    if (!value || fmtErr) return;
    setStatus('checking');
    try {
      await apiClient.get(`/api/user/username/check?username=${encodeURIComponent(value)}`);
      setStatus('available');
    } catch {
      setStatus('taken');
    }
  };

  const handleSubmit = async () => {
    if (!value || fmtErr || status === 'taken') return;
    setSaving(true);
    try {
      await apiClient.put('/api/user/profile', { username: value });
      updateUser({ username: value });
      router.replace('/');
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const { colors } = useTheme();

  const statusColor =
    {
      available: '#4ade80',
      taken: '#f87171',
      error: '#f87171',
      checking: colors.textMuted,
      idle: colors.textMuted,
    }[status] ?? colors.textMuted;

  const statusMsg =
    {
      available: '✓ اسم المستخدم متاح',
      taken: '✗ اسم المستخدم محجوز',
      error: 'حدث خطأ، حاول مرة أخرى',
      checking: 'جارٍ التحقق...',
      idle: '',
    }[status] ?? '';

  return (
    <ScreenWrapper padded>
      <View style={{ flex: 1, justifyContent: 'center', gap: 24, paddingHorizontal: 8 }}>
        <View style={{ alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>
            اختار اسم مستخدم
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
            اسم مميز يعرفك به المتابعون — يمكن تغييره مرة واحدة فقط لاحقاً
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          <Input
            label="اسم المستخدم"
            placeholder="egx_trader"
            value={value}
            onChangeText={handleChange}
            onBlur={checkAvailability}
            autoCapitalize="none"
            autoCorrect={false}
            error={fmtErr ?? undefined}
          />

          {statusMsg ? (
            <Text style={{ color: statusColor, fontSize: 11, fontWeight: '500' }}>
              {statusMsg}
            </Text>
          ) : null}
        </View>

        <Button
          label={saving ? 'جارٍ الحفظ...' : 'تأكيد واستمرار'}
          loading={saving}
          onPress={handleSubmit}
          disabled={!value || !!fmtErr || status === 'taken' || saving}
          fullWidth
          size="lg"
        />
      </View>
    </ScreenWrapper>
  );
}

