import { Text, View } from 'react-native';

interface Item {
  ticker: string;
  price: number;
  changePercent: number;
}

interface Props {
  items: Item[];
  cardBackground: string;
  borderColor: string;
  textColor: string;
  mutedTextColor: string;
}

export function MarketMoversCard({ items, cardBackground, borderColor, textColor, mutedTextColor }: Props) {
  const gainers = [...items].filter((item) => item.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent).slice(0, 4);
  const losers  = [...items].filter((item) => item.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 4);

  return (
    <View style={{ backgroundColor: cardBackground, borderColor, borderWidth: 1, borderRadius: 16, overflow: 'hidden' }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: borderColor }}>
        <Text style={{ color: textColor, fontSize: 16, fontWeight: '700' }}>الأكثر تحركاً</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, padding: 12 }}>
        {/* Gainers */}
        <View style={{ flex: 1, backgroundColor: '#4ade8014', borderRadius: 12, overflow: 'hidden' }}>
          <Text style={{ color: '#4ade80', fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 8 }}>صاعدة</Text>
          {gainers.length === 0 ? (
            <Text style={{ color: mutedTextColor, fontSize: 11, paddingHorizontal: 10, paddingBottom: 10 }}>لا توجد بيانات</Text>
          ) : (
            gainers.map((item) => (
              <View key={item.ticker} style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                <Text style={{ color: textColor, fontSize: 12, fontWeight: '700' }}>{item.ticker}</Text>
                <Text style={{ color: '#4ade80', fontSize: 11, marginTop: 2, fontVariant: ['tabular-nums'] }}>
                  +{item.changePercent.toFixed(2)}%
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Losers */}
        <View style={{ flex: 1, backgroundColor: '#f8717114', borderRadius: 12, overflow: 'hidden' }}>
          <Text style={{ color: '#f87171', fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 8 }}>هابطة</Text>
          {losers.length === 0 ? (
            <Text style={{ color: mutedTextColor, fontSize: 11, paddingHorizontal: 10, paddingBottom: 10 }}>لا توجد بيانات</Text>
          ) : (
            losers.map((item) => (
              <View key={item.ticker} style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                <Text style={{ color: textColor, fontSize: 12, fontWeight: '700' }}>{item.ticker}</Text>
                <Text style={{ color: '#f87171', fontSize: 11, marginTop: 2, fontVariant: ['tabular-nums'] }}>
                  {item.changePercent.toFixed(2)}%
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );
}
