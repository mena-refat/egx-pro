import { useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, RefreshControl,
  Pressable, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Briefcase, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../hooks/useTheme';
import { useLivePrices } from '../../hooks/useLivePrices';
import { usePortfolioData } from '../../hooks/useMarketData';
import { Skeleton } from '../../components/ui/Skeleton';
import apiClient from '../../lib/api/client';
import { getStockName } from '../../lib/egxStocks';
import {
  BRAND, BRAND_BG_STRONG, BRAND_LIGHT,
  FONT, WEIGHT, RADIUS, SPACE,
  GREEN, RED,
} from '../../lib/theme';

function n(v: number, d = 0) {
  return v.toLocaleString('en-US', { maximumFractionDigits: d });
}

// ─── SectionHdr ─────────────────────────────────────────────────
function SectionHdr({ title, icon: Icon, action }: { title: string; icon?: React.ComponentType<{ size: number; color: string }>; action?: { label: string; onPress: () => void } }) {
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

// ─── PortfolioPage ───────────────────────────────────────────────
export default function PortfolioPage() {
  const router   = useRouter();
  const { colors, isDark, isRTL } = useTheme();
  const { holdings, summary, loading, refreshing, refresh } = usePortfolioData();

  const holdingTickers  = useMemo(() => holdings.map((h) => h.ticker), [holdings]);
  const { prices }      = useLivePrices(holdingTickers);

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  // Live-enriched holdings
  const enrichedHoldings = useMemo(() =>
    holdings.map((h) => {
      const live     = prices[h.ticker];
      const price    = live?.price        ?? h.currentPrice ?? h.avgPrice;
      const chgPct   = live?.changePercent ?? 0;
      const curValue = price * h.shares;
      const gain     = (price - h.avgPrice) * h.shares;
      const gainPct  = h.avgPrice > 0 ? ((price - h.avgPrice) / h.avgPrice) * 100 : 0;
      return { ...h, price, chgPct, curValue, gain, gainPct };
    }),
    [holdings, prices],
  );

  const liveSummary = useMemo(() => {
    if (enrichedHoldings.length === 0) return summary;
    const totalValue   = enrichedHoldings.reduce((s, h) => s + h.curValue, 0);
    const totalCost    = enrichedHoldings.reduce((s, h) => s + h.avgPrice * h.shares, 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    return { totalValue, totalCost, totalGainLoss, totalGainLossPercent };
  }, [enrichedHoldings, summary]);

  const isPositive = liveSummary.totalGainLoss >= 0;

  const handleDeleteGroup = useCallback((ids: string[], ticker: string) => {
    Alert.alert('حذف السهم', `حذف جميع مراكز ${ticker} من المحفظة؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive',
        onPress: async () => {
          try {
            await Promise.all(ids.map((id) => apiClient.delete(`/api/portfolio/${id}`)));
            void refresh();
          } catch { /* silent */ }
        },
      },
    ]);
  }, [refresh]);


  return (
    <ScreenWrapper padded={false} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 56 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BRAND} colors={[BRAND]} />
        }
      >
        {/* ─── Page header ────────────────────────── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: SPACE.lg, paddingTop: 18, paddingBottom: 14,
          borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: WEIGHT.extrabold }}>محفظتي</Text>
          <Pressable
            onPress={() => router.push('/market')}
            style={{
              backgroundColor: BRAND, flexDirection: 'row', alignItems: 'center',
              gap: SPACE.sm, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm + 2,
              borderRadius: RADIUS.md,
            }}
          >
            <Plus size={14} color="#fff" strokeWidth={2.5} />
            <Text style={{ color: '#fff', fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>إضافة سهم</Text>
          </Pressable>
        </View>

        <View style={{ paddingTop: SPACE.lg, gap: SPACE.xl }}>

          {/* ─── 1. Gradient Summary Card ──────────── */}
          <View style={{ paddingHorizontal: SPACE.lg }}>
            <LinearGradient
              colors={isDark
                ? ['#1e1040', '#1a0d35', '#110826']
                : ['#7c3aed', '#6d28d9', '#5b21b6']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ borderRadius: RADIUS['2xl'], padding: SPACE.xl, borderWidth: 1, borderColor: BRAND + '30' }}
            >
              {loading ? (
                <View style={{ gap: SPACE.sm }}>
                  <Skeleton.Line width={120} height={14} />
                  <Skeleton.Line width={200} height={36} />
                  <Skeleton.Line width={160} height={18} />
                </View>
              ) : (
                <>
                  <Text style={{ color: BRAND_LIGHT, fontSize: FONT.xs, marginBottom: SPACE.xs }}>القيمة الإجمالية</Text>
                  <Text style={{ color: '#fff', fontSize: FONT['3xl'], fontWeight: WEIGHT.extrabold, fontVariant: ['tabular-nums'] }}>
                    {n(liveSummary.totalValue)} EGP
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: SPACE.sm }}>
                    <View style={{
                      paddingHorizontal: SPACE.sm, paddingVertical: 3, borderRadius: RADIUS.full,
                      backgroundColor: isPositive ? '#4ade8025' : '#f8717125',
                    }}>
                      <Text style={{
                        color: isPositive ? GREEN : RED,
                        fontSize: FONT.sm, fontWeight: WEIGHT.bold, fontVariant: ['tabular-nums'],
                      }}>
                        {isPositive ? '+' : ''}{n(liveSummary.totalGainLoss)} EGP ({liveSummary.totalGainLossPercent.toFixed(2)}%)
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: SPACE.xl, marginTop: SPACE.lg, borderTopWidth: 1, borderTopColor: BRAND + '25', paddingTop: SPACE.md }}>
                    <View>
                      <Text style={{ color: BRAND_LIGHT, fontSize: FONT.xs }}>التكلفة الأصلية</Text>
                      <Text style={{ color: '#e2d9f3', fontSize: FONT.sm, fontWeight: WEIGHT.semibold, marginTop: 2, fontVariant: ['tabular-nums'] }}>
                        {n(liveSummary.totalCost)} EGP
                      </Text>
                    </View>
                    <View>
                      <Text style={{ color: BRAND_LIGHT, fontSize: FONT.xs }}>عدد الأسهم</Text>
                      <Text style={{ color: '#e2d9f3', fontSize: FONT.sm, fontWeight: WEIGHT.semibold, marginTop: 2 }}>
                        {enrichedHoldings.length}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </LinearGradient>
          </View>

          {/* ─── 2. Holdings list ──────────────────── */}
          <View style={{ paddingHorizontal: SPACE.lg }}>
            <SectionHdr title="ممتلكاتي" icon={Briefcase} />
            <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.xl, overflow: 'hidden' }}>
              {loading ? (
                <View style={{ padding: SPACE.md, gap: 2 }}>
                  {[1,2,3].map((i) => <Skeleton.Box key={i} height={68} radius={RADIUS.md} />)}
                </View>
              ) : enrichedHoldings.length === 0 ? (
                <Pressable onPress={() => router.push('/market')} style={{ paddingVertical: 40, alignItems: 'center', gap: SPACE.sm }}>
                  <Text style={{ color: colors.textMuted, fontSize: FONT.sm }}>المحفظة فارغة</Text>
                  <Text style={{ color: BRAND, fontSize: FONT.xs, fontWeight: WEIGHT.semibold }}>ابدأ بالاستثمار الآن</Text>
                </Pressable>
              ) : (
                enrichedHoldings.map((h, i) => {
                  const isLast = i === enrichedHoldings.length - 1;
                  return (
                    <Pressable
                      key={h.ticker}
                      onPress={() => router.push(`/stocks/${h.ticker}`)}
                      onLongPress={() => handleDeleteGroup(h.ids, h.ticker)}
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? colors.hover : 'transparent',
                        borderBottomWidth: isLast ? 0 : 1, borderBottomColor: colors.border,
                        paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
                        flexDirection: 'row', alignItems: 'center',
                      })}
                    >
                      <View style={{
                        width: 42, height: 42, borderRadius: RADIUS.md,
                        backgroundColor: BRAND_BG_STRONG, borderWidth: 1, borderColor: BRAND + '28',
                        alignItems: 'center', justifyContent: 'center', marginEnd: SPACE.md, flexShrink: 0,
                      }}>
                        <Text style={{ color: BRAND, fontSize: 8, fontWeight: WEIGHT.extrabold }} numberOfLines={1}>
                          {h.ticker.slice(0, 4)}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>{h.ticker}</Text>
                        <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                          {getStockName(h.ticker, 'ar')} · {h.shares} سهم
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 1, fontVariant: ['tabular-nums'] }}>
                          متوسط {h.avgPrice.toFixed(2)} EGP
                        </Text>
                      </View>
                      <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', flexShrink: 0 }}>
                        <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold, fontVariant: ['tabular-nums'] }}>
                          {n(h.curValue)} EGP
                        </Text>
                        <View style={{
                          marginTop: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 7,
                          backgroundColor: h.gainPct > 0 ? '#4ade8018' : h.gainPct < 0 ? '#f8717118' : colors.hover,
                        }}>
                          <Text style={{
                            fontSize: 11, fontWeight: WEIGHT.bold, fontVariant: ['tabular-nums'],
                            color: h.gainPct > 0 ? GREEN : h.gainPct < 0 ? RED : colors.textMuted,
                          }}>
                            {h.gainPct >= 0 ? '+' : ''}{h.gainPct.toFixed(2)}%
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>

          {/* ─── 3. Performance breakdown ──────────── */}
          {enrichedHoldings.length > 0 && (
            <View style={{ paddingHorizontal: SPACE.lg }}>
              <SectionHdr title="أداء المحفظة" icon={TrendingUp} />
              <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.xl, overflow: 'hidden' }}>
                {enrichedHoldings.map((h, i) => {
                  const weight   = liveSummary.totalValue > 0 ? (h.curValue / liveSummary.totalValue) * 100 : 0;
                  const barColor = h.gainPct > 0 ? GREEN : h.gainPct < 0 ? RED : colors.textMuted;
                  const isLast   = i === enrichedHoldings.length - 1;
                  return (
                    <Pressable
                      key={h.ticker}
                      onPress={() => router.push(`/stocks/${h.ticker}`)}
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? colors.hover : 'transparent',
                        borderBottomWidth: isLast ? 0 : 1, borderBottomColor: colors.border,
                        paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
                      })}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.sm }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
                          <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>{h.ticker}</Text>
                          <Text style={{ color: colors.textMuted, fontSize: 11 }}>{weight.toFixed(1)}%</Text>
                        </View>
                        <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                          <Text style={{ fontSize: FONT.xs, fontWeight: WEIGHT.bold, fontVariant: ['tabular-nums'], color: barColor }}>
                            {h.gainPct >= 0 ? '+' : ''}{h.gainPct.toFixed(2)}%
                          </Text>
                          <Text style={{ color: colors.textMuted, fontSize: 11, fontVariant: ['tabular-nums'], marginTop: 1 }}>
                            {h.gain >= 0 ? '+' : ''}{n(h.gain)} EGP
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

        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
