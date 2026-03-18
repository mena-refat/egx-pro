import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';
import * as Haptics from 'expo-haptics';

interface Props extends PressableProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  label: string;
}

const variants = {
  primary: 'bg-brand',
  secondary: 'bg-white/10 border border-white/10',
  ghost: 'bg-transparent',
  danger: 'bg-red-500/90',
} as const;

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
  const v = variants[variant];
  const s = sizes[size];
  const isDisabled = disabled || loading;

  const handlePress: NonNullable<PressableProps['onPress']> = async (e) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics not supported on this device/simulator — ignore
    }
    onPress?.(e);
  };

  return (
    <Pressable
      {...rest}
      onPress={handlePress}
      disabled={isDisabled}
      className={`
        ${v} ${s.px} ${s.py} rounded-xl flex-row items-center justify-center gap-2
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

