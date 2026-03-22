import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { isEgyptMarketOpen } from '../../lib/cairoTime';
import { useTheme } from '../../hooks/useTheme';
import { FONT, WEIGHT, RADIUS, SPACE } from '../../lib/theme';

// Open  → bright green
// Closed → soft red (standard in trading apps — Robinhood, Yahoo Finance, etc.)
const COLOR_OPEN   = '#4ade80';
const COLOR_CLOSED = '#f87171';

export function MarketStatusBadge() {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(() => isEgyptMarketOpen());

  useEffect(() => {
    const t = setInterval(() => setIsOpen(isEgyptMarketOpen()), 30_000);
    return () => clearInterval(t);
  }, []);

  const dotColor  = isOpen ? COLOR_OPEN : COLOR_CLOSED;
  const ringColor = dotColor;

  // Ring radiates outward: scale 0.6 → 1.8, opacity 0.7 → 0
  const ringScale   = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0.7);

  useEffect(() => {
    const duration = isOpen ? 1200 : 2000;

    ringScale.value = withRepeat(
      withTiming(1.9, { duration, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 0 }),
        withTiming(0, { duration, easing: Easing.out(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [isOpen, ringScale, ringOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <View
      style={{
        flexDirection:     'row',
        alignItems:        'center',
        gap:               SPACE.xs,
        paddingHorizontal: SPACE.md,
        paddingVertical:   SPACE.xs,
        borderRadius:      RADIUS.full,
        backgroundColor:   isOpen ? `${COLOR_OPEN}18` : `${COLOR_CLOSED}15`,
      }}
    >
      {/* Dot + glow ring */}
      <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
        {/* Radiating glow ring */}
        <Animated.View
          style={[
            ringStyle,
            {
              position:        'absolute',
              width:           10,
              height:          10,
              borderRadius:    5,
              backgroundColor: ringColor,
            },
          ]}
        />
        {/* Static inner dot */}
        <View
          style={{
            width:           7,
            height:          7,
            borderRadius:    4,
            backgroundColor: dotColor,
          }}
        />
      </View>

      <Text style={{
        color:      isOpen ? COLOR_OPEN : COLOR_CLOSED,
        fontSize:   FONT.xs,
        fontWeight: WEIGHT.medium,
      }}>
        {isOpen ? 'السوق مفتوح' : 'السوق مغلق'}
      </Text>
    </View>
  );
}
