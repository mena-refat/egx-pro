import { View, Text, Pressable } from 'react-native';
import { Zap } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import { YELLOW, YELLOW_BG } from '../../../lib/theme';

export function SupportLockedBanner({ onUpgrade }: { onUpgrade: () => void }) {
  const { colors, isRTL } = useTheme();

  return (
    <View
      style={{
        backgroundColor: `${YELLOW_BG}`,
        borderColor: '#f59e0b30',
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 12 }}>
        <View
          style={{
            backgroundColor: '#f59e0b20',
            borderRadius: 16,
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Zap size={16} color={YELLOW} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800', lineHeight: 20 }}>
            الدعم الفني متاح لمشتركي Pro و Ultra
          </Text>
          <Text style={{ color: colors.textSub, fontSize: 12.5, lineHeight: 20, marginTop: 4 }}>
            قم بالترقية للتواصل مع فريق الدعم والحصول على مساعدة متخصصة.
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onUpgrade}
        style={{
          backgroundColor: '#f59e0b',
          borderRadius: 12,
          alignItems: 'center',
          paddingVertical: 10,
          paddingHorizontal: 16,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>اشترك الآن</Text>
      </Pressable>
    </View>
  );
}

