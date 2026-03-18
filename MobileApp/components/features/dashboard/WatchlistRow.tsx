import { Pressable, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { getStockName } from '../../../lib/egxStocks';
import { PriceTag, StockPrice } from '../../shared/PriceTag';
import type { Stock } from '../../../types/stock';

interface Props {
  stock: Stock;
  livePrice?: { price: number; change: number; changePercent: number };
}

export function WatchlistRow({ stock, livePrice }: Props) {
  const router = useRouter();
  const price = livePrice?.price ?? stock.price;
  const change = livePrice?.change ?? stock.change;
  const changePercent = livePrice?.changePercent ?? stock.changePercent;

  return (
    <Pressable
      onPress={() => router.push(`/stocks/${stock.ticker}`)}
      className="flex-row items-center justify-between py-3.5 border-b border-[#21262d] active:bg-[#1c2128]"
    >
      <View className="flex-1">
        <Text className="text-sm font-semibold text-[#e6edf3]">{stock.ticker}</Text>
        <Text className="text-xs text-[#8b949e] mt-0.5" numberOfLines={1}>
          {getStockName(stock.ticker, 'ar')}
        </Text>
      </View>
      <View className="items-end gap-1">
        <StockPrice price={price} />
        <PriceTag change={change} changePercent={changePercent} size="sm" />
      </View>
    </Pressable>
  );
}
