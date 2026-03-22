import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { getStockName } from '../../lib/egxStocks';
import { BRAND, BRAND_BG_STRONG, GREEN, GREEN_BG, RED, RED_BG, FONT, WEIGHT, RADIUS, SPACE } from '../../lib/theme';
import type { Stock } from '../../types/stock';

interface StockRowProps {
  stock: Stock;
  onPress: () => void;
  /** Optional live price data to overlay on the stock */
  livePrice?: { price: number; change: number; changePercent: number };
  /** When true, no bottom border is rendered */
  last?: boolean;
}

const StockRow = React.memo(function StockRow({ stock, onPress, livePrice, last }: StockRowProps) {
  const { colors, isRTL } = useTheme();

  const price         = livePrice?.price         ?? stock.price         ?? 0;
  const changePercent = livePrice?.changePercent  ?? stock.changePercent ?? 0;

  const isUp      = changePercent > 0;
  const isNeutral = changePercent === 0;
  const gainColor = isNeutral ? colors.textSub : isUp ? GREEN : RED;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.hover : colors.card,
        borderBottomWidth:  last ? 0 : 1,
        borderBottomColor:  colors.border,
        paddingHorizontal:  SPACE.lg,
        paddingVertical:    SPACE.md,
        flexDirection:      'row',
        alignItems:         'center',
        gap:                SPACE.md,
      })}
    >
      {/* Ticker badge */}
      <View style={{
        width: 40, height: 40,
        borderRadius: RADIUS.md,
        backgroundColor: BRAND_BG_STRONG,
        borderWidth: 1, borderColor: BRAND_BG_STRONG,
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Text
          style={{ color: BRAND, fontSize: FONT.xs, fontWeight: WEIGHT.extrabold, letterSpacing: -0.3 }}
          numberOfLines={1}
        >
          {stock.ticker.slice(0, 4)}
        </Text>
      </View>

      {/* Name */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>
          {stock.ticker}
        </Text>
        <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
          {getStockName(stock.ticker, 'ar')}
        </Text>
      </View>

      {/* Price + change */}
      <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', flexShrink: 0, minWidth: 76 }}>
        <Text style={{
          color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold,
          fontVariant: ['tabular-nums'],
        }}>
          {price.toFixed(2)}
        </Text>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3,
          backgroundColor: isNeutral ? colors.hover : isUp ? GREEN_BG : RED_BG,
          paddingHorizontal: 5, paddingVertical: 2, borderRadius: RADIUS.sm - 2,
        }}>
          {!isNeutral && (isUp
            ? <TrendingUp   size={9} color={gainColor} />
            : <TrendingDown size={9} color={gainColor} />
          )}
          <Text style={{
            color: gainColor, fontSize: 11, fontWeight: WEIGHT.semibold,
            fontVariant: ['tabular-nums'],
          }}>
            {isUp ? '+' : ''}{changePercent.toFixed(2)}%
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

export default StockRow;
