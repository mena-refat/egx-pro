import { useState } from 'react';
import { View, Text, TextInput, Pressable, type TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
}

export function Input({ label, error, isPassword, ...rest }: Props) {
  const [showPw, setShowPw] = useState(false);

  return (
    <View className="gap-1.5">
      {label && <Text className="text-xs font-medium text-slate-400">{label}</Text>}
      <View className="relative">
        <TextInput
          {...rest}
          secureTextEntry={isPassword && !showPw}
          placeholderTextColor="#64748b"
          className={`
            bg-[#0d0d14] border rounded-xl px-4 py-3 text-sm text-white
            ${error ? 'border-red-500/60' : 'border-white/10'}
            ${isPassword ? 'pr-12' : ''}
          `}
        />
        {isPassword && (
          <Pressable
            onPress={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
          >
            {showPw ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
          </Pressable>
        )}
      </View>
      {error && <Text className="text-xs text-red-400">{error}</Text>}
    </View>
  );
}

