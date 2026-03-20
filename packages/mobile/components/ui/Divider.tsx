import { View, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FONT, SPACE } from '../../lib/theme';

interface Props {
  label?: string;
  style?: object;
}

export function Divider({ label, style }: Props) {
  const { colors } = useTheme();

  if (label) {
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }, style]}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Text style={{ color: colors.textMuted, fontSize: FONT.xs }}>{label}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>
    );
  }

  return (
    <View style={[{ height: 1, backgroundColor: colors.border }, style]} />
  );
}
