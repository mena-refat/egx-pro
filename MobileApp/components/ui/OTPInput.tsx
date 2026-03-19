import { useRef, useState } from 'react';
import { View, TextInput } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  length?: number;
  onComplete: (code: string) => void;
  error?: boolean;
}

export function OTPInput({ length = 6, onComplete, error }: Props) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputsRef = useRef<(TextInput | null)[]>([]);
  const { colors } = useTheme();

  const handleChange = (text: string, index: number) => {
    const cleaned = text.replace(/\D/g, '').slice(-1);
    const next = [...values];
    next[index] = cleaned;
    setValues(next);

    if (cleaned && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    const code = next.join('');
    if (code.length === length) onComplete(code);
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace') {
      if (!values[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
        const next = [...values];
        next[index - 1] = '';
        setValues(next);
      } else if (values[index]) {
        const next = [...values];
        next[index] = '';
        setValues(next);
      }
    }
  };

  return (
    <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center' }}>
      {Array.from({ length }).map((_, i) => {
        const borderColor = error
          ? '#ef4444'
          : values[i]
          ? '#8b5cf6'
          : colors.border;

        return (
          <TextInput
            key={i}
            ref={(r) => { inputsRef.current[i] = r; }}
            value={values[i]}
            onChangeText={(t) => handleChange(t, i)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
            keyboardType="numeric"
            maxLength={1}
            textAlign="center"
            placeholderTextColor={colors.textMuted}
            style={{
              width: 48, height: 56,
              borderRadius: 12,
              fontSize: 20, fontWeight: '700',
              color: colors.text,
              backgroundColor: colors.inputBg,
              borderWidth: 1,
              borderColor,
            }}
          />
        );
      })}
    </View>
  );
}
