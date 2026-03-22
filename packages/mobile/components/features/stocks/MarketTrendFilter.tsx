import React, { memo, type Dispatch, type SetStateAction } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BarChart2, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import { BRAND, GREEN, GREEN_BG, RED, RED_BG, BRAND_BG_STRONG, FONT, WEIGHT, RADIUS, SPACE } from '../../../lib/theme';

export type TrendTab = 'gainers' | 'losers' | 'all';

export interface MarketTrendCounts {
  gainers: number;
  losers: number;
  all: number;
}

interface Props {
  tab: TrendTab;
  setTab: Dispatch<SetStateAction<TrendTab>> | ((tab: TrendTab) => void);
  counts: MarketTrendCounts;
  compact?: boolean;
}

const MarketTrendFilter = memo(function MarketTrendFilter({
  tab,
  setTab,
  counts,
  compact,
}: Props) {
  const { colors, isRTL } = useTheme();
  const { t } = useTranslation();

  const TABS: Array<{
    id: TrendTab;
    label: string;
    icon: React.ReactNode;
    activeColor: string;
    activeBg: string;
  }> = [
    {
      id: 'gainers',
      label: t('market.gainers'),
      icon: <TrendingUp size={12} />,
      activeColor: GREEN,
      activeBg: GREEN_BG,
    },
    {
      id: 'losers',
      label: t('market.losers'),
      icon: <TrendingDown size={12} />,
      activeColor: RED,
      activeBg: RED_BG,
    },
    {
      id: 'all',
      label: t('market.all'),
      icon: <BarChart2 size={12} />,
      activeColor: BRAND,
      activeBg: BRAND_BG_STRONG,
    },
  ];

  const getCount = (id: TrendTab) => (id === 'gainers' ? counts.gainers : id === 'losers' ? counts.losers : counts.all);

  return (
    <View
      style={{
        marginHorizontal: SPACE.lg,
        marginBottom: SPACE.sm,
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: RADIUS.lg,
        padding: 4,
        flexDirection: isRTL ? 'row-reverse' : 'row',
        gap: 4,
      }}
    >
      {TABS.map((tItem) => {
        const active = tab === tItem.id;
        const count = getCount(tItem.id);

        return (
          <Pressable
            key={tItem.id}
            accessibilityRole="button"
            accessibilityLabel={`${tItem.label} ${count}`}
            onPress={() => setTab(tItem.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: compact ? 8 : 9,
              borderRadius: RADIUS.md - 4,
              backgroundColor: active ? tItem.activeBg : pressed ? colors.hover : 'transparent',
              borderWidth: active ? 1 : 0,
              borderColor: active ? tItem.activeColor : 'transparent',
            })}
          >
            <View style={{ width: 16, alignItems: 'center' }}>
              {React.cloneElement(tItem.icon as React.ReactElement, {
                color: active ? tItem.activeColor : colors.textMuted,
              })}
            </View>

            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: compact ? 11 : FONT.xs,
                fontWeight: WEIGHT.bold,
                color: active ? tItem.activeColor : colors.textMuted,
              }}
            >
              {tItem.label}
            </Text>

            <View
              style={{
                backgroundColor: active ? tItem.activeBg : colors.hover,
                borderRadius: 999,
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderWidth: active ? 1 : 0,
                borderColor: active ? tItem.activeColor : 'transparent',
              }}
            >
              <Text
                style={{
                  color: active ? tItem.activeColor : colors.textSub,
                  fontSize: 11,
                  fontWeight: WEIGHT.semibold,
                  fontVariant: ['tabular-nums'],
                  textAlign: 'center',
                }}
              >
                {count}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
});

export default MarketTrendFilter;

