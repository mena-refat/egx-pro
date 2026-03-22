import { View, Text, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { BRAND, FONT, WEIGHT, SPACE } from '../../lib/theme';

interface SectionHeaderProps {
  title:   string;
  icon?:   React.ComponentType<{ size?: number; color?: string }>;
  action?: { label: string; onPress: () => void };
  style?:  object;
}

export function SectionHeader({ title, icon: Icon, action, style }: SectionHeaderProps) {
  const { colors, isRTL } = useTheme();
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <View
      style={[
        {
          flexDirection:  isRTL ? 'row-reverse' : 'row',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   SPACE.md,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: SPACE.sm }}>
        {Icon && <Icon size={16} color={colors.textSub} />}
        <Text style={{ color: colors.text, fontSize: FONT.md, fontWeight: WEIGHT.bold }}>
          {title}
        </Text>
      </View>

      {action && (
        <Pressable
          onPress={action.onPress}
          style={({ pressed }) => ({ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 2, opacity: pressed ? 0.7 : 1 })}
        >
          <Text style={{ color: BRAND, fontSize: FONT.sm, fontWeight: WEIGHT.medium }}>
            {action.label}
          </Text>
          <ChevronIcon size={13} color={BRAND} />
        </Pressable>
      )}
    </View>
  );
}
