import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  ActivityIndicator, I18nManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Check, Pencil, User } from 'lucide-react-native';
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
    <View className="flex-row items-center justify-between py-3.5 border-b border-[#21262d]">
      <View className="flex-1">
        <Text className="text-xs text-[#656d76] mb-0.5">{label}</Text>
        <Text className="text-sm text-[#e6edf3]">{value || '—'}</Text>
      </View>
      {editable && (
        <Pressable onPress={onEdit} className="p-2">
          <Pencil size={14} color="#8b949e" />
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
      setTimeout(() => { setSuccess(false); setEditing(null); }, 1200);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? (err as { error?: string })?.error;
      if (code === 'USERNAME_TAKEN') setError('اسم المستخدم محجوز، جرب آخر');
      else setError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper padded={false}>
      <View className="flex-row items-center gap-3 px-4 pt-5 pb-4 border-b border-[#30363d]">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white/[0.04] border border-[#30363d] items-center justify-center"
        >
          {I18nManager.isRTL ? <ArrowRight size={16} color="#8b949e" /> : <ArrowLeft size={16} color="#8b949e" />}
        </Pressable>
        <View className="w-8 h-8 rounded-xl bg-brand/15 items-center justify-center">
          <User size={15} color="#8b5cf6" />
        </View>
        <Text className="text-base font-bold text-[#e6edf3]">البيانات الشخصية</Text>
      </View>

      <ScrollView contentContainerClassName="px-4 py-5 gap-4" showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View className="items-center mb-2">
          <View className="w-20 h-20 rounded-full bg-brand/20 items-center justify-center mb-3">
            <Text className="text-3xl font-bold text-brand">
              {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
            </Text>
          </View>
          <Text className="text-xs text-[#656d76]">تغيير الصورة قريباً</Text>
        </View>

        {/* Fields */}
        <View className="bg-[#161b22] border border-[#30363d] rounded-2xl px-4">
          <FieldRow label="الاسم الكامل" value={user?.fullName ?? ''} onEdit={() => startEdit('fullName')} />
          <FieldRow label="اسم المستخدم" value={user?.username ? `@${user.username}` : ''} onEdit={() => startEdit('username')} />
          <FieldRow label="البريد الإلكتروني" value={user?.email ?? ''} editable={false} onEdit={() => {}} />
          <View className="py-3.5">
            <Text className="text-xs text-[#656d76] mb-0.5">رقم الموبايل</Text>
            <Text className="text-sm text-[#e6edf3]">{user?.phone || '—'}</Text>
          </View>
        </View>

        {/* Edit form */}
        {editing && (
          <View className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 gap-3">
            <Text className="text-sm font-semibold text-[#e6edf3]">
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
              placeholderTextColor="#656d76"
              className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 text-sm text-[#e6edf3]"
            />

            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setEditing(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#30363d] items-center"
              >
                <Text className="text-sm text-[#8b949e]">إلغاء</Text>
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
