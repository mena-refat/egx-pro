import { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import apiClient from '../../lib/api/client';
import { BRAND_BG_STRONG, GREEN_BG, RED_BG, RED, BRAND } from '../../lib/theme';
import { EditValueCard, type EditableField } from './EditValueCard';
import { AccountHeader } from './AccountHeader';
import { AvatarEditorCard } from './AvatarEditorCard';

interface FieldRowProps {
  label: string;
  value: string;
  onEdit: () => void;
  editable?: boolean;
}

function FieldRow({ label, value, onEdit, editable = true }: FieldRowProps) {
  const { colors, isRTL } = useTheme();
  return (
    <View
      style={{
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        flexDirection: isRTL ? 'row-reverse' : 'row',
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
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const { colors } = useTheme();
  const [editing, setEditing] = useState<EditableField | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (field: EditableField) => {
    setEditing(field);
    setError(null);
    setSuccess(false);
  };

  const initialEditValue = useMemo(() => {
    if (!editing) return '';
    if (editing === 'fullName') return user?.fullName ?? '';
    if (editing === 'username') return user?.username ?? '';
    if (editing === 'email') return user?.email ?? '';
    return user?.phone ?? '';
  }, [editing, user?.email, user?.fullName, user?.phone, user?.username]);

  const saveField = async (val: string) => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const key = editing;
      const payload: Record<string, unknown> = {};
      if (key === 'email') {
        payload.email = val === '' ? null : val;
      } else if (key === 'phone') {
        payload.phone = val === '' ? null : val;
      } else if (key === 'username') {
        payload.username = val.trim() === '' ? null : val;
      } else {
        payload.fullName = val.trim() === '' ? null : val;
      }

      await apiClient.put('/api/user/profile', payload);
      updateUser(payload as any);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setEditing(null); }, 1100);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? (err as { error?: string })?.error;
      if (code === 'USERNAME_TAKEN') setError(t('settings.usernameTaken'));
      else if (code === 'EMAIL_ALREADY_EXISTS') setError(t('settings.emailTaken'));
      else if (code === 'PHONE_ALREADY_EXISTS') setError(t('settings.phoneTaken'));
      else if (code === 'INVALID_PHONE') setError(t('settings.phoneInvalid'));
      else setError(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper padded={false}>
      <AccountHeader title={t('settings.account')} onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <AvatarEditorCard />

        {/* Fields */}
        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          // border rounded-2xl px-4
          // rounded-2xl = 24, px-4 = 16
        >
          <View style={{ borderWidth: 1, borderRadius: 24, paddingHorizontal: 16, overflow: 'hidden' }}>
            <FieldRow label={t('auth.fullName')} value={user?.fullName ?? ''} onEdit={() => startEdit('fullName')} />
            <FieldRow label={t('auth.username')} value={user?.username ? `@${user.username}` : ''} onEdit={() => startEdit('username')} />
            <FieldRow label={t('auth.email')} value={user?.email ?? ''} onEdit={() => startEdit('email')} />
            <FieldRow label={t('auth.phone')} value={user?.phone ?? ''} onEdit={() => startEdit('phone')} />
          </View>
        </View>

        {editing && (
          <View style={{ marginTop: 12 }}>
            {error && (
              <View
                style={{
                  backgroundColor: RED_BG,
                  borderColor: `${RED}30`,
                  borderWidth: 1,
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: RED, fontSize: 11, fontWeight: '600' }}>{error}</Text>
              </View>
            )}

            {success && (
              <View
                style={{
                  backgroundColor: GREEN_BG,
                  borderColor: `${BRAND}30`,
                  borderWidth: 1,
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: colors.text, fontSize: 11, fontWeight: '600' }}>{t('settings.saved')}</Text>
              </View>
            )}

            <EditValueCard
              field={editing}
              initialValue={initialEditValue}
              onCancel={() => setEditing(null)}
              saving={saving}
              onSave={async (val) => {
                await saveField(val);
              }}
            />
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
