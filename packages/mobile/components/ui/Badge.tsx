import { View, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  pro:          { bg: '#3b82f618', text: '#3b82f6' },
  yearly:       { bg: '#6366f118', text: '#6366f1' },
  ultra:        { bg: '#f59e0b18', text: '#f59e0b' },
  ultra_yearly: { bg: '#f9731618', text: '#f97316' },
};

export function Badge({ label }: { label: string }) {
  const { colors } = useTheme();
  const s = BADGE_COLORS[label] ?? { bg: colors.hover, text: colors.textSub };

  return (
    <View style={{
      alignSelf: 'flex-start',
      paddingHorizontal: 8, paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: s.bg,
    }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: s.text, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
  );
}
