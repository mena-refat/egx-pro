import { useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, FlatList, RefreshControl,
  Pressable, I18nManager, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Briefcase, Star, BarChart2, Newspaper, TrendingUp, TrendingDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { MarketStatusBadge } from '../../components/shared/MarketStatusBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useLivePrices } from '../../hooks/useLivePrices';
import { useMarketData, usePortfolioData } from '../../hooks/useMarketData';
import { useWatchlist } from '../../hooks/useWatchlist';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { getStockName } from '../../lib/egxStocks';
import {
  BRAND, BRAND_BG_STRONG, BRAND_LIGHT,
  FONT, WEIGHT, RADIUS, SPACE,
  GREEN, RED,
} from '../../lib/theme';
import type { Stock } from '../../types/stock';

function n(v: number) {
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// ─── WatchlistCard (horizontal chip) ────────────────────────────
function WatchlistCard({ stock, live, onPress }: { stock: Stock; live?: { price: number; changePercent: number }; onPress: () => void }) {
  const { colors } = useTheme();
  const price  = live?.price         ?? stock.price         ?? 0;
  const chgPct = live?.changePercent  ?? stock.changePercent ?? 0;
  const isUp   = chgPct >= 0;
  const clr    = chgPct === 0 ? colors.textSub : isUp ? GREEN : RED;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: RADIUS.xl, padding: SPACE.md, minWidth: 120,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>{stock.ticker}</Text>
      <Text style={{ color: colors.textMuted, fontSize: FONT.xs, marginTop: 1 }} numberOfLines={1}>
        {getStockName(stock.ticker, 'ar')}
      </Text>
      <Text style={{ color: price > 0 ? colors.text : colors.textMuted, fontSize: FONT.base, fontWeight: WEIGHT.bold, marginTop: SPACE.xs, fontVariant: ['tabular-nums'] }}>
        {price > 0 ? price.toFixed(2) : '—'}
      </Text>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3,
        backgroundColor: chgPct === 0 ? colors.hover : isUp ? '#4ade8018' : '#f8717118',
        paddingHorizontal: 5, paddingVertical: 2, borderRadius: RADIUS.sm - 2, alignSelf: 'flex-start',
      }}>
        <Text style={{ color: clr, fontSize: 11, fontWeight: WEIGHT.semibold, fontVariant: ['tabular-nums'] }}>
          {isUp ? '+' : ''}{chgPct.toFixed(2)}%
        </Text>
      </View>
    </Pressable>
  );
}

// ─── MoverChip ──────────────────────────────────────────────────
function MoverChip({ s, onPress }: { s: Stock; onPress: () => void }) {
  const { colors } = useTheme();
  const isUp = s.changePercent >= 0;
  const clr  = isUp ? GREEN : RED;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: isUp ? '#4ade8010' : '#f8717110',
        borderWidth: 1, borderColor: isUp ? '#4ade8030' : '#f8717130',
        borderRadius: RADIUS.lg, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm,
        flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, opacity: pressed ? 0.8 : 1,
      })}
    >
      {isUp ? <TrendingUp size={13} color={clr} /> : <TrendingDown size={13} color={clr} />}
      <View>
        <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>{s.ticker}</Text>
        <Text style={{ color: clr, fontSize: 11, fontWeight: WEIGHT.semibold, fontVariant: ['tabular-nums'] }}>
          {isUp ? '+' : ''}{s.changePercent.toFixed(2)}%
        </Text>
      </View>
    </Pressable>
  );
}

// ─── SectionHeader ──────────────────────────────────────────────
function SectionHdr({
  title, icon: Icon, action,
}: { title: string; icon?: React.ComponentType<{ size: number; color: string }>; action?: { label: string; onPress: () => void } }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
        {Icon && (
          <View style={{ width: 26, height: 26, borderRadius: RADIUS.sm, backgroundColor: BRAND_BG_STRONG, alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={13} color={BRAND} />
          </View>
        )}
        <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>{title}</Text>
      </View>
      {action && (
        <Pressable onPress={action.onPress} style={{ paddingVertical: 4, paddingHorizontal: SPACE.sm }}>
          <Text style={{ color: BRAND, fontSize: FONT.xs, fontWeight: WEIGHT.semibold }}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── HomePage ────────────────────────────────────────────────────
export default function HomePage() {
  const router      = useRouter();
  const { colors, isDark }  = useTheme();
  const { width }   = useWindowDimensions();
  const isCompact   = width < 380;
  const user        = useAuthStore((s) => s.user);
  const unreadCount = useUnreadCount();

  const { stocks, news, loadingStocks, refreshing: mktRefreshing, refresh: refreshMarket } = useMarketData();
  const { holdings, summary, loading: portLoading, refreshing: portRefreshing, refresh: refreshPortfolio } = usePortfolioData();
  const { items: watchlist, loading: watchlistLoading, refetch: refetchWatchlist } = useWatchlist();

  const holdingTickers  = useMemo(() => holdings.map((h) => h.ticker), [holdings]);
  const watchlistTickers = useMemo(() => watchlist.map((s) => s.ticker), [watchlist]);
  const allTickers      = useMemo(() => [...new Set([...holdingTickers, ...watchlistTickers])], [holdingTickers, watchlistTickers]);
  const { prices }      = useLivePrices(allTickers);

  const refreshing    = mktRefreshing || portRefreshing;
  const handleRefresh = useCallback(async () => {
    await Promise.all([refreshMarket(), refreshPortfolio(), refetchWatchlist()]);
  }, [refreshMarket, refreshPortfolio, refetchWatchlist]);

  // Live-enriched portfolio values
  const enrichedHoldings = useMemo(() =>
    holdings.map((h) => {
      const live  = prices[h.ticker];
      const price = live?.price ?? h.currentPrice ?? h.avgPrice;
      const sessionChange = live?.changePercent ?? 0;
      const currentValue  = price * h.shares;
      const totalGain     = (price - h.avgPrice) * h.shares;
      const totalGainPct  = h.avgPrice > 0 ? ((price - h.avgPrice) / h.avgPrice) * 100 : 0;
      return { ...h, price, sessionChange, currentValue, totalGain, totalGainPct };
    }),
    [holdings, prices],
  );

  const liveSummary = useMemo(() => {
    if (enrichedHoldings.length === 0) return summary;
    const totalValue   = enrichedHoldings.reduce((s, h) => s + h.currentValue, 0);
    const totalCost    = enrichedHoldings.reduce((s, h) => s + h.avgPrice * h.shares, 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    return { totalValue, totalCost, totalGainLoss, totalGainLossPercent };
  }, [enrichedHoldings, summary]);

  const topGainers = useMemo(
    () => [...stocks].filter((s) => s.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent).slice(0, 6),
    [stocks],
  );
  const topLosers = useMemo(
    () => [...stocks].filter((s) => s.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 6),
    [stocks],
  );

  const isPositive = liveSummary.totalGainLoss >= 0;
  const gainColor  = isPositive ? GREEN : RED;

  return (
    <ScreenWrapper padded={false} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BRAND} colors={[BRAND]} />
        }
      >
        {/* ─── Header ─────────────────────────────────── */}
        <View style={{
          borderBottomWidth: 1, borderBottomColor: colors.border,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: SPACE.lg, paddingTop: isCompact ? 12 : 18, paddingBottom: isCompact ? 10 : 14,
        }}>
          <View>
            <Text style={{ color: colors.textMuted, fontSize: FONT.xs }}>أهلاً بك،</Text>
            <Text style={{ color: colors.text, fontSize: isCompact ? FONT.lg : FONT.xl, fontWeight: WEIGHT.extrabold, marginTop: 2 }}>
              {user?.fullName?.split(' ')[0] ?? 'مستثمر'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
            <MarketStatusBadge />
            <Pressable
              onPress={() => router.navigate('/notifications')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                backgroundColor: colors.hover, borderColor: colors.border, borderWidth: 1,
                width: 38, height: 38, borderRadius: RADIUS.md,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Bell size={16} color={colors.textSub} />
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 16, height: 16, borderRadius: 8,
                  backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 9, fontWeight: WEIGHT.bold, color: '#fff' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View style={{ paddingTop: SPACE.lg, gap: SPACE.xl }}>

          {/* ─── 1. Portfolio Hero (LinearGradient) ─────── */}
          <View style={{ paddingHorizontal: SPACE.lg }}>
            <Pressable onPress={() => router.push('/portfolio')} style={{ borderRadius: RADIUS['2xl'], overflow: 'hidden' }}>
              <LinearGradient
                colors={isDark
                  ? ['#1e1040', '#1a0d35', '#110826']
                  : ['#7c3aed', '#6d28d9', '#5b21b6']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ padding: SPACE.xl, borderRadius: RADIUS['2xl'], borderWidth: 1, borderColor: BRAND + '30' }}
              >
                {portLoading ? (
                  <View style={{ gap: SPACE.sm }}>
                    <Skeleton.Line width={120} height={14} />
                    <Skeleton.Line width={200} height={36} />
                    <Skeleton.Line width={160} height={18} />
                  </View>
                ) : (
                  <>
                    <Text style={{ color: BRAND_LIGHT, fontSize: FONT.xs, marginBottom: SPACE.xs }}>
                      إجمالي محفظتي
                    </Text>
                    <Text style={{ color: '#fff', fontSize: FONT['3xl'], fontWeight: WEIGHT.extrabold, fontVariant: ['tabular-nums'] }}>
                      {n(liveSummary.totalValue)} EGP
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.sm }}>
                      <View style={{
                        paddingHorizontal: SPACE.sm, paddingVertical: 3, borderRadius: RADIUS.full,
                        backgroundColor: isPositive ? '#4ade8025' : '#f8717125',
                      }}>
                        <Text style={{ color: gainColor, fontSize: FONT.sm, fontWeight: WEIGHT.bold, fontVariant: ['tabular-nums'] }}>
                          {isPositive ? '+' : ''}{n(liveSummary.totalGainLoss)} EGP ({liveSummary.totalGainLossPercent.toFixed(2)}%)
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: SPACE.xl, marginTop: SPACE.lg }}>
                      <View>
                        <Text style={{ color: BRAND_LIGHT, fontSize: FONT.xs }}>التكلفة</Text>
                        <Text style={{ color: '#e2d9f3', fontSize: FONT.sm, fontWeight: WEIGHT.semibold, fontVariant: ['tabular-nums'] }}>
                          {n(liveSummary.totalCost)} EGP
                        </Text>
                      </View>
                      <View>
                        <Text style={{ color: BRAND_LIGHT, fontSize: FONT.xs }}>الأسهم</Text>
                        <Text style={{ color: '#e2d9f3', fontSize: FONT.sm, fontWeight: WEIGHT.semibold }}>
                          {enrichedHoldings.length}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {/* ─── 2. Holdings ─────────────────────────────── */}
          <View style={{ paddingHorizontal: SPACE.lg }}>
            <SectionHdr
              title="الأسهم المملوكة"
              icon={Briefcase}
              action={holdings.length > 3 ? { label: `الكل (${holdings.length})`, onPress: () => router.push('/portfolio') } : undefined}
            />
            <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: RADIUS.xl, overflow: 'hidden' }}>
              {portLoading ? (
                <View style={{ gap: 2, padding: SPACE.md }}>
                  {[1, 2, 3].map((i) => <Skeleton.Box key={i} height={62} radius={RADIUS.md} />)}
                </View>
              ) : enrichedHoldings.length === 0 ? (
                <Pressable onPress={() => router.push('/market')} style={{ paddingVertical: 36, alignItems: 'center', gap: SPACE.sm }}>
                  <Text style={{ color: colors.textMuted, fontSize: FONT.sm }}>محفظتك فارغة</Text>
                  <Text style={{ color: BRAND, fontSize: FONT.xs, fontWeight: WEIGHT.semibold }}>ابدأ بإضافة أسهم من السوق</Text>
                </Pressable>
              ) : (
                enrichedHoldings.slice(0, 4).map((h, i) => (
                  <Pressable
                    key={h.ticker}
                    onPress={() => router.push(`/stocks/${h.ticker}`)}
                    style={({ pressed }) => [
                      {
                        borderBottomColor: colors.border,
                        backgroundColor: pressed ? colors.hover : 'transparent',
                        paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
                        flexDirection: 'row', alignItems: 'center',
                      },
                      i < Math.min(enrichedHoldings.length, 4) - 1 && { borderBottomWidth: 1 },
                    ]}
                  >
                    <View style={{
                      width: 40, height: 40, borderRadius: RADIUS.md,
                      backgroundColor: BRAND_BG_STRONG, borderWidth: 1, borderColor: BRAND + '28',
                      alignItems: 'center', justifyContent: 'center', marginRight: SPACE.md, flexShrink: 0,
                    }}>
                      <Text style={{ color: BRAND, fontSize: 8, fontWeight: WEIGHT.extrabold }} numberOfLines={1}>
                        {h.ticker.slice(0, 4)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>{h.ticker}</Text>
                      <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                        {getStockName(h.ticker, 'ar')} · {h.shares} سهم
                      </Text>
                    </View>
                    <View style={{ alignItems: I18nManager.isRTL ? 'flex-start' : 'flex-end', marginLeft: SPACE.sm, flexShrink: 0 }}>
                      <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold, fontVariant: ['tabular-nums'] }}>
                        {n(h.currentValue)} EGP
                      </Text>
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', marginTop: 3,
                        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 7,
                        backgroundColor: h.sessionChange > 0 ? '#4ade8018' : h.sessionChange < 0 ? '#f8717118' : colors.hover,
                      }}>
                        <Text style={{
                          fontSize: 11, fontWeight: WEIGHT.bold, fontVariant: ['tabular-nums'],
                          color: h.sessionChange > 0 ? GREEN : h.sessionChange < 0 ? RED : colors.textMuted,
                        }}>
                          {h.sessionChange > 0 ? '+' : ''}{h.sessionChange.toFixed(2)}%
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </View>

          {/* ─── 3. Watchlist (horizontal scroll) ──────── */}
          <View>
            <View style={{ paddingHorizontal: SPACE.lg }}>
              <SectionHdr
                title="قائمة المتابعة"
                icon={Star}
                action={{ label: 'إضافة', onPress: () => router.push('/market') }}
              />
            </View>
            {watchlistLoading ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACE.lg, gap: SPACE.sm }}>
                {[1, 2, 3, 4].map((i) => <Skeleton.Box key={i} width={120} height={90} radius={RADIUS.xl} />)}
              </ScrollView>
            ) : watchlist.length === 0 ? (
              <View style={{ paddingHorizontal: SPACE.lg }}>
                <Pressable onPress={() => router.push('/market')} style={{
                  backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
                  borderRadius: RADIUS.xl, paddingVertical: 28, alignItems: 'center', gap: SPACE.sm,
                }}>
                  <Text style={{ color: colors.textMuted, fontSize: FONT.sm }}>قائمة المتابعة فارغة</Text>
                  <Text style={{ color: BRAND, fontSize: FONT.xs, fontWeight: WEIGHT.semibold }}>أضف أسهم من السوق</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={watchlist}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(s) => s.ticker}
                contentContainerStyle={{ paddingHorizontal: SPACE.lg, gap: SPACE.sm }}
                renderItem={({ item: s }) => (
                  <WatchlistCard
                    stock={s}
                    live={prices[s.ticker]}
                    onPress={() => router.push(`/stocks/${s.ticker}`)}
                  />
                )}
              />
            )}
          </View>

          {/* ─── 4. Top Movers ───────────────────────────── */}
          {!loadingStocks && (topGainers.length > 0 || topLosers.length > 0) && (
            <View style={{ paddingHorizontal: SPACE.lg }}>
              <SectionHdr
                title="الأكثر تحركاً"
                icon={BarChart2}
                action={{ label: 'السوق', onPress: () => router.push('/market') }}
              />
              {topGainers.length > 0 && (
                <View style={{ marginBottom: SPACE.md }}>
                  <Text style={{ color: GREEN, fontSize: FONT.xs, fontWeight: WEIGHT.semibold, marginBottom: SPACE.sm }}>الصاعدة</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACE.sm }}>
                    {topGainers.map((s) => (
                      <MoverChip key={s.ticker} s={s} onPress={() => router.push(`/stocks/${s.ticker}`)} />
                    ))}
                  </ScrollView>
                </View>
              )}
              {topLosers.length > 0 && (
                <View>
                  <Text style={{ color: RED, fontSize: FONT.xs, fontWeight: WEIGHT.semibold, marginBottom: SPACE.sm }}>الهابطة</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACE.sm }}>
                    {topLosers.map((s) => (
                      <MoverChip key={s.ticker} s={s} onPress={() => router.push(`/stocks/${s.ticker}`)} />
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* ─── 5. News preview ────────────────────────── */}
          {news.length > 0 && (
            <View style={{ paddingHorizontal: SPACE.lg }}>
              <SectionHdr title="آخر الأخبار" icon={Newspaper} />
              <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.xl, overflow: 'hidden' }}>
                {news.slice(0, 3).map((item, i) => (
                  <View
                    key={item.id}
                    style={{
                      paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
                      borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: FONT.sm, lineHeight: 20 }} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: FONT.xs, marginTop: 4 }}>
                      {item.source} · {new Date(item.publishedAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
