import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { RADIUS } from '../../lib/theme';

function useSkeletonStyle() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => { opacity.value = 0.3; };
  }, []);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

// ─── Skeleton.Box ─────────────────────────────────────────────────────────────

interface BoxProps {
  width?:  DimensionValue;
  height?: number;
  radius?: number;
  style?:  object;
}

function SkeletonBox({ width = '100%', height = 80, radius = RADIUS.lg, style }: BoxProps) {
  const { colors } = useTheme();
  const animStyle  = useSkeletonStyle();
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.border }, animStyle, style]}
    />
  );
}

// ─── Skeleton.Line ────────────────────────────────────────────────────────────

interface LineProps {
  width?:  DimensionValue;
  height?: number;
}

function SkeletonLine({ width = '100%', height = 14 }: LineProps) {
  const { colors } = useTheme();
  const animStyle  = useSkeletonStyle();
  return (
    <Animated.View
      style={[{ width, height, borderRadius: RADIUS.sm, backgroundColor: colors.border }, animStyle]}
    />
  );
}

// ─── Skeleton.Circle ─────────────────────────────────────────────────────────

interface CircleProps {
  size?: number;
}

function SkeletonCircle({ size = 40 }: CircleProps) {
  const { colors } = useTheme();
  const animStyle  = useSkeletonStyle();
  return (
    <Animated.View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.border }, animStyle]}
    />
  );
}

// ─── Namespace export ─────────────────────────────────────────────────────────

export const Skeleton = {
  Box:    SkeletonBox,
  Line:   SkeletonLine,
  Circle: SkeletonCircle,
} as const;

// Default export for single-block use
export default function SkeletonDefault({ height = 16, borderRadius = RADIUS.sm }: { height?: number; borderRadius?: number }) {
  const { colors } = useTheme();
  const animStyle  = useSkeletonStyle();
  return (
    <Animated.View style={[{ height, borderRadius, backgroundColor: colors.border, width: '100%' }, animStyle]} />
  );
}
