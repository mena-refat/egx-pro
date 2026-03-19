import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  ActivityIndicator, I18nManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Check, Pencil, User } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import apiClient from '../../lib/api/client';

interface FieldRowProps {
  label: string;
  value: string;
  onEdit: () => void;
  editable?: boolean;
}

function FieldRow({ label, value, onEdit, editable = true }: FieldRowProps) {
  const { colors } = useTheme();
  return (
    <View style={{ borderBottomColor: colors.border }} className="flex-row items-center justify-between py-3.5 border-b">
      <View className="flex-1">
        <Text style={{ color: colors.textMuted }} className="text-xs mb-0.5">{label}</Text>
        <Text style={{ color: colors.text }} className="text-sm">{value || '—'}</Text>
      </View>
      {editable && (
        <Pressable onPress={onEdit} className="p-2">
          <Pencil size={14} color={colors.textSub} />
        </Pressable>
      )}
    </View>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const { colors } = useTheme();
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
      <View
        style={{ borderBottomColor: colors.border, borderBottomWidth: 1 }}
        className="flex-row items-center gap-3 px-4 pt-5 pb-4"
      >
        <Pressable
          onPress={() => router.back()}
          style={{ backgroundColor: colors.hover, borderColor: colors.border }}
          className="w-9 h-9 rounded-xl border items-center justify-center"
        >
          {I18nManager.isRTL ? <ArrowRight size={16} color={colors.textSub} /> : <ArrowLeft size={16} color={colors.textSub} />}
        </Pressable>
        <View className="w-8 h-8 rounded-xl bg-brand/15 items-center justify-center">
          <User size={15} color="#8b5cf6" />
        </View>
        <Text style={{ color: colors.text }} className="text-base font-bold">البيانات الشخصية</Text>
      </View>

      <ScrollView contentContainerClassName="px-4 py-5 gap-4" showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View className="items-center mb-2">
          <View className="w-20 h-20 rounded-full bg-brand/20 items-center justify-center mb-3">
            <Text className="text-3xl font-bold text-brand">
              {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
            </Text>
          </View>
          <Text style={{ color: colors.textMuted }} className="text-xs">تغيير الصورة قريباً</Text>
        </View>

        {/* Fields */}
        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="border rounded-2xl px-4"
        >
          <FieldRow label="الاسم الكامل" value={user?.fullName ?? ''} onEdit={() => startEdit('fullName')} />
          <FieldRow label="اسم المستخدم" value={user?.username ? `@${user.username}` : ''} onEdit={() => startEdit('username')} />
          <FieldRow label="البريد الإلكتروني" value={user?.email ?? ''} editable={false} onEdit={() => {}} />
          <View className="py-3.5">
            <Text style={{ color: colors.textMuted }} className="text-xs mb-0.5">رقم الموبايل</Text>
            <Text style={{ color: colors.text }} className="text-sm">{user?.phone || '—'}</Text>
          </View>
        </View>

        {/* Edit form */}
        {editing && (
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border rounded-2xl p-4 gap-3"
          >
            <Text style={{ color: colors.text }} className="text-sm font-semibold">
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
              placeholderTextColor={colors.textMuted}
              style={{
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.hover,
              }}
              className="border rounded-xl px-4 py-3 text-sm"
            />

            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setEditing(null)}
                style={{ borderColor: colors.border }}
                className="flex-1 py-2.5 rounded-xl border items-center"
              >
                <Text style={{ color: colors.textSub }} className="text-sm">إلغاء</Text>
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
