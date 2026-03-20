import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { BRAND, BRAND_BG_STRONG, FONT, WEIGHT, RADIUS, SPACE } from '../../lib/theme';

interface TagProps {
  label:       string;
  icon?:       React.ComponentType<{ size?: number; color?: string }>;
  active?:     boolean;
  onPress?:    () => void;
  style?:      object;
}

export function Tag({ label, icon: Icon, active, onPress, style }: TagProps) {
  const { colors } = useTheme();

  const bg     = active ? BRAND_BG_STRONG : colors.hover;
  const border = active ? BRAND           : colors.border;
  const text   = active ? BRAND           : colors.textSub;

  const handlePress = async () => {
    if (!onPress) return;
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch { /* unsupported */ }
    onPress();
  };

  const inner = (
    <View
      style={[
        {
          flexDirection:     'row',
          alignItems:        'center',
          gap:               SPACE.xs,
          paddingHorizontal: SPACE.md,
          paddingVertical:   SPACE.xs + 2,
          borderRadius:      RADIUS.full,
          backgroundColor:   bg,
          borderWidth:       1,
          borderColor:       border,
        },
        style,
      ]}
    >
      {Icon && <Icon size={13} color={text} />}
      <Text style={{ fontSize: FONT.xs, fontWeight: WEIGHT.medium, color: text }}>
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={handlePress} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
        {inner}
      </Pressable>
    );
  }

  return inner;
}
