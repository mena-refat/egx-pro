import { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { isEgyptMarketOpen } from '../../lib/cairoTime';
import { useTheme } from '../../hooks/useTheme';
import { GREEN, FONT, WEIGHT, RADIUS, SPACE } from '../../lib/theme';

export function MarketStatusBadge() {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(() => isEgyptMarketOpen());

  useEffect(() => {
    const interval = setInterval(() => setIsOpen(isEgyptMarketOpen()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Pulsing dot animation when open
  const pulseScale = useSharedValue(1);
  useEffect(() => {
    if (isOpen) {
      pulseScale.value = withRepeat(
        withTiming(1.5, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      pulseScale.value = 1;
    }
  }, [isOpen]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity:   isOpen ? 0.6 : 1,
  }));

  const dotColor = isOpen ? GREEN : colors.textMuted;
  const bg       = isOpen ? `${GREEN}18` : colors.hover;
  const textColor = isOpen ? GREEN : colors.textSub;

  return (
    <View
      style={{
        flexDirection:     'row',
        alignItems:        'center',
        gap:               SPACE.xs,
        paddingHorizontal: SPACE.md,
        paddingVertical:   SPACE.xs,
        borderRadius:      RADIUS.full,
        backgroundColor:   bg,
      }}
    >
      <View style={{ width: 8, height: 8, alignItems: 'center', justifyContent: 'center' }}>
        {isOpen && (
          <Animated.View
            style={[
              pulseStyle,
              {
                position:        'absolute',
                width:           8,
                height:          8,
                borderRadius:    4,
                backgroundColor: dotColor,
              },
            ]}
          />
        )}
        <View
          style={{
            width:           6,
            height:          6,
            borderRadius:    3,
            backgroundColor: dotColor,
          }}
        />
      </View>
      <Text style={{ color: textColor, fontSize: FONT.xs, fontWeight: WEIGHT.medium }}>
        {isOpen ? 'السوق مفتوح' : 'السوق مغلق'}
      </Text>
    </View>
  );
}
