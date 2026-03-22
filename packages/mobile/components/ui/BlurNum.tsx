import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { usePrivacyStore } from '../../store/privacyStore';
import { useTheme } from '../../hooks/useTheme';

interface BlurNumProps {
  children: string;
  style?: object;
  numberOfLines?: number;
}

/**
 * Renders a monetary value and blurs it when the user has enabled balance privacy.
 *
 * - iOS  → native UIVisualEffectView blur (expo-blur BlurView overlay)
 * - Android → same BlurView approach (expo-blur experimental renderer)
 *
 * The invisible Text sibling locks in the layout dimensions so the UI
 * never jumps when toggling visibility.
 */
export function BlurNum({ children, style, numberOfLines }: BlurNumProps) {
  const isHidden = usePrivacyStore((s) => s.isBalanceHidden);
  const { isDark } = useTheme();

  if (!isHidden) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {children}
      </Text>
    );
  }

  // Intensity tuned per platform — Android blur is slightly less opaque
  const intensity = Platform.OS === 'ios' ? 18 : 22;

  return (
    <View>
      {/* Invisible copy keeps the exact same layout footprint */}
      <Text style={[style, { opacity: 0 }]} numberOfLines={numberOfLines}>
        {children}
      </Text>

      {/* Native blur overlay — covers the text above */}
      <BlurView
        intensity={intensity}
        tint={isDark ? 'dark' : 'light'}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        style={[StyleSheet.absoluteFillObject, styles.blur]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blur: {
    borderRadius: 6,
    overflow: 'hidden',
  },
});
