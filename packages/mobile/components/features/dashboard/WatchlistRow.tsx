import { Pressable, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { getStockName } from '../../../lib/egxStocks';
import { PriceTag, StockPrice } from '../../shared/PriceTag';
import { useTheme } from '../../../hooks/useTheme';
import type { Stock } from '../../../types/stock';

interface Props {
  stock: Stock;
  livePrice?: { price: number; change: number; changePercent: number };
}

export function WatchlistRow({ stock, livePrice }: Props) {
  const router = useRouter();
  const { colors, isRTL } = useTheme();
  const price = livePrice?.price ?? stock.price;
  const change = livePrice?.change ?? stock.change;
  const changePercent = livePrice?.changePercent ?? stock.changePercent;

  return (
    <Pressable
      onPress={() => router.push(`/stocks/${stock.ticker}`)}
      style={({ pressed }) => [
        {
          backgroundColor: pressed ? colors.hover : 'transparent',
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>
          {stock.ticker}
        </Text>
        <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
          {getStockName(stock.ticker, 'ar')}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <StockPrice price={price} />
        <PriceTag change={change} changePercent={changePercent} size="sm" />
      </View>
    </Pressable>
  );
}
