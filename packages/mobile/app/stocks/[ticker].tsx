import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl,
  ActivityIndicator, Alert, Linking, TextInput, Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, ChevronRight, Star, StarOff, TrendingUp, TrendingDown,
  Brain, BarChart2, Briefcase, ExternalLink, Info, Bell, BellOff, Lock,
} from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useLivePrices } from '../../hooks/useLivePrices';
import { usePortfolioData } from '../../hooks/useMarketData';
import { getStockName, getStockInfo } from '../../lib/egxStocks';
import apiClient from '../../lib/api/client';
import { StockHistoryChart } from '../../components/features/stocks/StockHistoryChart';
import { useStockHistory } from '../../hooks/useStockHistory';
import {
  BRAND, BRAND_BG_STRONG, BRAND_LIGHT,
  FONT, WEIGHT, RADIUS, SPACE,
  GREEN, RED,
} from '../../lib/theme';
import type { Stock } from '../../types/stock';

// ─── helpers ────────────────────────────────────────────────────────────────

function n(v: number, d = 2) {
  return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function isPaidPlan(plan?: string) {
  return plan === 'pro' || plan === 'yearly' || plan === 'ultra' || plan === 'ultra_yearly';
}

// ─── StatRow ────────────────────────────────────────────────────────────────

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: SPACE.sm + 2,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    }}>
      <Text style={{ color: colors.textSub, fontSize: FONT.sm }}>{label}</Text>
      <Text style={{ color: valueColor ?? colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.semibold, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

// ─── PriceAlertModal ─────────────────────────────────────────────────────────

interface PriceAlertModalProps {
  visible: boolean;
  onClose: () => void;
  ticker: string;
  currentPrice: number;
  currentTargetPrice: number | null;
  isPro: boolean;
  onSave: (targetPrice: number | null, direction: 'UP' | 'DOWN') => Promise<void>;
}

function PriceAlertModal({
  visible, onClose, ticker, currentPrice, currentTargetPrice, isPro, onSave,
}: PriceAlertModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setInput(currentTargetPrice != null ? String(currentTargetPrice) : '');
    }
  }, [visible, currentTargetPrice]);

  const targetPrice = parseFloat(input);
  const isValid = !isNaN(targetPrice) && targetPrice > 0;
  const isSameAsCurrent = isValid && Math.abs(targetPrice - currentPrice) < 0.001;
  const direction: 'UP' | 'DOWN' = isValid && targetPrice < currentPrice ? 'DOWN' : 'UP';

  const handleSave = async () => {
    if (!isValid || isSameAsCurrent) return;
    setSaving(true);
    try {
      await onSave(targetPrice, direction);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await onSave(null, 'UP');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={onClose} />
      <View style={{
        backgroundColor: colors.card,
        borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'],
        borderTopWidth: 1, borderColor: colors.border,
        padding: SPACE.xl, gap: SPACE.lg,
      }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
            <Bell size={18} color={BRAND} />
            <Text style={{ color: colors.text, fontSize: FONT.base, fontWeight: WEIGHT.bold }}>
              {t('stockDetail.priceAlert')} — {ticker}
            </Text>
          </View>
          <Pressable onPress={onClose}>
            <Text style={{ color: colors.textSub, fontSize: FONT.lg }}>✕</Text>
          </Pressable>
        </View>

        {!isPro ? (
          /* Pro gate */
          <View style={{ alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.lg }}>
            <Lock size={32} color={BRAND} />
            <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.semibold, textAlign: 'center' }}>
              {t('stockDetail.priceAlertProOnly')}
            </Text>
            <Text style={{ color: colors.textSub, fontSize: FONT.xs, textAlign: 'center' }}>
              {t('stockDetail.priceAlertProHint')}
            </Text>
          </View>
        ) : (
          <>
            {/* Current price reference */}
            <Text style={{ color: colors.textMuted, fontSize: FONT.xs }}>
              {t('stockDetail.currentPrice')}:{' '}
              <Text style={{ color: colors.text, fontWeight: WEIGHT.semibold }}>
                {n(currentPrice)} EGP
              </Text>
            </Text>

            {/* Price input */}
            <View style={{ gap: SPACE.xs }}>
              <Text style={{ color: colors.textSub, fontSize: FONT.sm }}>{t('stockDetail.targetPrice')}</Text>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={n(currentPrice)}
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={{
                  color: colors.text,
                  backgroundColor: colors.bg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: RADIUS.lg,
                  paddingHorizontal: SPACE.md,
                  paddingVertical: SPACE.sm + 2,
                  fontSize: FONT.sm,
                }}
              />
            </View>

            {/* Direction indicator */}
            {isValid && !isSameAsCurrent && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.xs }}>
                {direction === 'UP'
                  ? <TrendingUp size={14} color={GREEN} />
                  : <TrendingDown size={14} color={RED} />}
                <Text style={{ color: direction === 'UP' ? GREEN : RED, fontSize: FONT.xs, fontWeight: WEIGHT.medium }}>
                  {direction === 'UP' ? t('stockDetail.alertWhenRises') : t('stockDetail.alertWhenFalls')} {n(targetPrice)} EGP
                </Text>
              </View>
            )}

            {isSameAsCurrent && (
              <Text style={{ color: '#f59e0b', fontSize: FONT.xs }}>
                {t('stockDetail.targetSameAsCurrent')}
              </Text>
            )}

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
              <Pressable
                onPress={handleSave}
                disabled={saving || !isValid || isSameAsCurrent}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: SPACE.xs, backgroundColor: BRAND, borderRadius: RADIUS.lg,
                  paddingVertical: SPACE.md, opacity: (saving || !isValid || isSameAsCurrent) ? 0.5 : 1,
                }}
              >
                <Bell size={16} color="#fff" />
                <Text style={{ color: '#fff', fontSize: FONT.sm, fontWeight: WEIGHT.semibold }}>
                  {saving ? t('stockDetail.saving') : t('stockDetail.saveAlert')}
                </Text>
              </Pressable>

              {currentTargetPrice != null && (
                <Pressable
                  onPress={handleDelete}
                  disabled={saving}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    gap: SPACE.xs, borderWidth: 1, borderColor: RED, borderRadius: RADIUS.lg,
                    paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, opacity: saving ? 0.5 : 1,
                  }}
                >
                  <BellOff size={16} color={RED} />
                </Pressable>
              )}
            </View>
          </>
        )}
        <View style={{ height: SPACE.xl }} />
      </View>
    </Modal>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function StockDetailPage() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const router     = useRouter();
  const insets     = useSafeAreaInsets();
  const { colors, isRTL } = useTheme();
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const user       = useAuthStore((s) => s.user);

  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  // ─── stock data ─────────────────────────────────────────────
  const [stock,       setStock]       = useState<Stock | null>(null);
  const [loadingStock, setLoadingStock] = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  // ─── watchlist ───────────────────────────────────────────────
  const [inWatchlist,      setInWatchlist]      = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  // Price alert
  const [targetPrice,      setTargetPrice]      = useState<number | null>(null);
  const [showAlertModal,   setShowAlertModal]   = useState(false);

  // ─── news ────────────────────────────────────────────────────
  const [news, setNews] = useState<{ id: string; title: string; publishedAt: string; source: string; url: string }[]>([]);

  // ─── live price ─────────────────────────────────────────────
  const { prices } = useLivePrices(ticker ? [ticker] : []);
  const livePrice  = ticker ? prices[ticker] : undefined;
  const { history, range, changeRange, loadingHistory } = useStockHistory(ticker);

  // ─── portfolio ───────────────────────────────────────────────
  const { holdings } = usePortfolioData();
  const myHolding    = useMemo(
    () => holdings.filter((h) => h.ticker === ticker),
    [holdings, ticker],
  );
  const totalShares    = myHolding.reduce((s, h) => s + h.shares, 0);
  const avgPrice       = myHolding.length > 0
    ? myHolding.reduce((s, h) => s + h.avgPrice * h.shares, 0) / totalShares
    : 0;

  // ─── enriched values ─────────────────────────────────────────
  const price         = livePrice?.price         ?? stock?.price         ?? 0;
  const changePercent = livePrice?.changePercent  ?? stock?.changePercent ?? 0;
  const change        = livePrice?.change         ?? stock?.change        ?? 0;
  const isUp          = changePercent >= 0;
  const gainColor     = changePercent === 0 ? colors.textSub : isUp ? GREEN : RED;

  const positionValue   = price * totalShares;
  const positionGain    = (price - avgPrice) * totalShares;
  const positionGainPct = avgPrice > 0 ? ((price - avgPrice) / avgPrice) * 100 : 0;

  // ─── stock info (static EGX data) ───────────────────────────
  const info = ticker ? getStockInfo(ticker) : null;

  const isPro = isPaidPlan(user?.plan);

  // ─── fetch ───────────────────────────────────────────────────
  const loadStock = useCallback(async () => {
    if (!ticker) return;
    try {
      const res = await apiClient.get<Stock[]>('/api/stocks/prices');
      const list = Array.isArray(res.data) ? res.data : [];
      const found = list.find((s) => s.ticker === ticker) ?? null;
      setStock(found);
    } catch {
      setStock(null);
    } finally {
      setLoadingStock(false);
    }
  }, [ticker]);

  const loadWatchlistStatus = useCallback(async () => {
    if (!ticker) return;
    try {
      const res = await apiClient.get<{ items?: { ticker: string; targetPrice?: number | null }[] }>('/api/watchlist');
      const items = (res.data as { items?: { ticker: string; targetPrice?: number | null }[] })?.items
        ?? (Array.isArray(res.data) ? res.data : []) as { ticker: string; targetPrice?: number | null }[];
      const found = items.find((i) => i.ticker === ticker);
      setInWatchlist(!!found);
      setTargetPrice(found?.targetPrice ?? null);
    } catch {
      setInWatchlist(false);
      setTargetPrice(null);
    }
  }, [ticker]);

  const loadNews = useCallback(async () => {
    if (!ticker) return;
    try {
      const res = await apiClient.get<unknown[]>(`/api/news/stock/${ticker}`);
      const arr = Array.isArray(res.data) ? res.data : [];
      setNews(arr.slice(0, 3) as typeof news);
    } catch {
      setNews([]);
    }
  }, [ticker]);

  const load = useCallback(async () => {
    await Promise.all([loadStock(), loadWatchlistStatus(), loadNews()]);
  }, [loadStock, loadWatchlistStatus, loadNews]);

  useEffect(() => { void load(); }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // ─── watchlist toggle ────────────────────────────────────────
  const toggleWatchlist = useCallback(async () => {
    if (!ticker || watchlistLoading) return;
    setWatchlistLoading(true);
    try {
      if (inWatchlist) {
        await apiClient.delete(`/api/watchlist/${ticker}`);
        setInWatchlist(false);
        setTargetPrice(null);
      } else {
        await apiClient.post('/api/watchlist', { ticker });
        setInWatchlist(true);
      }
    } catch {
      Alert.alert(t('stockDetail.errorTitle'), t('stockDetail.errorWatchlist'));
    } finally {
      setWatchlistLoading(false);
    }
  }, [ticker, inWatchlist, watchlistLoading]);

  // ─── save price alert ────────────────────────────────────────
  const savePriceAlert = useCallback(async (newTargetPrice: number | null, direction: 'UP' | 'DOWN') => {
    if (!ticker) return;
    try {
      // Add to watchlist first if not already in it
      if (!inWatchlist) {
        await apiClient.post('/api/watchlist', { ticker });
        setInWatchlist(true);
      }
      await apiClient.put(`/api/watchlist/${ticker}`, {
        targetPrice: newTargetPrice,
        targetDirection: newTargetPrice != null ? direction : null,
      });
      setTargetPrice(newTargetPrice);
    } catch {
      Alert.alert(t('stockDetail.errorTitle'), t('stockDetail.errorSaveAlert'));
      throw new Error('save failed');
    }
  }, [ticker, inWatchlist]);

  // ─── loading state ───────────────────────────────────────────
  if (loadingStock) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={BRAND} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!stock && !livePrice) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACE.md }}>
          <Text style={{ color: colors.textMuted, fontSize: FONT.base }}>{t('stockDetail.notFound')}</Text>
          <Pressable onPress={() => router.back()} style={{ paddingVertical: SPACE.sm, paddingHorizontal: SPACE.lg }}>
            <Text style={{ color: BRAND, fontSize: FONT.sm, fontWeight: WEIGHT.semibold }}>{t('stockDetail.back')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const nameAr = getStockName(ticker ?? '', 'ar');
  const nameEn = getStockName(ticker ?? '', 'en');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>

      {/* ─── Sticky header ─────────────────────────────────── */}
      <View style={{
        flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
        >
          <BackIcon size={18} color={colors.text} />
        </Pressable>

        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: FONT.base, fontWeight: WEIGHT.bold }}>{ticker}</Text>
          <Text style={{ color: colors.textMuted, fontSize: FONT.xs }} numberOfLines={1}>{getStockName(ticker ?? '', lang)}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
          {/* Price Alert button — only for logged-in users */}
          {user && (
            <Pressable
              onPress={() => setShowAlertModal(true)}
              style={{
                width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
                borderRadius: RADIUS.md,
                backgroundColor: targetPrice != null ? '#f59e0b18' : colors.card,
                borderWidth: 1,
                borderColor: targetPrice != null ? '#f59e0b' : colors.border,
              }}
            >
              {targetPrice != null
                ? <Bell size={18} color="#f59e0b" fill="#f59e0b" />
                : <Bell size={18} color={colors.textSub} />
              }
            </Pressable>
          )}

          {/* Watchlist button */}
          <Pressable
            onPress={toggleWatchlist}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md, backgroundColor: inWatchlist ? BRAND_BG_STRONG : colors.card, borderWidth: 1, borderColor: inWatchlist ? BRAND : colors.border }}
          >
            {watchlistLoading
              ? <ActivityIndicator size="small" color={BRAND} />
              : inWatchlist
                ? <Star    size={18} color={BRAND} fill={BRAND} />
                : <StarOff size={18} color={colors.textSub} />
            }
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, SPACE['3xl']) + 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BRAND} colors={[BRAND]} />
        }
      >
        {/* ─── Price hero ──────────────────────────────────── */}
        <View style={{ paddingHorizontal: SPACE.lg, paddingTop: SPACE.xl, paddingBottom: SPACE.lg }}>
          <Text style={{ color: colors.textMuted, fontSize: FONT.xs, marginBottom: SPACE.xs }}>{nameEn}</Text>
          <Text style={{ color: colors.text, fontSize: FONT['4xl'], fontWeight: WEIGHT.extrabold, fontVariant: ['tabular-nums'] }}>
            {n(price)}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: FONT.xs, marginBottom: SPACE.sm }}>EGP</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: SPACE.xs,
              paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs,
              borderRadius: RADIUS.full, backgroundColor: isUp ? '#4ade8018' : '#f8717118',
            }}>
              {isUp
                ? <TrendingUp   size={14} color={gainColor} />
                : <TrendingDown size={14} color={gainColor} />
              }
              <Text style={{ color: gainColor, fontSize: FONT.sm, fontWeight: WEIGHT.bold, fontVariant: ['tabular-nums'] }}>
                {isUp ? '+' : ''}{n(change)} ({isUp ? '+' : ''}{changePercent.toFixed(2)}%)
              </Text>
            </View>
            {stock?.isDelayed && (
              <Text style={{ color: colors.textMuted, fontSize: FONT.xs }}>{t('stockDetail.delayed')}</Text>
            )}
          </View>

          {/* Active price alert banner */}
          {targetPrice != null && (
            <Pressable
              onPress={() => setShowAlertModal(true)}
              style={{
                marginTop: SPACE.md,
                flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
                backgroundColor: '#f59e0b15',
                borderWidth: 1, borderColor: '#f59e0b40',
                borderRadius: RADIUS.lg,
                paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm,
              }}
            >
              <Bell size={13} color="#f59e0b" />
              <Text style={{ color: '#f59e0b', fontSize: FONT.xs, fontWeight: WEIGHT.medium }}>
                {t('stockDetail.activeAlert')} {n(targetPrice)} EGP
              </Text>
              <Text style={{ color: '#f59e0b80', fontSize: FONT.xs, marginStart: 'auto' }}>{t('stockDetail.edit')}</Text>
            </Pressable>
          )}
        </View>

        <View style={{ paddingHorizontal: SPACE.lg, gap: SPACE.md }}>

          {/* ─── Price chart ─────────────────────────────── */}
          <StockHistoryChart
            history={history}
            range={range}
            onRangeChange={changeRange}
            loading={loadingHistory}
            changePercent={changePercent}
          />

          {/* ─── My Position ────────────────────────────── */}
          {totalShares > 0 && (
            <View style={{
              backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
              borderRadius: RADIUS.xl, overflow: 'hidden',
            }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
                paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
                borderBottomWidth: 1, borderBottomColor: colors.border,
              }}>
                <View style={{ width: 28, height: 28, borderRadius: RADIUS.sm, backgroundColor: BRAND_BG_STRONG, alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={13} color={BRAND} />
                </View>
                <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>{t('stockDetail.myPosition')}</Text>
              </View>

              <View style={{ flexDirection: 'row' }}>
                {[
                  { label: t('stockDetail.shares'),       value: String(totalShares) },
                  { label: t('stockDetail.avgBuy'),        value: `${n(avgPrice)} EGP` },
                  { label: t('stockDetail.currentValue'),  value: `${n(positionValue)} EGP` },
                ].map((s, i, arr) => (
                  <View
                    key={s.label}
                    style={{
                      flex: 1, alignItems: 'center', paddingVertical: SPACE.md,
                      borderRightWidth: i < arr.length - 1 ? 1 : 0,
                      borderRightColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold, fontVariant: ['tabular-nums'] }}>
                      {s.value}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>{s.label}</Text>
                  </View>
                ))}
              </View>

              <View style={{
                borderTopWidth: 1, borderTopColor: colors.border,
                paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <Text style={{ color: colors.textSub, fontSize: FONT.sm }}>{t('stockDetail.gainLoss')}</Text>
                <Text style={{
                  fontSize: FONT.sm, fontWeight: WEIGHT.bold, fontVariant: ['tabular-nums'],
                  color: positionGain >= 0 ? GREEN : RED,
                }}>
                  {positionGain >= 0 ? '+' : ''}{n(positionGain)} EGP ({positionGainPct.toFixed(2)}%)
                </Text>
              </View>
            </View>
          )}

          {/* ─── AI Analysis card ───────────────────────── */}
          {user && (
            <Pressable
              onPress={() => router.push({ pathname: '/ai/analyze', params: { ticker } } as never)}
              style={({ pressed }) => ({
                backgroundColor: BRAND_BG_STRONG, borderWidth: 1, borderColor: BRAND + '40',
                borderRadius: RADIUS.xl, padding: SPACE.lg, opacity: pressed ? 0.85 : 1,
                flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
              })}
            >
              <View style={{ width: 44, height: 44, borderRadius: RADIUS.lg, backgroundColor: BRAND + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Brain size={20} color={BRAND} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>
                  {t('stockDetail.aiAnalysis')}
                </Text>
                <Text style={{ color: BRAND_LIGHT, fontSize: FONT.xs, marginTop: 2 }}>
                  {t('stockDetail.aiAnalysisHint')} {ticker}
                </Text>
              </View>
              <ChevronLeft size={16} color={BRAND} style={{ transform: [{ scaleX: isRTL ? 1 : -1 }] }} />
            </Pressable>
          )}

          {/* ─── Stats card ─────────────────────────────── */}
          <View style={{
            backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
            borderRadius: RADIUS.xl, overflow: 'hidden',
          }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
              paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
              borderBottomWidth: 1, borderBottomColor: colors.border,
            }}>
              <View style={{ width: 28, height: 28, borderRadius: RADIUS.sm, backgroundColor: '#3b82f618', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart2 size={13} color="#3b82f6" />
              </View>
              <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>{t('stockDetail.stockData')}</Text>
            </View>
            <View style={{ paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm }}>
              {stock?.open          !== undefined && <StatRow label={t('stockDetail.open')}      value={`${n(stock.open)} EGP`} />}
              {stock?.previousClose !== undefined && <StatRow label={t('stockDetail.prevClose')}  value={`${n(stock.previousClose)} EGP`} />}
              {stock?.high          !== undefined && <StatRow label={t('stockDetail.high')}       value={`${n(stock.high)} EGP`} />}
              {stock?.low           !== undefined && <StatRow label={t('stockDetail.low')}        value={`${n(stock.low)} EGP`} />}
              {stock?.volume        !== undefined && stock.volume > 0 && (
                <StatRow label={t('stockDetail.volume')} value={n(stock.volume, 0)} />
              )}
              {stock?.marketCap     !== undefined && stock.marketCap > 0 && (
                <StatRow
                  label={t('stockDetail.marketCap')}
                  value={`${(stock.marketCap / 1_000_000_000).toFixed(2)} ${t('stockDetail.billion')} EGP`}
                />
              )}
              {/* Remove last border */}
              <View style={{ height: SPACE.sm }} />
            </View>
          </View>

          {/* ─── Company info ───────────────────────────── */}
          {(info ?? stock?.description) && (
            <View style={{
              backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
              borderRadius: RADIUS.xl, overflow: 'hidden',
            }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
                paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
                borderBottomWidth: 1, borderBottomColor: colors.border,
              }}>
                <View style={{ width: 28, height: 28, borderRadius: RADIUS.sm, backgroundColor: '#f59e0b18', alignItems: 'center', justifyContent: 'center' }}>
                  <Info size={13} color="#f59e0b" />
                </View>
                <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>{t('stockDetail.aboutCompany')}</Text>
              </View>
              <View style={{ paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, gap: SPACE.sm }}>
                {stock?.sector && (
                  <View style={{ flexDirection: 'row', gap: SPACE.sm, alignItems: 'center' }}>
                    <Text style={{ color: colors.textSub, fontSize: FONT.sm }}>{t('stockDetail.sector')}:</Text>
                    <View style={{ backgroundColor: BRAND_BG_STRONG, paddingHorizontal: SPACE.sm, paddingVertical: 2, borderRadius: RADIUS.sm }}>
                      <Text style={{ color: BRAND, fontSize: FONT.xs, fontWeight: WEIGHT.semibold }}>{stock.sector}</Text>
                    </View>
                  </View>
                )}
                {(info?.descriptionAr ?? info?.descriptionEn ?? stock?.description) ? (
                  <Text style={{ color: colors.textSub, fontSize: FONT.sm, lineHeight: 22 }}>
                    {lang === 'ar'
                    ? (info?.descriptionAr ?? info?.descriptionEn ?? stock?.description)
                    : (info?.descriptionEn ?? info?.descriptionAr ?? stock?.description)}
                  </Text>
                ) : null}
              </View>
            </View>
          )}

          {/* ─── Related news ───────────────────────────── */}
          {news.length > 0 && (
            <View style={{
              backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
              borderRadius: RADIUS.xl, overflow: 'hidden',
            }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
                borderBottomWidth: 1, borderBottomColor: colors.border,
              }}>
                <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>{t('stockDetail.relatedNews')}</Text>
              </View>
              {news.map((item, i) => (
                <View
                  key={item.id}
                  style={{
                    paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
                    borderBottomWidth: i < news.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: FONT.sm, lineHeight: 20 }} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: FONT.xs, marginTop: 4 }}>
                    {new Date(item.publishedAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              ))}
            </View>
          )}

        </View>
      </ScrollView>

      {/* Price Alert Modal */}
      <PriceAlertModal
        visible={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        ticker={ticker ?? ''}
        currentPrice={price}
        currentTargetPrice={targetPrice}
        isPro={isPro}
        onSave={savePriceAlert}
      />
    </SafeAreaView>
  );
}
