import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { isEgyptMarketOpen } from '../../lib/cairoTime';

export function MarketStatusBadge() {
  const [isOpen, setIsOpen] = useState(() => isEgyptMarketOpen());

  useEffect(() => {
    const interval = setInterval(() => setIsOpen(isEgyptMarketOpen()), 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View
      className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full ${
        isOpen ? 'bg-emerald-500/10' : 'bg-white/[0.04]'
      }`}
    >
      <View
        className={`w-1.5 h-1.5 rounded-full ${
          isOpen ? 'bg-emerald-400' : 'bg-[#656d76]'
        }`}
      />
      <Text
        className={`text-xs font-medium ${
          isOpen ? 'text-emerald-400' : 'text-[#8b949e]'
        }`}
      >
        {isOpen ? 'السوق مفتوح' : 'السوق مغلق'}
      </Text>
    </View>
  );
}
