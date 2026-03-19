import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  className?: string;
}

export function Skeleton({ height = 16, borderRadius = 8, className }: Props) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ height, borderRadius, opacity, backgroundColor: colors.border, width: '100%' }}
      className={className}
    />
  );
}
