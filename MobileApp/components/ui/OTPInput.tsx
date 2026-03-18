import { useRef, useState } from 'react';
import { View, TextInput } from 'react-native';

interface Props {
  length?: number;
  onComplete: (code: string) => void;
  error?: boolean;
}

export function OTPInput({ length = 6, onComplete, error }: Props) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputsRef = useRef<(TextInput | null)[]>([]);

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
    <View className="flex-row gap-3 justify-center">
      {Array.from({ length }).map((_, i) => (
        <TextInput
          key={i}
          ref={(r) => {
            inputsRef.current[i] = r;
          }}
          value={values[i]}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
          keyboardType="numeric"
          maxLength={1}
          textAlign="center"
          placeholderTextColor="#64748b"
          className={`
            w-12 h-14 rounded-xl text-xl font-bold text-white text-center
            border bg-[#0d0d14]
            ${error ? 'border-red-500' : values[i] ? 'border-brand' : 'border-white/10'}
          `}
        />
      ))}
    </View>
  );
}

