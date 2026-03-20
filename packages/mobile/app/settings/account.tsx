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
import { BRAND, BRAND_BG_STRONG } from '../../lib/theme';

interface FieldRowProps {
  label: string;
  value: string;
  onEdit: () => void;
  editable?: boolean;
}

function FieldRow({ label, value, onEdit, editable = true }: FieldRowProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 2 }}>{label}</Text>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '500' }}>{value || '—'}</Text>
      </View>
      {editable && (
        <Pressable onPress={onEdit} style={{ padding: 8 }}>
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
        // header: flex-row items-center gap-3 px-4 pt-5 pb-4
        // (gap works on RN >= 0.71; used elsewhere in this project)
        // If it doesn't, spacing can be tuned quickly.
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 16,
            paddingTop: 20,
            paddingBottom: 16,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              backgroundColor: colors.hover,
              borderColor: colors.border,
              borderWidth: 1,
              width: 36,
              height: 36,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
          {I18nManager.isRTL ? <ArrowRight size={16} color={colors.textSub} /> : <ArrowLeft size={16} color={colors.textSub} />}
          </Pressable>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 12,
              backgroundColor: BRAND_BG_STRONG,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={15} color={BRAND} />
          </View>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
            البيانات الشخصية
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: `${BRAND}20`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 30, fontWeight: '800', color: BRAND }}>
              {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
            </Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 11 }}>
            تغيير الصورة قريباً
          </Text>
        </View>

        {/* Fields */}
        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          // border rounded-2xl px-4
          // rounded-2xl = 24, px-4 = 16
        >
          <View style={{ borderWidth: 1, borderRadius: 24, paddingHorizontal: 16, overflow: 'hidden' }}>
            <FieldRow label="الاسم الكامل" value={user?.fullName ?? ''} onEdit={() => startEdit('fullName')} />
            <FieldRow label="اسم المستخدم" value={user?.username ? `@${user.username}` : ''} onEdit={() => startEdit('username')} />
            <FieldRow label="البريد الإلكتروني" value={user?.email ?? ''} editable={false} onEdit={() => {}} />
            <View style={{ paddingVertical: 14, paddingHorizontal: 0 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 2 }}>رقم الموبايل</Text>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '500' }}>{user?.phone || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Edit form */}
        {editing && (
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            // border rounded-2xl p-4 gap-3
          >
            <View style={{ borderWidth: 1, borderRadius: 24, padding: 16, gap: 12 }}>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>
              تعديل {editing === 'fullName' ? 'الاسم' : 'اسم المستخدم'}
            </Text>

            {error && (
              <View
                style={{
                  backgroundColor: '#f8717112',
                  borderColor: '#f8717130',
                  borderWidth: 1,
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: '#f87171', fontSize: 11, fontWeight: '600' }}>{error}</Text>
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
                borderWidth: 1,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 14,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => setEditing(null)}
                style={{
                  flex: 1,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingVertical: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: colors.textSub, fontSize: 13, fontWeight: '600' }}>إلغاء</Text>
              </Pressable>
              <Pressable
                onPress={save}
                disabled={saving}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: BRAND,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : success ? (
                  <Check size={16} color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>حفظ</Text>
                )}
              </Pressable>
            </View>
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
