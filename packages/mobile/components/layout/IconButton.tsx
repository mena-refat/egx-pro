import { Pressable, View, Text, I18nManager } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { BRAND, BRAND_BG_STRONG, RED, RADIUS } from '../../lib/theme';

type Size    = 'sm' | 'md' | 'lg';
type Variant = 'ghost' | 'card' | 'brand';

interface IconButtonProps {
  icon:      React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  onPress:   () => void;
  size?:     Size;
  variant?:  Variant;
  badge?:    number;
  color?:    string;
  disabled?: boolean;
}

const SIZE_MAP: Record<Size, { container: number; icon: number; font: number }> = {
  sm: { container: 32, icon: 14, font: 9  },
  md: { container: 40, icon: 18, font: 10 },
  lg: { container: 48, icon: 22, font: 11 },
};

export function IconButton({
  icon: Icon,
  onPress,
  size    = 'md',
  variant = 'ghost',
  badge,
  color,
  disabled,
}: IconButtonProps) {
  const { colors } = useTheme();
  const s = SIZE_MAP[size];
  const isRTL = I18nManager.isRTL;

  const bg = variant === 'brand' ? BRAND_BG_STRONG
           : variant === 'card'  ? colors.card
           : 'transparent';

  const border = variant === 'card' ? { borderWidth: 1, borderColor: colors.border } : {};

  const iconColor = color ?? (variant === 'brand' ? BRAND : colors.text);

  const handlePress = async () => {
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch { /* unsupported */ }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => ({ opacity: pressed || disabled ? 0.6 : 1 })}
    >
      <View
        style={{
          width:           s.container,
          height:          s.container,
          borderRadius:    RADIUS.md,
          backgroundColor: bg,
          alignItems:      'center',
          justifyContent:  'center',
          ...border,
        }}
      >
        <Icon size={s.icon} color={iconColor} />

        {badge !== undefined && badge > 0 && (
          <View
            style={{
              position:        'absolute',
              top:             -2,
              ...(isRTL ? { left: -2 } : { right: -2 }),
              minWidth:        14,
              height:          14,
              borderRadius:    7,
              backgroundColor: RED,
              alignItems:      'center',
              justifyContent:  'center',
              paddingHorizontal: 2,
            }}
          >
            <Text style={{ color: '#fff', fontSize: s.font, fontWeight: '700' }}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
