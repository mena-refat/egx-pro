import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { isEgyptMarketOpen } from '../../lib/cairoTime';
import { useTheme } from '../../hooks/useTheme';

export function MarketStatusBadge() {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(() => isEgyptMarketOpen());

  useEffect(() => {
    const interval = setInterval(() => setIsOpen(isEgyptMarketOpen()), 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View
      style={{ backgroundColor: isOpen ? '#4ade8018' : colors.hover }}
      className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full"
    >
      <View
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: isOpen ? '#4ade80' : colors.textMuted }}
      />
      <Text
        style={{ color: isOpen ? '#4ade80' : colors.textSub }}
        className="text-xs font-medium"
      >
        {isOpen ? 'السوق مفتوح' : 'السوق مغلق'}
      </Text>
    </View>
  );
}
