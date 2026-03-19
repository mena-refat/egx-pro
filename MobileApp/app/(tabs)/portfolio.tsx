import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, RefreshControl, Pressable,
  Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, I18nManager, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Plus, ChevronLeft, ChevronRight, Target, Star, Trash2,
  Search, X, TrendingUp, TrendingDown, Minus,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { PortfolioHero } from '../../components/features/dashboard/PortfolioHero';
import { WatchlistRow } from '../../components/features/dashboard/WatchlistRow';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import { useLivePrices } from '../../hooks/useLivePrices';
import { usePortfolioData } from '../../hooks/useMarketData';
import { EGX_STOCKS, getStockName } from '../../lib/egxStocks';
import apiClient from '../../lib/api/client';
import type { Stock } from '../../types/stock';

// ─────────────────────── helpers ───────────────────────
const today = () => new Date().toISOString().slice(0, 10);

// ─────────────────────── TickerSearch ───────────────────────
function TickerSearch({
  value, onChange, disabled, colors,
}: {
  value: string;
  onChange: (ticker: string, name: string) => void;
  disabled?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);

  useEffect(() => { setText(value); }, [value]);

  const suggestions = useMemo(() => {
    const q = text.trim().toUpperCase();
    if (!q || q.length < 1) return [];
    return EGX_STOCKS.filter(
      (s) => s.ticker.startsWith(q) || s.nameAr.includes(text.trim()) || s.nameEn.toUpperCase().includes(q),
    ).slice(0, 7);
  }, [text]);

  return (
    <View style={{ zIndex: 10 }}>
      <View style={{
        backgroundColor: colors.bg,
        borderColor: open && suggestions.length > 0 ? '#8b5cf6' : colors.border,
        borderWidth: 1, borderRadius: 12,
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, gap: 8,
      }}>
        <Search size={15} color={colors.textMuted} />
        <TextInput
          value={text}
          onChangeText={(t) => { setText(t); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="ابحث برمز السهم (مثال: COMI)"
          placeholderTextColor={colors.textMuted}
          style={{ flex: 1, color: colors.text, paddingVertical: 12, fontSize: 14 }}
          autoCapitalize="characters"
          editable={!disabled}
        />
        {text.length > 0 && (
          <Pressable onPress={() => { setText(''); onChange('', ''); setOpen(false); }} hitSlop={8}>
            <X size={14} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {open && suggestions.length > 0 && (
        <View style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          backgroundColor: colors.card, borderColor: colors.border,
          borderWidth: 1, borderRadius: 12, marginTop: 4,
          overflow: 'hidden', zIndex: 999,
        }}>
          {suggestions.map((s, i) => (
            <Pressable
              key={s.ticker}
              onPress={() => { setText(s.ticker); onChange(s.ticker, s.nameAr); setOpen(false); }}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.hover : 'transparent',
                borderBottomWidth: i < suggestions.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
                paddingHorizontal: 14, paddingVertical: 11,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{
                  backgroundColor: '#8b5cf615', width: 32, height: 32,
                  borderRadius: 8, alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ color: '#8b5cf6', fontSize: 10, fontWeight: '700' }}>{s.ticker.slice(0, 4)}</Text>
                </View>
                <View>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{s.ticker}</Text>
                  <Text style={{ color: colors.textSub, fontSize: 11 }} numberOfLines={1}>{s.nameAr}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ─────────────────────── AddHoldingModal ───────────────────────
function AddHoldingModal({
  visible, onClose, onAdded, colors,
}: {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [ticker, setTicker] = useState('');
  const [stockName, setStockName] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [buyDate, setBuyDate] = useState(today());
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTicker(''); setStockName(''); setShares(''); setPrice(''); setBuyDate(today()); setError(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleTickerChange = async (t: string, name: string) => {
    setTicker(t);
    setStockName(name);
    setError(null);
    if (!t) { setPrice(''); return; }
    setPriceLoading(true);
    try {
      const res = await apiClient.get(`/api/stocks/${t}/price`);
      const inner = (res.data as { data?: { price?: number }; price?: number });
      const p = inner?.data?.price ?? (inner as { price?: number })?.price;
      if (p && p > 0) setPrice(String(p.toFixed(2)));
    } catch { /* silent */ } finally {
      setPriceLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    const t = ticker.trim().toUpperCase();
    const sharesNum = parseInt(shares.replace(/,/g, ''), 10);
    const priceNum = parseFloat(price.replace(/,/g, ''));

    if (!t) { setError('اختر رمز السهم أولاً'); return; }
    if (!shares.trim() || isNaN(sharesNum) || sharesNum < 1) { setError('أدخل الكمية (عدد صحيح ≥ 1)'); return; }
    if (sharesNum > 1_000_000) { setError('الحد الأقصى 1,000,000 سهم'); return; }
    if (!price.trim() || isNaN(priceNum) || priceNum <= 0) { setError('أدخل سعر الشراء'); return; }
    if (!buyDate.match(/^\d{4}-\d{2}-\d{2}$/)) { setError('صيغة التاريخ: YYYY-MM-DD'); return; }
    if (buyDate > today()) { setError('لا يمكن أن يكون التاريخ في المستقبل'); return; }

    setLoading(true);
    try {
      await apiClient.post('/api/portfolio/add', {
        ticker: t, shares: sharesNum,
        purchasePrice: parseFloat(priceNum.toFixed(2)),
        purchaseDate: buyDate,
      });
      reset();
      onAdded();
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (code === 'PORTFOLIO_LIMIT_REACHED') setError('وصلت للحد المسموح من الأسهم في باقتك');
      else if (code === 'INVALID_TICKER') setError('رمز السهم غير موجود');
      else setError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={handleClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{
          backgroundColor: colors.card,
          borderTopColor: colors.border, borderTopWidth: 1,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingHorizontal: 20, paddingTop: 20,
          paddingBottom: Platform.OS === 'ios' ? 40 : 24, gap: 16,
        }}>
          {/* Handle bar */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: -4 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>إضافة سهم للمحفظة</Text>
            <Pressable onPress={handleClose} hitSlop={12}
              style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.hover, alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} color={colors.textSub} />
            </Pressable>
          </View>

          {/* Error */}
          {error && (
            <View style={{
              backgroundColor: '#f8717115', borderColor: '#f8717130',
              borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
            }}>
              <Text style={{ color: '#f87171', fontSize: 13 }}>{error}</Text>
            </View>
          )}

          {/* Ticker */}
          <View style={{ gap: 6 }}>
            <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '600' }}>رمز السهم</Text>
            <TickerSearch value={ticker} onChange={handleTickerChange} disabled={loading} colors={colors} />
            {stockName ? (
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: -2 }}>{stockName}</Text>
            ) : null}
          </View>

          {/* Shares + Price row */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '600' }}>الكمية (أسهم)</Text>
              <TextInput
                value={shares}
                onChangeText={setShares}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={{
                  backgroundColor: colors.bg, borderColor: colors.border,
                  borderWidth: 1, borderRadius: 12, paddingHorizontal: 14,
                  paddingVertical: 12, color: colors.text, fontSize: 15, fontWeight: '600',
                }}
              />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '600' }}>سعر الشراء (EGP)</Text>
                {priceLoading && <ActivityIndicator size="small" color="#8b5cf6" />}
              </View>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: colors.bg, borderColor: colors.border,
                  borderWidth: 1, borderRadius: 12, paddingHorizontal: 14,
                  paddingVertical: 12, color: colors.text, fontSize: 15, fontWeight: '600',
                }}
              />
            </View>
          </View>

          {/* Total cost preview */}
          {shares && price && !isNaN(parseInt(shares)) && !isNaN(parseFloat(price)) && (
            <View style={{
              backgroundColor: '#8b5cf610', borderRadius: 12,
              paddingHorizontal: 16, paddingVertical: 12,
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <Text style={{ color: colors.textSub, fontSize: 13 }}>إجمالي الشراء</Text>
              <Text style={{ color: '#8b5cf6', fontSize: 16, fontWeight: '700' }}>
                {(parseInt(shares) * parseFloat(price)).toLocaleString('en-US', { maximumFractionDigits: 2 })} EGP
              </Text>
            </View>
          )}

          {/* Buy date */}
          <View style={{ gap: 6 }}>
            <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '600' }}>تاريخ الشراء (YYYY-MM-DD)</Text>
            <TextInput
              value={buyDate}
              onChangeText={setBuyDate}
              placeholder={today()}
              placeholderTextColor={colors.textMuted}
              style={{
                backgroundColor: colors.bg, borderColor: colors.border,
                borderWidth: 1, borderRadius: 12, paddingHorizontal: 14,
                paddingVertical: 12, color: colors.text, fontSize: 14,
              }}
            />
          </View>

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={{ backgroundColor: '#8b5cf6', borderRadius: 14, paddingVertical: 15, alignItems: 'center', opacity: loading ? 0.6 : 1 }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>إضافة للمحفظة</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─────────────────────── useWatchlist ───────────────────────
function useWatchlist() {
  const [items, setItems] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refetch = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await apiClient.get('/api/watchlist', { signal });
      const raw = (res.data as { items?: Stock[] })?.items ?? res.data;
      if (!signal?.aborted && mountedRef.current) setItems(Array.isArray(raw) ? raw : []);
    } catch { if (!signal?.aborted && mountedRef.current) setItems([]); }
    finally { if (!signal?.aborted && mountedRef.current) setLoading(false); }
  }, []);

  useEffect(() => { const c = new AbortController(); void refetch(c.signal); return () => c.abort(); }, [refetch]);
  const reload = useCallback(() => { const c = new AbortController(); return refetch(c.signal); }, [refetch]);
  return { items, loading, reload };
}

interface Goal {
  id: string; title: string; targetAmount: number; currentAmount: number; isCompleted: boolean; currency: string;
}

function useGoalsPreview() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiClient.get('/api/goals').then((res) => {
      const data = res.data as { items?: Goal[] };
      setGoals(data.items ?? (Array.isArray(res.data) ? res.data : []));
    }).catch(() => setGoals([])).finally(() => setLoading(false));
  }, []);
  return { goals: goals.filter((g) => !g.isCompleted).slice(0, 3), loading };
}

// ─────────────────────── HoldingRow ───────────────────────
function HoldingRow({
  holding, livePrice, onDelete, onPress, colors, isLast,
}: {
  holding: { id: string; ticker: string; shares: number; avgPrice: number; currentPrice?: number };
  livePrice?: { price: number };
  onDelete: () => void;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  isLast: boolean;
}) {
  const price = livePrice?.price ?? holding.currentPrice ?? holding.avgPrice;
  const value = price * holding.shares;
  const gainLoss = (price - holding.avgPrice) * holding.shares;
  const gainLossPct = holding.avgPrice > 0 ? ((price - holding.avgPrice) / holding.avgPrice) * 100 : 0;
  const isUp = gainLoss > 0;
  const isNeutral = gainLoss === 0;
  const gainColor = isNeutral ? colors.textSub : isUp ? '#4ade80' : '#f87171';
  const gainBg = isNeutral ? colors.hover : isUp ? '#4ade8018' : '#f8717118';

  return (
    <View style={{ borderBottomWidth: isLast ? 0 : 1, borderBottomColor: colors.border }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          backgroundColor: pressed ? colors.hover : 'transparent',
          paddingHorizontal: 16, paddingVertical: 13,
          flexDirection: 'row', alignItems: 'center', gap: 12,
        })}
      >
        {/* Ticker badge */}
        <View style={{
          width: 44, height: 44, borderRadius: 12,
          backgroundColor: '#8b5cf618', borderWidth: 1, borderColor: '#8b5cf628',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Text style={{ color: '#8b5cf6', fontSize: 9, fontWeight: '800', letterSpacing: -0.3 }} numberOfLines={1}>
            {holding.ticker.slice(0, 4)}
          </Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 2 }}>
            {holding.ticker}
          </Text>
          <Text style={{ color: colors.textSub, fontSize: 12 }} numberOfLines={1}>
            {getStockName(holding.ticker, 'ar')}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
            {holding.shares.toLocaleString('en-US')} سهم · متوسط {holding.avgPrice.toFixed(2)}
          </Text>
        </View>

        {/* Value + PnL */}
        <View style={{ alignItems: I18nManager.isRTL ? 'flex-start' : 'flex-end', gap: 4, flexShrink: 0 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {value >= 1000
              ? (value / 1000).toFixed(1) + 'K'
              : value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '400' }}> EGP</Text>
          </Text>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 3,
            backgroundColor: gainBg,
            paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7,
          }}>
            {isNeutral
              ? <Minus size={9} color={gainColor} />
              : isUp
                ? <TrendingUp size={9} color={gainColor} />
                : <TrendingDown size={9} color={gainColor} />}
            <Text style={{ color: gainColor, fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {isUp ? '+' : ''}{gainLossPct.toFixed(2)}%
            </Text>
          </View>
        </View>

        {/* Delete */}
        <Pressable
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 4, right: 2 }}
          style={({ pressed }) => ({
            opacity: pressed ? 0.4 : 0.7,
            padding: 6, marginRight: -4, flexShrink: 0,
          })}
        >
          <Trash2 size={14} color={colors.textMuted} />
        </Pressable>
      </Pressable>
    </View>
  );
}

// ─────────────────────── SectionHeader ───────────────────────
function SectionHeader({
  icon, label, count, action, colors,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  action?: React.ReactNode;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 13,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon}
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{label}</Text>
        {count !== undefined && count > 0 && (
          <View style={{
            backgroundColor: colors.hover, paddingHorizontal: 7, paddingVertical: 2,
            borderRadius: 10, borderWidth: 1, borderColor: colors.border,
          }}>
            <Text style={{ color: colors.textSub, fontSize: 11, fontWeight: '600' }}>{count}</Text>
          </View>
        )}
      </View>
      {action}
    </View>
  );
}

// ─────────────────────── PortfolioPage ───────────────────────
export default function PortfolioPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const { holdings, summary, loading, refreshing, refresh } = usePortfolioData();
  const { items: watchlist, loading: watchlistLoading, reload: reloadWatchlist } = useWatchlist();
  const { goals, loading: goalsLoading } = useGoalsPreview();
  const [showAdd, setShowAdd] = useState(false);

  const holdingTickers = holdings.map((h) => h.ticker);
  const watchlistTickers = useMemo(() => watchlist.map((s) => s.ticker), [watchlist]);
  const allTickers = useMemo(() => [...holdingTickers, ...watchlistTickers], [holdingTickers, watchlistTickers]);
  const { prices } = useLivePrices(allTickers);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refresh(), reloadWatchlist()]);
  }, [refresh, reloadWatchlist]);

  const handleDelete = useCallback((id: string, ticker: string) => {
    Alert.alert(
      'حذف السهم',
      `هل تريد حذف ${ticker} من محفظتك؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف', style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/api/portfolio/${id}`);
              void refresh();
            } catch { /* silent */ }
          },
        },
      ],
    );
  }, [refresh]);

  const ChevronIcon = I18nManager.isRTL ? ChevronRight : ChevronLeft;

  return (
    <ScreenWrapper padded={false} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#8b5cf6" colors={['#8b5cf6']} />
        }
      >
        {/* ─── Header ─── */}
        <View style={{
          borderBottomColor: colors.border, borderBottomWidth: 1,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 16, paddingTop: isCompact ? 12 : 18, paddingBottom: isCompact ? 10 : 14,
        }}>
          <Text style={{ color: colors.text, fontSize: isCompact ? 19 : 22, fontWeight: '800' }}>محفظتي</Text>
          <Pressable
            onPress={() => setShowAdd(true)}
            style={{
              backgroundColor: '#8b5cf6',
              flexDirection: 'row', alignItems: 'center', gap: 5,
              paddingHorizontal: isCompact ? 12 : 14, paddingVertical: isCompact ? 7 : 8, borderRadius: 12,
            }}
          >
            <Plus size={14} color="#fff" strokeWidth={2.5} />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>إضافة</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 16 }}>

          {/* ─── Portfolio Hero ─── */}
          <PortfolioHero
            totalValue={summary.totalValue}
            totalCost={summary.totalCost}
            totalGainLoss={summary.totalGainLoss}
            totalGainLossPercent={summary.totalGainLossPercent}
            loading={loading}
            holdings={holdings}
          />

          {/* ─── Holdings ─── */}
          <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, overflow: 'hidden' }}>
            <SectionHeader
              icon={<View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: '#8b5cf618', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={13} color="#8b5cf6" />
              </View>}
              label="الأسهم"
              count={holdings.length}
              action={holdings.length > 0 ? (
                <Pressable
                  onPress={() => setShowAdd(true)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#8b5cf615' }}
                >
                  <Plus size={11} color="#8b5cf6" strokeWidth={2.5} />
                  <Text style={{ color: '#8b5cf6', fontSize: 12, fontWeight: '700' }}>إضافة</Text>
                </Pressable>
              ) : undefined}
              colors={colors}
            />

            {loading ? (
              <View style={{ gap: 1, padding: 12 }}>
                {[1, 2, 3].map((i) => <Skeleton key={i} height={70} className="rounded-xl" />)}
              </View>
            ) : holdings.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 48, gap: 12 }}>
                <View style={{
                  backgroundColor: '#8b5cf615', width: 60, height: 60,
                  borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: '#8b5cf625',
                }}>
                  <TrendingUp size={26} color="#8b5cf6" />
                </View>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>محفظتك فارغة</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>أضف أول سهم لتبدأ تتابع محفظتك</Text>
                </View>
                <Pressable
                  onPress={() => setShowAdd(true)}
                  style={{ backgroundColor: '#8b5cf6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}
                >
                  <Plus size={14} color="#fff" strokeWidth={2.5} />
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>أضف أول سهم</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {holdings.map((h, i) => (
                  <HoldingRow
                    key={h.id}
                    holding={h}
                    livePrice={prices[h.ticker]}
                    onDelete={() => handleDelete(h.id, h.ticker)}
                    onPress={() => router.push(`/stocks/${h.ticker}`)}
                    colors={colors}
                    isLast={i === holdings.length - 1}
                  />
                ))}
                {/* Holdings footer: total value */}
                <View style={{
                  borderTopWidth: 1, borderTopColor: colors.border,
                  paddingHorizontal: 16, paddingVertical: 10,
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  backgroundColor: colors.hover,
                }}>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>إجمالي المحفظة</Text>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                    {summary.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })} EGP
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* ─── Watchlist ─── */}
          <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, overflow: 'hidden' }}>
            <SectionHeader
              icon={<View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: '#f59e0b18', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={13} color="#f59e0b" />
              </View>}
              label="المراقبة"
              count={watchlist.length}
              action={
                <Pressable
                  onPress={() => router.push('/market')}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Text style={{ color: '#8b5cf6', fontSize: 12, fontWeight: '600' }}>إضافة</Text>
                  <ChevronIcon size={13} color="#8b5cf6" />
                </Pressable>
              }
              colors={colors}
            />
            {watchlistLoading ? (
              <View style={{ gap: 2, padding: 12 }}>
                {[1, 2, 3].map((i) => <Skeleton key={i} height={52} className="rounded-xl" />)}
              </View>
            ) : watchlist.length === 0 ? (
              <Pressable
                onPress={() => router.push('/market')}
                style={{ paddingVertical: 36, alignItems: 'center', gap: 8 }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#f59e0b18', alignItems: 'center', justifyContent: 'center' }}>
                  <Star size={20} color="#f59e0b" />
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>قائمة المراقبة فارغة</Text>
                <Text style={{ color: '#8b5cf6', fontSize: 12, fontWeight: '600' }}>اضغط لإضافة أسهم</Text>
              </Pressable>
            ) : (
              watchlist.map((stock) => (
                <WatchlistRow key={stock.ticker} stock={stock} livePrice={prices[stock.ticker]} />
              ))
            )}
          </View>

          {/* ─── Goals Preview ─── */}
          <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, overflow: 'hidden' }}>
            <SectionHeader
              icon={<View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: '#4ade8018', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={13} color="#4ade80" />
              </View>}
              label="الأهداف المالية"
              count={goals.length}
              action={
                <Pressable
                  onPress={() => router.push('/goals')}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Text style={{ color: '#8b5cf6', fontSize: 12, fontWeight: '600' }}>إدارة الأهداف</Text>
                  <ChevronIcon size={13} color="#8b5cf6" />
                </Pressable>
              }
              colors={colors}
            />
            {goalsLoading ? (
              <View style={{ gap: 2, padding: 12 }}>
                {[1, 2].map((i) => <Skeleton key={i} height={60} className="rounded-xl" />)}
              </View>
            ) : goals.length === 0 ? (
              <Pressable
                onPress={() => router.push('/goals')}
                style={{ paddingVertical: 36, alignItems: 'center', gap: 8 }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#4ade8018', alignItems: 'center', justifyContent: 'center' }}>
                  <Target size={20} color="#4ade80" />
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>لا توجد أهداف نشطة</Text>
                <Text style={{ color: '#8b5cf6', fontSize: 12, fontWeight: '600' }}>أضف هدفاً مالياً</Text>
              </Pressable>
            ) : (
              goals.map((g, i) => {
                const pct = g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0;
                const barColor = pct >= 100 ? '#4ade80' : pct >= 60 ? '#8b5cf6' : '#f59e0b';
                const isGoalLast = i === goals.length - 1;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => router.push('/goals')}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? colors.hover : 'transparent',
                      borderBottomWidth: isGoalLast ? 0 : 1,
                      borderBottomColor: colors.border,
                      paddingHorizontal: 16, paddingVertical: 14, gap: 8,
                    })}
                  >
                    {/* Goal title + pct */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                        {g.title}
                      </Text>
                      <Text style={{ color: barColor, fontSize: 13, fontWeight: '700', marginLeft: 8 }}>
                        {pct.toFixed(0)}%
                      </Text>
                    </View>

                    {/* Progress bar */}
                    <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: 99 }} />
                    </View>

                    {/* Amounts */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                        {g.currentAmount.toLocaleString('en-US')} {g.currency}
                      </Text>
                      <Text style={{ color: colors.textSub, fontSize: 11 }}>
                        الهدف: {g.targetAmount.toLocaleString('en-US')} {g.currency}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

        </View>
      </ScrollView>

      {/* ─── Add Holding Modal ─── */}
      <AddHoldingModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={() => { setShowAdd(false); void refresh(); }}
        colors={colors}
      />
    </ScreenWrapper>
  );
}
