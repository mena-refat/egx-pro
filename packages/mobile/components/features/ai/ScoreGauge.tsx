import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../../hooks/useTheme';

interface Props {
  score: number;
  size?: number;
}

export function ScoreGauge({ score, size = 64 }: Props) {
  const { colors } = useTheme();

  if (!score || score <= 0) return null;

  const r = (size - 8) / 2;
  const stroke = 4;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colors.border}
          strokeWidth={stroke}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, position: 'absolute' }}>
        {score}
      </Text>
    </View>
  );
}
