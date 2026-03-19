import { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Briefcase, Star, BarChart2, TrendingUp } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { WatchlistRow } from '../../components/features/dashboard/WatchlistRow';
import { MarketStatusBadge } from '../../components/shared/MarketStatusBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { PortfolioSummaryCard } from '../../components/features/dashboard/PortfolioSummaryCard';
import { SectionHeader } from '../../components/features/dashboard/SectionHeader';
import { PortfolioChart } from '../../components/features/dashboard/PortfolioChart';
import { TopMoversSection } from '../../components/features/dashboard/TopMoversSection';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useLivePrices } from '../../hooks/useLivePrices';
import { useMarketData, usePortfolioData } from '../../hooks/useMarketData';
import { useWatchlist } from '../../hooks/useWatchlist';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { getStockName } from '../../lib/egxStocks';
import { useWindowDimensions } from 'react-native';

function fmtNum(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function HomePage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const user = useAuthStore((s) => s.user);
  const unreadCount = useUnreadCount();
  const { stocks, loadingStocks, refreshing: mktRefreshing, refresh: refreshMarket } = useMarketData();
  const { holdings, summary, loading: portfolioLoading, refreshing: portRefreshing, refresh: refreshPortfolio } = usePortfolioData();
  const { items: watchlist, loading: watchlistLoading, refetch: refetchWatchlist } = useWatchlist();

  const holdingTickers = useMemo(() => holdings.map((h) => h.ticker), [holdings]);
  const watchlistTickers = useMemo(() => watchlist.map((s) => s.ticker), [watchlist]);
  const allTickers = useMemo(() => [...new Set([...holdingTickers, ...watchlistTickers])], [holdingTickers, watchlistTickers]);
  const { prices } = useLivePrices(allTickers);

  const refreshing = mktRefreshing || portRefreshing;
  const handleRefresh = useCallback(async () => {
    await Promise.all([refreshMarket(), refreshPortfolio(), refetchWatchlist()]);
  }, [refreshMarket, refreshPortfolio, refetchWatchlist]);

  const topGainers = useMemo(
    () => [...stocks].filter((s) => s.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent).slice(0, 5),
    [stocks],
  );
  const topLosers = useMemo(
    () => [...stocks].filter((s) => s.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 5),
    [stocks],
  );

  const enrichedHoldings = useMemo(() =>
    holdings.map((h) => {
      const live = prices[h.ticker];
      const price = live?.price ?? h.currentPrice ?? h.avgPrice;
      const sessionChange = live?.changePercent ?? 0;
      const currentValue = price * h.shares;
      const totalGain = (price - h.avgPrice) * h.shares;
      const totalGainPct = h.avgPrice > 0 ? ((price - h.avgPrice) / h.avgPrice) * 100 : 0;
      return { ...h, price, sessionChange, currentValue, totalGain, totalGainPct };
    }),
    [holdings, prices],
  );

  const bestToday = useMemo(
    () => [...enrichedHoldings].sort((a, b) => b.sessionChange - a.sessionChange)[0] ?? null,
    [enrichedHoldings],
  );
  const worstToday = useMemo(
    () => [...enrichedHoldings].sort((a, b) => a.sessionChange - b.sessionChange)[0] ?? null,
    [enrichedHoldings],
  );

  const liveSummary = useMemo(() => {
    if (enrichedHoldings.length === 0) return summary;
    const totalValue = enrichedHoldings.reduce((s, h) => s + h.currentValue, 0);
    const totalCost = enrichedHoldings.reduce((s, h) => s + h.avgPrice * h.shares, 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    return { totalValue, totalCost, totalGainLoss, totalGainLossPercent };
  }, [enrichedHoldings, summary]);

  return (
    <ScreenWrapper padded={false} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#8b5cf6" colors={['#8b5cf6']} />
        }
      >
        {/* ─── Header ─── */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: isCompact ? 12 : 18, paddingBottom: isCompact ? 10 : 14 }}>
          <View>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>أهلاً بك،</Text>
            <Text style={{ color: colors.text, fontSize: isCompact ? 18 : 20, fontWeight: '800', marginTop: 2 }}>
              {user?.fullName?.split(' ')[0] || 'مستثمر'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <MarketStatusBadge />
            <Pressable
              onPress={() => router.navigate('/notifications')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ backgroundColor: colors.hover, borderColor: colors.border, borderWidth: 1, width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
            >
              <Bell size={16} color={colors.textSub} />
              {unreadCount > 0 && (
                <View style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View style={{ paddingTop: 16, gap: 20 }}>

          {/* ─── 1. Portfolio Summary ─── */}
          <PortfolioSummaryCard
            totalValue={liveSummary.totalValue}
            totalCost={liveSummary.totalCost}
            totalGainLoss={liveSummary.totalGainLoss}
            totalGainLossPercent={liveSummary.totalGainLossPercent}
            loading={portfolioLoading}
            onPress={() => router.push('/portfolio')}
          />

          {/* ─── 2. Owned Stocks ─── */}
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader
              title="الأسهم المملوكة"
              icon={Briefcase}
              linkLabel={holdings.length > 3 ? `الكل (${holdings.length})` : undefined}
              onLink={() => router.push('/portfolio')}
            />
            <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, overflow: 'hidden' }}>
              {portfolioLoading ? (
                <View style={{ gap: 2, padding: 12 }}>
                  {[1, 2, 3].map((i) => <Skeleton key={i} height={62} borderRadius={12} />)}
                </View>
              ) : enrichedHoldings.length === 0 ? (
                <Pressable onPress={() => router.push('/market')} style={{ paddingVertical: 36, alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>محفظتك فارغة</Text>
                  <Text style={{ color: '#8b5cf6', fontSize: 12, fontWeight: '600' }}>ابدأ بإضافة أسهم من السوق</Text>
                </Pressable>
              ) : (
                enrichedHoldings.slice(0, 4).map((h, i) => (
                  <Pressable
                    key={h.id}
                    onPress={() => router.push(`/stocks/${h.ticker}`)}
                    style={({ pressed }) => [
                      { borderBottomColor: colors.border, backgroundColor: pressed ? colors.hover : 'transparent', paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center' },
                      i < Math.min(enrichedHoldings.length, 4) - 1 && { borderBottomWidth: 1 },
                    ]}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#8b5cf618', borderWidth: 1, borderColor: '#8b5cf628', alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 }}>
                      <Text style={{ color: '#8b5cf6', fontSize: 8, fontWeight: '800' }} numberOfLines={1}>{h.ticker.slice(0, 4)}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{h.ticker}</Text>
                      <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                        {getStockName(h.ticker, 'ar')} · {h.shares} سهم
                      </Text>
                    </View>
                    <View style={{ alignItems: I18nManager.isRTL ? 'flex-start' : 'flex-end', marginLeft: 10, flexShrink: 0 }}>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                        {fmtNum(h.currentValue)} EGP
                      </Text>
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', marginTop: 3,
                        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 7,
                        backgroundColor: h.sessionChange > 0 ? '#4ade8018' : h.sessionChange < 0 ? '#f8717118' : colors.hover,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'], color: h.sessionChange > 0 ? '#4ade80' : h.sessionChange < 0 ? '#f87171' : colors.textMuted }}>
                          {h.sessionChange > 0 ? '+' : ''}{h.sessionChange.toFixed(2)}%
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </View>

          {/* ─── 3. Portfolio Chart ─── */}
          {!portfolioLoading && enrichedHoldings.length > 0 && (
            <View style={{ paddingHorizontal: 16 }}>
              <PortfolioChart holdings={enrichedHoldings} />
            </View>
          )}

          {/* ─── 4. Top Movers ─── */}
          {!loadingStocks && (topGainers.length > 0 || topLosers.length > 0) && (
            <View style={{ paddingHorizontal: 16 }}>
              <SectionHeader title="الأكثر تحركاً" icon={BarChart2} linkLabel="السوق" onLink={() => router.push('/market')} />
              <TopMoversSection
                topGainers={topGainers}
                topLosers={topLosers}
                onPressTicker={(ticker) => router.push(`/stocks/${ticker}`)}
              />
            </View>
          )}

          {/* ─── 5. Portfolio Performance ─── */}
          {!portfolioLoading && enrichedHoldings.length > 0 && (
            <View style={{ paddingHorizontal: 16 }}>
              <SectionHeader title="أداء المحفظة" icon={TrendingUp} />
              <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, overflow: 'hidden' }}>
                <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <View style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.border }}>
                    <Text style={{ color: colors.textMuted, fontSize: 10, marginBottom: 4 }}>الأسهم</Text>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{enrichedHoldings.length}</Text>
                  </View>
                  <View style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.border }}>
                    <Text style={{ color: colors.textMuted, fontSize: 10, marginBottom: 4 }}>أفضل اليوم</Text>
                    {bestToday ? (
                      <>
                        <Text style={{ color: '#4ade80', fontSize: 13, fontWeight: '700' }}>{bestToday.ticker}</Text>
                        <Text style={{ color: '#4ade80', fontSize: 11, fontWeight: '600', marginTop: 1 }}>
                          {bestToday.sessionChange > 0 ? '+' : ''}{bestToday.sessionChange.toFixed(2)}%
                        </Text>
                      </>
                    ) : <Text style={{ color: colors.textMuted, fontSize: 16 }}>—</Text>}
                  </View>
                  <View style={{ flex: 1, paddingVertical: 14, alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted, fontSize: 10, marginBottom: 4 }}>الأسوأ اليوم</Text>
                    {worstToday && worstToday.sessionChange < 0 ? (
                      <>
                        <Text style={{ color: '#f87171', fontSize: 13, fontWeight: '700' }}>{worstToday.ticker}</Text>
                        <Text style={{ color: '#f87171', fontSize: 11, fontWeight: '600', marginTop: 1 }}>
                          {worstToday.sessionChange.toFixed(2)}%
                        </Text>
                      </>
                    ) : <Text style={{ color: colors.textMuted, fontSize: 16 }}>—</Text>}
                  </View>
                </View>
                {enrichedHoldings.map((h, i) => {
                  const weight = liveSummary.totalValue > 0 ? (h.currentValue / liveSummary.totalValue) * 100 : 0;
                  const barColor = h.totalGainPct > 0 ? '#4ade80' : h.totalGainPct < 0 ? '#f87171' : colors.textMuted;
                  return (
                    <Pressable
                      key={h.id}
                      onPress={() => router.push(`/stocks/${h.ticker}`)}
                      style={({ pressed }) => [
                        { backgroundColor: pressed ? colors.hover : 'transparent', paddingHorizontal: 16, paddingVertical: 12 },
                        i < enrichedHoldings.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{h.ticker}</Text>
                          <Text style={{ color: colors.textMuted, fontSize: 11 }}>{weight.toFixed(1)}%</Text>
                        </View>
                        <View style={{ alignItems: I18nManager.isRTL ? 'flex-start' : 'flex-end' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'], color: barColor }}>
                            {h.totalGainPct >= 0 ? '+' : ''}{h.totalGainPct.toFixed(2)}%
                          </Text>
                          <Text style={{ color: colors.textMuted, fontSize: 11, fontVariant: ['tabular-nums'], marginTop: 1 }}>
                            {h.totalGain >= 0 ? '+' : ''}{fmtNum(h.totalGain)} EGP
                          </Text>
                        </View>
                      </View>
                      <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${weight}%`, backgroundColor: barColor, borderRadius: 99 }} />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* ─── 6. Watchlist ─── */}
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="قائمة المتابعة" icon={Star} linkLabel="إضافة" onLink={() => router.push('/market')} />
            <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, overflow: 'hidden' }}>
              {watchlistLoading ? (
                <View style={{ gap: 2, padding: 12 }}>
                  {[1, 2, 3].map((i) => <Skeleton key={i} height={54} borderRadius={12} />)}
                </View>
              ) : watchlist.length === 0 ? (
                <Pressable onPress={() => router.push('/market')} style={{ paddingVertical: 36, alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>قائمة المتابعة فارغة</Text>
                  <Text style={{ color: '#8b5cf6', fontSize: 12, fontWeight: '600' }}>أضف أسهم من السوق</Text>
                </Pressable>
              ) : (
                watchlist.map((stock, i) => (
                  <View
                    key={stock.ticker}
                    style={i < watchlist.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.border } : undefined}
                  >
                    <WatchlistRow stock={stock} livePrice={prices[stock.ticker]} />
                  </View>
                ))
              )}
            </View>
          </View>

        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
