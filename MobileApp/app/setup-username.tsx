import { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '../components/layout/ScreenWrapper';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import apiClient from '../lib/api/client';
import { useAuthStore } from '../store/authStore';

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

  const statusColor =
    {
      available: 'text-green-400',
      taken: 'text-red-400',
      error: 'text-red-400',
      checking: 'text-slate-400',
      idle: 'text-slate-400',
    }[status] ?? 'text-slate-400';

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
      <View className="flex-1 justify-center gap-6 px-2">
        <View className="items-center gap-2 mb-4">
          <Text className="text-2xl font-bold text-white">اختار اسم مستخدم</Text>
          <Text className="text-sm text-slate-400 text-center">
            اسم مميز يعرفك به المتابعون — يمكن تغييره مرة واحدة فقط لاحقاً
          </Text>
        </View>

        <View className="gap-3">
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

          {statusMsg ? <Text className={`text-xs ${statusColor}`}>{statusMsg}</Text> : null}
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

