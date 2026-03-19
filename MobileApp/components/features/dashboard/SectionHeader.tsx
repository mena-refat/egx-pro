import { View, Text, Pressable } from 'react-native';
import { I18nManager } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';

interface Props {
  title: string;
  icon?: React.ComponentType<{ size: number; color: string }>;
  linkLabel?: string;
  onLink?: () => void;
}

export function SectionHeader({ title, icon: Icon, linkLabel, onLink }: Props) {
  const { colors } = useTheme();
  const ChevronIcon = I18nManager.isRTL ? ChevronRight : ChevronLeft;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        {Icon && (
          <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: colors.hover, alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={13} color={colors.textSub} />
          </View>
        )}
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{title}</Text>
      </View>
      {linkLabel && onLink && (
        <Pressable onPress={onLink} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Text style={{ color: '#8b5cf6', fontSize: 12, fontWeight: '600' }}>{linkLabel}</Text>
          <ChevronIcon size={12} color="#8b5cf6" />
        </Pressable>
      )}
    </View>
  );
}
