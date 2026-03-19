import { useState } from 'react';
import { View, Text, TextInput, Pressable, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({ label, error, isPassword, containerStyle, style, ...rest }: Props) {
  const [showPw, setShowPw] = useState(false);
  const { colors } = useTheme();

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label && (
        <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '600' }}>{label}</Text>
      )}
      <View style={{ position: 'relative' }}>
        <TextInput
          {...rest}
          secureTextEntry={isPassword && !showPw}
          placeholderTextColor={colors.textMuted}
          style={[
            {
              backgroundColor: colors.bg,
              borderColor: error ? '#f87171' : colors.border,
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 13,
              fontSize: 14,
              color: colors.text,
              paddingRight: isPassword ? 48 : 14,
            },
            style,
          ]}
        />
        {isPassword && (
          <Pressable
            onPress={() => setShowPw((v) => !v)}
            hitSlop={10}
            style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center', padding: 4 }}
          >
            {showPw
              ? <EyeOff size={16} color={colors.textMuted} />
              : <Eye size={16} color={colors.textMuted} />}
          </Pressable>
        )}
      </View>
      {error && (
        <Text style={{ color: '#f87171', fontSize: 12 }}>{error}</Text>
      )}
    </View>
  );
}
