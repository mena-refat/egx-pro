import { Pressable, Text, View } from 'react-native';
import { ArrowLeft, ArrowRight, User } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { BRAND, BRAND_BG_STRONG } from '../../lib/theme';

export function AccountHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const { colors, isRTL } = useTheme();

  return (
    <View style={{ borderBottomColor: colors.border, borderBottomWidth: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 16,
        }}
      >
        <Pressable
          onPress={onBack}
          style={{
            backgroundColor: colors.hover,
            borderColor: colors.border,
            borderWidth: 1,
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isRTL ? <ArrowRight size={16} color={colors.textSub} /> : <ArrowLeft size={16} color={colors.textSub} />}
        </Pressable>

        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 12,
            backgroundColor: BRAND_BG_STRONG,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <User size={15} color={BRAND} />
        </View>

        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{title}</Text>
      </View>
    </View>
  );
}

