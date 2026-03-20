import { useEffect, useMemo } from 'react';
import { View, Text } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../hooks/useTheme';
import { normalizePhone, isValidEgyptianPhone } from '../../lib/validations';

export type EditableField = 'fullName' | 'username' | 'email' | 'phone';

function getFieldTitle(field: EditableField) {
  switch (field) {
    case 'fullName':
      return 'الاسم الكامل';
    case 'username':
      return 'اسم المستخدم';
    case 'email':
      return 'البريد الإلكتروني';
    case 'phone':
      return 'رقم الموبايل';
  }
}

function getEditSchema(field: EditableField) {
  if (field === 'email') {
    return z.object({
      value: z
        .string()
        .transform((s) => s.trim().toLowerCase())
        .refine((s) => s === '' || z.string().email().safeParse(s).success, {
          message: 'البريد الإلكتروني غير صالح',
        }),
    });
  }

  if (field === 'phone') {
    return z.object({
      value: z
        .string()
        .transform((s) => s.trim())
        .transform((s) => (s ? normalizePhone(s) : ''))
        .refine((digits) => digits === '' || isValidEgyptianPhone(digits), { message: 'رقم الموبايل غير صالح' }),
    });
  }

  if (field === 'username') {
    return z.object({
      value: z.preprocess(
        (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
        z
          .string()
          .min(6, 'اسم المستخدم مطلوب')
          .max(18, 'اسم المستخدم طويل')
          .regex(/^[a-zA-Z0-9_-]+$/, 'اسم المستخدم غير صالح'),
      ),
    });
  }

  return z.object({
    value: z.preprocess(
      (v) => (typeof v === 'string' ? v.trim() : v),
      z
        .string()
        .min(3, 'الاسم مطلوب')
        .max(50, 'الاسم طويل')
        .regex(/^[a-zA-Z\s\u0600-\u06FF]+$/, 'الاسم غير صالح'),
    ),
  });
}

const EDIT_PLACEHOLDERS: Record<EditableField, string> = {
  fullName: 'مثال: أحمد محمد',
  username: 'مثال: ahmed_egypt',
  email: 'example@email.com',
  phone: 'مثال: 01012345678',
};

const EDIT_KEYBOARD_TYPES: Record<EditableField, any> = {
  fullName: 'default',
  username: 'default',
  email: 'email-address',
  phone: 'phone-pad',
};

function EditValueHint({ field }: { field: EditableField }) {
  if (field !== 'email' && field !== 'phone') return null;
  return <Text style={{ color: '#94a3b8', fontSize: 11 }}>اتركه فارغاً لإزالة القيمة</Text>;
}

function EditValueActions({
  saving,
  onCancel,
  onSubmit,
}: {
  saving: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Button variant="secondary" size="md" label="إلغاء" onPress={onCancel} disabled={saving} fullWidth />
      <Button
        variant="primary"
        size="md"
        label={saving ? '...' : 'حفظ'}
        onPress={onSubmit}
        loading={saving}
        disabled={saving}
        fullWidth
      />
    </View>
  );
}

function EditValueInput({
  field,
  control,
  errors,
}: {
  field: EditableField;
  control: ReturnType<typeof useForm<{ value: string }>>['control'];
  errors: ReturnType<typeof useForm<{ value: string }>>['formState']['errors'];
}) {
  return (
    <Controller
      control={control}
      name="value"
      render={({ field: rhf }) => (
        <Input
          label={getFieldTitle(field)}
          placeholder={EDIT_PLACEHOLDERS[field]}
          keyboardType={EDIT_KEYBOARD_TYPES[field]}
          autoFocus
          error={errors.value?.message as unknown as string | undefined}
          value={rhf.value}
          onChangeText={rhf.onChange}
          onBlur={rhf.onBlur}
          containerStyle={{ marginTop: 2 }}
        />
      )}
    />
  );
}

export function EditValueCard({
  field,
  initialValue,
  onCancel,
  onSave,
  saving,
}: {
  field: EditableField;
  initialValue: string;
  onCancel: () => void;
  onSave: (value: string) => Promise<void>;
  saving: boolean;
}) {
  const { colors } = useTheme();

  const schema = useMemo(() => getEditSchema(field), [field]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ value: string }>({
    resolver: zodResolver(schema),
    defaultValues: { value: initialValue },
    mode: 'onChange',
  });

  useEffect(() => {
    reset({ value: initialValue });
  }, [initialValue, field, reset]);

  const onSubmit = handleSubmit(async (data) => {
    await onSave(data.value);
  });

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderRadius: 24,
        borderWidth: 1,
      }}
    >
      <View style={{ borderRadius: 24, padding: 16, gap: 12 }}>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>
          تعديل {getFieldTitle(field)}
        </Text>

        <EditValueInput field={field} control={control} errors={errors} />
        <EditValueHint field={field} />
        <EditValueActions
          saving={saving}
          onCancel={onCancel}
          onSubmit={() => void onSubmit()}
        />
      </View>
    </View>
  );
}

