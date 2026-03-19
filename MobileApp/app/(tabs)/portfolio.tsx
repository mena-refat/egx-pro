import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, RefreshControl, Pressable,
  Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, I18nManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, ChevronLeft, ChevronRight, Target, Star, Trash2, Search, X, TrendingUp, TrendingDown } from 'lucide-react-native';
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
      <View style={{ backgroundColor: colors.bg, borderColor: open && suggestions.length > 0 ? '#8b5cf6' : colors.border, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }}>
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
        <View style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, marginTop: 4, overflow: 'hidden', zIndex: 999 }}>
          {suggestions.map((s, i) => (
            <Pressable
              key={s.ticker}
              onPress={() => { setText(s.ticker); onChange(s.ticker, s.nameAr); setOpen(false); }}
              style={({ pressed }) => ({ backgroundColor: pressed ? colors.hover : 'transparent', borderBottomWidth: i < suggestions.length - 1 ? 1 : 0, borderBottomColor: colors.border, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ backgroundColor: '#8b5cf615', width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
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
    // auto-fill current price
    setPriceLoading(true);
    try {
      const res = await apiClient.get(`/api/stocks/${t}/price`);
      const inner = (res.data as { data?: { price?: number }; price?: number });
      const p = inner?.data?.price ?? (inner as { price?: number })?.price;
      if (p && p > 0) setPrice(String(p.toFixed(2)));
    } catch {
      // silent — user can enter manually
    } finally {
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
        ticker: t,
        shares: sharesNum,
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
        <View style={{ backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24, gap: 16 }}>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>إضافة سهم للمحفظة</Text>
            <Pressable onPress={handleClose} style={{ padding: 4 }}>
              <X size={20} color={colors.textSub} />
            </Pressable>
          </View>

          {/* Error */}
          {error && (
            <View style={{ backgroundColor: '#f8717115', borderColor: '#f8717130', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
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
                style={{ backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 15, fontWeight: '600' }}
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
                style={{ backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 15, fontWeight: '600' }}
              />
            </View>
          </View>

          {/* Total cost preview */}
          {shares && price && !isNaN(parseInt(shares)) && !isNaN(parseFloat(price)) && (
            <View style={{ backgroundColor: '#8b5cf610', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.textSub, fontSize: 13 }}>إجمالي الشراء</Text>
              <Text style={{ color: '#8b5cf6', fontSize: 15, fontWeight: '700' }}>
                {(parseInt(shares) * parseFloat(price)).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} EGP
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
              style={{ backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 14 }}
            />
          </View>

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={{ backgroundColor: '#8b5cf6', borderRadius: 14, paddingVertical: 14, alignItems: 'center', opacity: loading ? 0.6 : 1 }}
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
  const isUp = gainLoss >= 0;

  return (
    <View style={{ borderBottomWidth: isLast ? 0 : 1, borderBottomColor: colors.border }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ backgroundColor: pressed ? colors.hover : 'transparent', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 })}
      >
        {/* Ticker badge */}
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#8b5cf615', borderWidth: 1, borderColor: '#8b5cf625', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#8b5cf6', fontSize: 10, fontWeight: '800', letterSpacing: -0.5 }} numberOfLines={1}>
            {holding.ticker.slice(0, 4)}
          </Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{holding.ticker}</Text>
          <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
            {getStockName(holding.ticker, 'ar')} · {holding.shares.toLocaleString()} سهم
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 1 }}>
            متوسط: {holding.avgPrice.toFixed(2)} EGP
          </Text>
        </View>

        {/* Value + PnL */}
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {value.toLocaleString('ar-EG', { maximumFractionDigits: 0 })}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: isUp ? '#4ade8015' : '#f8717115', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
            {isUp ? <TrendingUp size={10} color="#4ade80" /> : <TrendingDown size={10} color="#f87171" />}
            <Text style={{ color: isUp ? '#4ade80' : '#f87171', fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {isUp ? '+' : ''}{gainLossPct.toFixed(2)}%
            </Text>
          </View>
          {gainLoss !== 0 && (
            <Text style={{ color: isUp ? '#4ade80' : '#f87171', fontSize: 11, fontVariant: ['tabular-nums'] }}>
              {isUp ? '+' : ''}{gainLoss.toLocaleString('ar-EG', { maximumFractionDigits: 0 })}
            </Text>
          )}
        </View>

        {/* Delete */}
        <Pressable
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 2 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 6, marginRight: -4 })}
        >
          <Trash2 size={15} color={colors.textMuted} />
        </Pressable>
      </Pressable>
    </View>
  );
}

// ─────────────────────── PortfolioPage ───────────────────────
export default function PortfolioPage() {
  const router = useRouter();
  const { colors } = useTheme();
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
          text: 'حذف',
          style: 'destructive',
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
    <ScreenWrapper padded={false}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#8b5cf6" colors={['#8b5cf6']} />
        }
      >
        {/* ─── Header ─── */}
        <View style={{ borderBottomColor: colors.border, borderBottomWidth: 0.5 }} className="flex-row items-center justify-between px-4 pt-5 pb-4">
          <Text style={{ color: colors.text }} className="text-xl font-bold">محفظتي</Text>
          <Pressable
            onPress={() => setShowAdd(true)}
            style={{ backgroundColor: '#8b5cf6', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 }}
          >
            <Plus size={14} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>إضافة سهم</Text>
          </Pressable>
        </View>

        <View className="px-4 pt-4 gap-4">
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
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl overflow-hidden">
            <View style={{ borderBottomColor: colors.border }} className="flex-row items-center justify-between px-4 py-3 border-b">
              <Text style={{ color: colors.text }} className="text-sm font-semibold">
                الأسهم {holdings.length > 0 ? `(${holdings.length})` : ''}
              </Text>
              {holdings.length > 0 && (
                <Pressable onPress={() => setShowAdd(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Plus size={12} color="#8b5cf6" />
                  <Text style={{ color: '#8b5cf6', fontSize: 12 }}>إضافة</Text>
                </Pressable>
              )}
            </View>

            {loading ? (
              <View className="gap-1 p-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} height={72} className="rounded-xl" />)}
              </View>
            ) : holdings.length === 0 ? (
              <Pressable onPress={() => setShowAdd(true)} className="items-center py-12 gap-3">
                <View style={{ backgroundColor: '#8b5cf615', width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={24} color="#8b5cf6" />
                </View>
                <Text style={{ color: colors.textMuted }} className="text-sm">محفظتك فارغة</Text>
                <View style={{ backgroundColor: '#8b5cf6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>أضف أول سهم</Text>
                </View>
              </Pressable>
            ) : (
              holdings.map((h, i) => (
                <HoldingRow
                  key={h.id}
                  holding={h}
                  livePrice={prices[h.ticker]}
                  onDelete={() => handleDelete(h.id, h.ticker)}
                  onPress={() => router.push(`/stocks/${h.ticker}`)}
                  colors={colors}
                  isLast={i === holdings.length - 1}
                />
              ))
            )}
          </View>

          {/* ─── Watchlist ─── */}
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl overflow-hidden">
            <View style={{ borderBottomColor: colors.border }} className="flex-row items-center justify-between px-4 py-3 border-b">
              <View className="flex-row items-center gap-2">
                <Star size={14} color="#8b5cf6" />
                <Text style={{ color: colors.text }} className="text-sm font-semibold">المراقبة</Text>
              </View>
              <Pressable onPress={() => router.push('/market')} className="flex-row items-center gap-1">
                <Text className="text-xs text-brand">إضافة</Text>
                <ChevronIcon size={12} color="#8b5cf6" />
              </Pressable>
            </View>
            {watchlistLoading ? (
              <View className="gap-3 p-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} height={44} />)}
              </View>
            ) : watchlist.length === 0 ? (
              <Pressable onPress={() => router.push('/market')} className="py-8 items-center gap-2">
                <Text style={{ color: colors.textMuted }} className="text-sm">قائمة المراقبة فارغة</Text>
                <Text className="text-xs text-brand">أضف أسهم للمراقبة</Text>
              </Pressable>
            ) : (
              watchlist.map((stock) => (
                <WatchlistRow key={stock.ticker} stock={stock} livePrice={prices[stock.ticker]} />
              ))
            )}
          </View>

          {/* ─── Goals Preview ─── */}
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl overflow-hidden">
            <View style={{ borderBottomColor: colors.border }} className="flex-row items-center justify-between px-4 py-3 border-b">
              <View className="flex-row items-center gap-2">
                <Target size={14} color="#4ade80" />
                <Text style={{ color: colors.text }} className="text-sm font-semibold">الأهداف المالية</Text>
              </View>
              <Pressable onPress={() => router.push('/goals')} className="flex-row items-center gap-1">
                <Text className="text-xs text-brand">إدارة الأهداف</Text>
                <ChevronIcon size={12} color="#8b5cf6" />
              </Pressable>
            </View>
            {goalsLoading ? (
              <View className="gap-3 p-4">{[1, 2].map((i) => <Skeleton key={i} height={44} />)}</View>
            ) : goals.length === 0 ? (
              <Pressable onPress={() => router.push('/goals')} className="py-8 items-center gap-2">
                <Text style={{ color: colors.textMuted }} className="text-sm">لا توجد أهداف نشطة</Text>
                <Text className="text-xs text-brand">أضف هدفاً مالياً</Text>
              </Pressable>
            ) : (
              goals.map((g, i) => {
                const pct = g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0;
                const barColor = pct >= 100 ? '#4ade80' : pct >= 60 ? '#8b5cf6' : '#f59e0b';
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => router.push('/goals')}
                    style={({ pressed }) => [
                      { borderBottomColor: colors.border, backgroundColor: pressed ? colors.hover : 'transparent' },
                      i < goals.length - 1 && { borderBottomWidth: 1 },
                    ]}
                    className="px-4 py-3"
                  >
                    <View className="flex-row items-center justify-between mb-1.5">
                      <Text style={{ color: colors.text }} className="text-xs font-semibold" numberOfLines={1}>{g.title}</Text>
                      <Text className="text-xs font-bold" style={{ color: barColor }}>{pct.toFixed(0)}%</Text>
                    </View>
                    <View style={{ backgroundColor: colors.border }} className="h-1.5 rounded-full overflow-hidden">
                      <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                    </View>
                    <Text style={{ color: colors.textMuted }} className="text-xs mt-1">
                      {g.currentAmount.toLocaleString()} / {g.targetAmount.toLocaleString()} {g.currency}
                    </Text>
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
