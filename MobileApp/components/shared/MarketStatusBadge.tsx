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
        isOpen ? 'bg-emerald-500/15' : 'bg-slate-700/50'
      }`}
    >
      <View
        className={`w-1.5 h-1.5 rounded-full ${
          isOpen ? 'bg-emerald-400' : 'bg-slate-400'
        }`}
      />
      <Text
        className={`text-xs font-medium ${
          isOpen ? 'text-emerald-400' : 'text-slate-400'
        }`}
      >
        {isOpen ? 'السوق مفتوح' : 'السوق مغلق'}
      </Text>
    </View>
  );
}

