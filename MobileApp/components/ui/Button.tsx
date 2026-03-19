import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';

interface Props extends PressableProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  label: string;
}

const sizes = {
  sm: { px: 'px-3', py: 'py-1.5', text: 'text-sm' },
  md: { px: 'px-4', py: 'py-2.5', text: 'text-sm' },
  lg: { px: 'px-5', py: 'py-3.5', text: 'text-base' },
} as const;

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  fullWidth,
  label,
  onPress,
  disabled,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const s = sizes[size];
  const isDisabled = disabled || loading;

  const variantStyle =
    variant === 'primary'   ? { backgroundColor: '#8b5cf6' } :
    variant === 'secondary' ? { backgroundColor: colors.hover, borderWidth: 1, borderColor: colors.border } :
    variant === 'danger'    ? { backgroundColor: '#ef444480' } :
    {};

  const variantClass =
    variant === 'primary'   ? 'bg-brand' :
    variant === 'secondary' ? '' :
    variant === 'ghost'     ? 'bg-transparent' :
    variant === 'danger'    ? '' :
    '';

  const handlePress: NonNullable<PressableProps['onPress']> = async (e) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // not supported
    }
    onPress?.(e);
  };

  return (
    <Pressable
      {...rest}
      onPress={handlePress}
      disabled={isDisabled}
      style={variantStyle}
      className={`
        ${variantClass} ${s.px} ${s.py} rounded-xl flex-row items-center justify-center gap-2
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-50' : 'active:opacity-80'}
      `}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text className={`${s.text} font-semibold text-white text-center`}>{label}</Text>
      )}
    </Pressable>
  );
}
