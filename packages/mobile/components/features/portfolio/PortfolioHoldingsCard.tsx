import { Pressable, Text, View } from 'react-native';
import { Trash2, TrendingDown, TrendingUp, Minus } from 'lucide-react-native';
import { getStockName } from '../../../lib/egxStocks';
import { useTheme } from '../../../hooks/useTheme';

interface Holding {
  id: string;
  ticker: string;
  shares: number;
  avgPrice: number;
  currentPrice?: number;
}

interface GroupedHolding {
  ticker: string;
  ids: string[];
  shares: number;
  avgPrice: number;
  currentPrice?: number;
}

interface Props {
  holdings: Holding[];
  livePrices: Record<string, { price: number } | undefined>;
  cardBackground: string;
  borderColor: string;
  textColor: string;
  subTextColor: string;
  mutedTextColor: string;
  onPressTicker: (ticker: string) => void;
  onDeleteGroup: (ids: string[], ticker: string) => void;
}

function groupHoldings(holdings: Holding[]): GroupedHolding[] {
  const map = new Map<string, GroupedHolding>();
  for (const holding of holdings) {
    const existing = map.get(holding.ticker);
    if (!existing) {
      map.set(holding.ticker, {
        ticker: holding.ticker,
        ids: [holding.id],
        shares: holding.shares,
        avgPrice: holding.avgPrice,
        currentPrice: holding.currentPrice,
      });
      continue;
    }
    const totalShares = existing.shares + holding.shares;
    const weightedAvg = totalShares > 0
      ? ((existing.avgPrice * existing.shares) + (holding.avgPrice * holding.shares)) / totalShares
      : 0;
    existing.ids.push(holding.id);
    existing.shares = totalShares;
    existing.avgPrice = weightedAvg;
    existing.currentPrice = holding.currentPrice ?? existing.currentPrice;
  }
  return Array.from(map.values()).sort((a, b) => b.shares - a.shares);
}

export function PortfolioHoldingsCard({
  holdings, livePrices, cardBackground, borderColor, textColor, subTextColor, mutedTextColor,
  onPressTicker, onDeleteGroup,
}: Props) {
  const { isRTL } = useTheme();
  const grouped = groupHoldings(holdings);

  return (
    <View style={{ backgroundColor: cardBackground, borderColor, borderWidth: 1, borderRadius: 16, overflow: 'hidden' }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: borderColor }}>
        <Text style={{ color: textColor, fontSize: 16, fontWeight: '700' }}>الأصول</Text>
      </View>

      {grouped.length === 0 ? (
        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
          <Text style={{ color: mutedTextColor, fontSize: 13 }}>لا توجد أصول بعد</Text>
        </View>
      ) : (
        grouped.map((holding, index) => {
          const livePrice = livePrices[holding.ticker]?.price;
          const currentPrice = livePrice ?? holding.currentPrice ?? holding.avgPrice;
          const value = holding.shares * currentPrice;
          const gainLossPercent = holding.avgPrice > 0 ? ((currentPrice - holding.avgPrice) / holding.avgPrice) * 100 : 0;
          const gainColor = gainLossPercent > 0 ? '#4ade80' : gainLossPercent < 0 ? '#f87171' : mutedTextColor;
          const gainBg   = gainLossPercent > 0 ? '#4ade8018' : gainLossPercent < 0 ? '#f8717118' : '#8c959f18';
          const isLast = index === grouped.length - 1;

          return (
            <View key={holding.ticker} style={{ borderBottomWidth: isLast ? 0 : 1, borderBottomColor: borderColor }}>
              <Pressable
                onPress={() => onPressTicker(holding.ticker)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#8b5cf608' : 'transparent',
                  paddingHorizontal: 16, paddingVertical: 14,
                  flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12,
                })}
              >
                {/* Ticker badge — unified brand purple */}
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#8b5cf618', borderWidth: 1, borderColor: '#8b5cf628', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#8b5cf6', fontSize: 10, fontWeight: '800' }} numberOfLines={1}>
                    {holding.ticker.slice(0, 4)}
                  </Text>
                </View>

                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={{ color: textColor, fontSize: 14, fontWeight: '700' }}>{holding.ticker}</Text>
                  <Text style={{ color: subTextColor, fontSize: 11 }} numberOfLines={1}>
                    {getStockName(holding.ticker, 'ar')}
                  </Text>
                  <Text style={{ color: mutedTextColor, fontSize: 11 }}>
                    {holding.shares.toLocaleString('en-US')} سهم
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 5 }}>
                  <Text style={{ color: textColor, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                    {value.toLocaleString('en-US', { maximumFractionDigits: 0 })} EGP
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: gainBg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                    {gainLossPercent > 0
                      ? <TrendingUp size={10} color={gainColor} />
                      : gainLossPercent < 0
                      ? <TrendingDown size={10} color={gainColor} />
                      : <Minus size={10} color={gainColor} />}
                    <Text style={{ color: gainColor, fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                      {gainLossPercent > 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                    </Text>
                  </View>
                </View>

                <Pressable onPress={() => onDeleteGroup(holding.ids, holding.ticker)} hitSlop={8}>
                  <Trash2 size={14} color={mutedTextColor} />
                </Pressable>
              </Pressable>
            </View>
          );
        })
      )}
    </View>
  );
}
