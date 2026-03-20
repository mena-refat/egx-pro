import { useRef } from 'react';
import {
  Animated,
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { BRAND, BRAND_BG_STRONG, RED, RED_BG, GREEN, GREEN_BG, FONT, WEIGHT, RADIUS } from '../../lib/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type Size    = 'xs' | 'sm' | 'md' | 'lg';

interface Props extends Omit<PressableProps, 'style'> {
  variant?:   Variant;
  size?:      Size;
  loading?:   boolean;
  disabled?:  boolean;
  fullWidth?: boolean;
  label:      string;
  leftIcon?:  React.ReactNode;
  rightIcon?: React.ReactNode;
  haptic?:    boolean;
  style?:     StyleProp<ViewStyle>;
}

const SIZE_MAP: Record<Size, { px: number; py: number; font: number; icon: number }> = {
  xs: { px: 10, py:  6, font: FONT.xs,   icon: 12 },
  sm: { px: 14, py:  8, font: FONT.sm,   icon: 14 },
  md: { px: 18, py: 11, font: FONT.sm,   icon: 16 },
  lg: { px: 22, py: 14, font: FONT.base, icon: 18 },
};

export function Button({
  variant   = 'primary',
  size      = 'md',
  loading,
  disabled,
  fullWidth,
  label,
  leftIcon,
  rightIcon,
  haptic    = true,
  onPress,
  style,
  ...rest
}: Props) {
  const { colors, isDark } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const s = SIZE_MAP[size];
  const isDisabled = disabled || loading;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  };
  const handlePress: NonNullable<PressableProps['onPress']> = async (e) => {
    if (haptic) {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch { /* unsupported */ }
    }
    onPress?.(e);
  };

  const variantStyle: ViewStyle = (() => {
    switch (variant) {
      case 'primary':   return { backgroundColor: BRAND };
      case 'secondary': return { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border2 };
      case 'outline':   return { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: BRAND };
      case 'ghost':     return { backgroundColor: 'transparent' };
      case 'danger':    return { backgroundColor: RED_BG, borderWidth: 1, borderColor: `${RED}30` };
      case 'success':   return { backgroundColor: GREEN_BG, borderWidth: 1, borderColor: `${GREEN}30` };
    }
  })();

  const textColor = (() => {
    switch (variant) {
      case 'primary':   return '#ffffff';
      case 'secondary': return colors.text;
      case 'outline':   return BRAND;
      case 'ghost':     return BRAND;
      case 'danger':    return RED;
      case 'success':   return GREEN;
    }
  })();

  return (
    <Pressable
      {...rest}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[fullWidth && { width: '100%' }, style]}
    >
      <Animated.View
        style={[
          variantStyle,
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: RADIUS.lg,
            paddingHorizontal: s.px,
            paddingVertical: s.py,
            gap: 6,
            opacity: isDisabled ? 0.5 : 1,
            transform: [{ scale }],
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <>
            {leftIcon && <View>{leftIcon}</View>}
            <Text
              style={{
                color: textColor,
                fontSize: s.font,
                fontWeight: WEIGHT.semibold,
                textAlign: 'center',
              }}
            >
              {label}
            </Text>
            {rightIcon && <View>{rightIcon}</View>}
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}
