import { useEffect, useMemo } from 'react';
import { View, Text } from 'react-native';
import { Controller, useForm, type Control, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../hooks/useTheme';
import type { EditableField } from './EditValueCard.utils';
import { EDIT_KEYBOARD_TYPES, EDIT_PLACEHOLDERS, getEditSchema, getFieldTitle } from './EditValueCard.utils';
export type { EditableField } from './EditValueCard.utils';

type EditFormValues = { value: string };

function EditValueHint({ field }: { field: EditableField }) {
  const { colors } = useTheme();
  if (field !== 'email' && field !== 'phone') return null;
  return <Text style={{ color: colors.textMuted, fontSize: 11 }}>اتركه فارغاً لإزالة القيمة</Text>;
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
  control: Control<EditFormValues>;
  errors: FieldErrors<EditFormValues>;
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

