import { type ReactNode } from 'react';
import { View, Text, Pressable, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { FONT, WEIGHT, SPACE } from '../../lib/theme';

interface ScreenHeaderProps {
  title:         string;
  subtitle?:     string;
  showBack?:     boolean;
  onBack?:       () => void;
  rightAction?:  ReactNode;
  leftAction?:   ReactNode;
  transparent?:  boolean;
  centerTitle?:  boolean;
}

const HEADER_HEIGHT = 52;

export function ScreenHeader({
  title,
  subtitle,
  showBack     = true,
  onBack,
  rightAction,
  leftAction,
  transparent  = false,
  centerTitle  = true,
}: ScreenHeaderProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isRTL  = I18nManager.isRTL;

  // In RTL (Arabic), back = ChevronRight; in LTR (English), back = ChevronLeft
  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  const handleBack = () => {
    if (onBack) { onBack(); } else { router.back(); }
  };

  return (
    <View
      style={{
        height:           HEADER_HEIGHT + insets.top,
        paddingTop:       insets.top,
        backgroundColor:  transparent ? 'transparent' : colors.bg,
        borderBottomWidth: transparent ? 0 : 1,
        borderBottomColor: colors.border,
        flexDirection:    'row',
        alignItems:       'center',
        paddingHorizontal: SPACE.lg,
      }}
    >
      {/* Left slot */}
      <View style={{ width: 40, alignItems: 'flex-start' }}>
        {leftAction
          ? leftAction
          : showBack && (
              <Pressable
                onPress={handleBack}
                hitSlop={10}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <BackIcon size={22} color={colors.text} />
              </Pressable>
            )}
      </View>

      {/* Title */}
      <View style={{ flex: 1, alignItems: centerTitle ? 'center' : 'flex-start' }}>
        <Text
          style={{
            color:      colors.text,
            fontSize:   FONT.md,
            fontWeight: WEIGHT.semibold,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={{ color: colors.textMuted, fontSize: FONT.xs, marginTop: 1 }} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right slot */}
      <View style={{ width: 40, alignItems: 'flex-end' }}>
        {rightAction ?? null}
      </View>
    </View>
  );
}
