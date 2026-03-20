import { View, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Button } from './Button';
import { BRAND, BRAND_BG_STRONG, FONT, WEIGHT, RADIUS, SPACE } from '../../lib/theme';

interface EmptyStateProps {
  icon:      React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title:     string;
  subtitle?: string;
  action?:   { label: string; onPress: () => void };
  style?:    object;
}

export function EmptyState({ icon: Icon, title, subtitle, action, style }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          flex:            1,
          alignItems:      'center',
          justifyContent:  'center',
          gap:             SPACE.lg,
          paddingVertical: SPACE['3xl'],
          paddingHorizontal: SPACE.xl,
        },
        style,
      ]}
    >
      <View
        style={{
          width:           72,
          height:          72,
          borderRadius:    RADIUS['2xl'],
          backgroundColor: BRAND_BG_STRONG,
          alignItems:      'center',
          justifyContent:  'center',
        }}
      >
        <Icon size={32} color={BRAND} />
      </View>

      <View style={{ alignItems: 'center', gap: SPACE.sm }}>
        <Text style={{ color: colors.text, fontSize: FONT.lg, fontWeight: WEIGHT.bold, textAlign: 'center' }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ color: colors.textSub, fontSize: FONT.sm, textAlign: 'center', lineHeight: 20 }}>
            {subtitle}
          </Text>
        )}
      </View>

      {action && (
        <Button
          label={action.label}
          onPress={action.onPress}
          variant="outline"
          size="md"
        />
      )}
    </View>
  );
}
