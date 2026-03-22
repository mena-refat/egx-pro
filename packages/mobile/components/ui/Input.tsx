import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { BRAND, RED, FONT, WEIGHT, RADIUS, SPACE } from '../../lib/theme';

type Variant = 'default' | 'search';

interface Props extends TextInputProps {
  label?:          string;
  error?:          string;
  hint?:           string;
  leftIcon?:       React.ReactNode;
  rightIcon?:      React.ReactNode;
  variant?:        Variant;
  containerStyle?: StyleProp<ViewStyle>;
  isPassword?:     boolean;   // kept for backwards compat
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  variant        = 'default',
  containerStyle,
  style,
  isPassword,
  secureTextEntry,
  ...rest
}: Props) {
  const [showPw, setShowPw] = useState(false);
  const [focused, setFocused] = useState(false);
  const { colors, isRTL } = useTheme();
  const isPw        = isPassword || (secureTextEntry !== undefined);
  const secure      = isPw && !showPw;

  const hasLeft     = !!leftIcon;
  const hasRight    = !!(rightIcon || isPw);
  const paddingStart = hasLeft  ? 44 : SPACE.lg;
  const paddingEnd   = hasRight ? 44 : SPACE.lg;

  const borderColor = error
    ? RED
    : focused
    ? BRAND
    : colors.border;

  return (
    <View style={[{ gap: SPACE.xs }, containerStyle]}>
      {label && (
        <Text style={{ color: colors.textSub, fontSize: FONT.xs, fontWeight: WEIGHT.semibold }}>
          {label}
        </Text>
      )}

      <View style={{ position: 'relative', justifyContent: 'center' }}>
        {/* Left icon */}
        {leftIcon && (
          <View
            style={{
              position: 'absolute',
              [isRTL ? 'right' : 'left']: SPACE.md,
              zIndex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            pointerEvents="none"
          >
            {leftIcon}
          </View>
        )}

        <TextInput
          {...rest}
          secureTextEntry={secure}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e)  => { setFocused(false); rest.onBlur?.(e); }}
          style={[
            {
              backgroundColor: colors.inputBg,
              borderColor,
              borderWidth: focused ? 1.5 : 1,
              borderRadius: RADIUS.lg,
              paddingHorizontal: SPACE.lg,
              paddingVertical: 13,
              paddingLeft:  isRTL ? paddingEnd   : paddingStart,
              paddingRight: isRTL ? paddingStart : paddingEnd,
              fontSize: FONT.sm,
              color: colors.text,
            },
            style,
          ]}
        />

        {/* Right icon or password toggle */}
        {(rightIcon || isPw) && (
          <Pressable
            onPress={isPw ? () => setShowPw((v) => !v) : undefined}
            hitSlop={10}
            style={{
              position: 'absolute',
              [isRTL ? 'left' : 'right']: SPACE.md,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {isPw
              ? (showPw
                  ? <EyeOff size={16} color={colors.textMuted} />
                  : <Eye    size={16} color={colors.textMuted} />)
              : rightIcon}
          </Pressable>
        )}
      </View>

      {error && (
        <Text style={{ color: RED, fontSize: FONT.xs }}>{error}</Text>
      )}
      {!error && hint && (
        <Text style={{ color: colors.textMuted, fontSize: FONT.xs }}>{hint}</Text>
      )}
    </View>
  );
}
