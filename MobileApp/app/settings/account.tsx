import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Pencil } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../lib/api/client';

interface FieldRowProps {
  label: string;
  value: string;
  onEdit: () => void;
  editable?: boolean;
}

function FieldRow({ label, value, onEdit, editable = true }: FieldRowProps) {
  return (
    <View className="flex-row items-center justify-between py-3.5 border-b border-white/[0.04]">
      <View className="flex-1">
        <Text className="text-xs text-slate-500 mb-0.5">{label}</Text>
        <Text className="text-sm text-white">{value || '—'}</Text>
      </View>
      {editable && (
        <Pressable onPress={onEdit} className="p-2">
          <Pencil size={14} color="#64748b" />
        </Pressable>
      )}
    </View>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [editing, setEditing] = useState<'fullName' | 'username' | null>(null);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (field: 'fullName' | 'username') => {
    setEditing(field);
    setValue(field === 'fullName' ? user?.fullName ?? '' : user?.username ?? '');
    setError(null);
    setSuccess(false);
  };

  const save = async () => {
    if (!editing || !value.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.put('/api/user/profile', { [editing]: value.trim() });
      updateUser({ [editing]: value.trim() });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setEditing(null);
      }, 1200);
    } catch (err: unknown) {
      const code = (err as { error?: string })?.error;
      if (code === 'USERNAME_TAKEN') setError('اسم المستخدم محجوز، جرب آخر');
      else setError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper padded={false}>
      <View className="flex-row items-center gap-3 px-4 pt-5 pb-4 border-b border-white/[0.06]">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white/[0.05] items-center justify-center"
        >
          <ArrowLeft size={16} color="#94a3b8" />
        </Pressable>
        <Text className="text-base font-bold text-white">البيانات الشخصية</Text>
      </View>

      <ScrollView
        contentContainerClassName="px-4 py-5 gap-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-2">
          <View className="w-20 h-20 rounded-full bg-brand/20 items-center justify-center mb-3">
            <Text className="text-3xl font-bold text-brand">
              {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
            </Text>
          </View>
          <Text className="text-xs text-slate-500">تغيير الصورة قريباً</Text>
        </View>

        <View className="bg-[#111118] border border-white/[0.07] rounded-2xl px-4">
          <FieldRow
            label="الاسم الكامل"
            value={user?.fullName ?? ''}
            onEdit={() => startEdit('fullName')}
          />
          <FieldRow
            label="اسم المستخدم"
            value={user?.username ? `@${user.username}` : ''}
            onEdit={() => startEdit('username')}
          />
          <FieldRow
            label="البريد الإلكتروني"
            value={user?.email ?? ''}
            editable={false}
            onEdit={() => {}}
          />
          <FieldRow
            label="رقم الموبايل"
            value={user?.phone ?? ''}
            editable={false}
            onEdit={() => {}}
          />
        </View>

        {editing && (
          <View className="bg-[#111118] border border-white/[0.07] rounded-2xl p-4 gap-3">
            <Text className="text-sm font-semibold text-white">
              تعديل {editing === 'fullName' ? 'الاسم' : 'اسم المستخدم'}
            </Text>

            {error && (
              <View className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                <Text className="text-xs text-red-400">{error}</Text>
              </View>
            )}

            <TextInput
              value={value}
              onChangeText={setValue}
              autoCapitalize={editing === 'fullName' ? 'words' : 'none'}
              autoCorrect={false}
              autoFocus
              placeholderTextColor="#64748b"
              className="bg-[#0d0d14] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white"
            />

            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setEditing(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/[0.08] items-center"
              >
                <Text className="text-sm text-slate-400">إلغاء</Text>
              </Pressable>
              <Pressable
                onPress={save}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-brand items-center justify-center flex-row gap-2"
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : success ? (
                  <Check size={16} color="#fff" />
                ) : (
                  <Text className="text-sm font-semibold text-white">حفظ</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

