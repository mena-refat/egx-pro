import { type ReactNode } from 'react';
import { View, Pressable, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { cardShadow, RADIUS, SPACE } from '../../lib/theme';

interface CardProps {
  children:    ReactNode;
  style?:      StyleProp<ViewStyle>;
  padded?:     boolean;
  elevated?:   boolean;
  bordered?:   boolean;
  onPress?:    () => void;
  pressable?:  boolean;
}

export function Card({
  children,
  style,
  padded   = true,
  elevated = false,
  bordered = true,
  onPress,
  pressable,
}: CardProps) {
  const { colors, isDark } = useTheme();

  const baseStyle: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius:    RADIUS.lg,
    ...(padded    && { padding: SPACE.lg }),
    ...(bordered  && { borderWidth: 1, borderColor: colors.border }),
    ...(elevated  && cardShadow(isDark)),
  };

  if (onPress || pressable) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [baseStyle, { opacity: pressed ? 0.85 : 1 }, style]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[baseStyle, style]}>{children}</View>;
}
