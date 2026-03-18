import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput,
  ActivityIndicator, Modal, I18nManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, ArrowRight, TrendingUp, TrendingDown,
  Plus, Clock, CheckCircle, XCircle, Search,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import apiClient from '../../lib/api/client';
import { EGX_STOCKS } from '../../lib/egxStocks';

type Direction = 'UP' | 'DOWN';
type Timeframe = 'WEEK' | 'MONTH' | 'THREE_MONTHS' | 'SIX_MONTHS' | 'NINE_MONTHS' | 'YEAR';
type PredStatus = 'PENDING' | 'CORRECT' | 'WRONG' | 'EXPIRED';

interface Prediction {
  id: string;
  ticker: string;
  direction: Direction;
  timeframe: Timeframe;
  targetPrice: number;
  priceAtCreation?: number;
  reason?: string | null;
  status: PredStatus;
  isPublic: boolean;
  likes?: number;
  createdAt: string;
  expiresAt?: string;
}

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  WEEK: 'أسبوع',
  MONTH: 'شهر',
  THREE_MONTHS: '3 أشهر',
  SIX_MONTHS: '6 أشهر',
  NINE_MONTHS: '9 أشهر',
  YEAR: 'سنة',
};

const STATUS_CONFIG: Record<PredStatus, { label: string; color: string; icon: typeof Clock }> = {
  PENDING:  { label: 'جارية',   color: '#f59e0b', icon: Clock },
  CORRECT:  { label: 'صحيحة',   color: '#4ade80', icon: CheckCircle },
  WRONG:    { label: 'خاطئة',   color: '#f87171', icon: XCircle },
  EXPIRED:  { label: 'منتهية',  color: '#656d76', icon: Clock },
};

function PredictionCard({ pred }: { pred: Prediction }) {
  const isUp = pred.direction === 'UP';
  const st = STATUS_CONFIG[pred.status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = st.icon;

  return (
    <View className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-bold text-[#e6edf3]">{pred.ticker}</Text>
          <View
            className="flex-row items-center gap-1 px-2 py-0.5 rounded-lg"
            style={{ backgroundColor: isUp ? '#4ade8018' : '#f8717118' }}
          >
            {isUp
              ? <TrendingUp size={11} color="#4ade80" />
              : <TrendingDown size={11} color="#f87171" />}
            <Text className="text-xs font-bold" style={{ color: isUp ? '#4ade80' : '#f87171' }}>
              {isUp ? 'صعود' : 'هبوط'}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-1.5">
          <StatusIcon size={12} color={st.color} />
          <Text className="text-xs font-medium" style={{ color: st.color }}>{st.label}</Text>
        </View>
      </View>

      <View className="flex-row gap-4">
        <View className="gap-0.5">
          <Text className="text-xs text-[#656d76]">السعر المستهدف</Text>
          <Text className="text-sm font-bold text-[#e6edf3]">{pred.targetPrice} EGP</Text>
        </View>
        {pred.priceAtCreation != null && (
          <View className="gap-0.5">
            <Text className="text-xs text-[#656d76]">عند الإنشاء</Text>
            <Text className="text-sm font-medium text-[#8b949e]">{pred.priceAtCreation} EGP</Text>
          </View>
        )}
        <View className="gap-0.5">
          <Text className="text-xs text-[#656d76]">المدة</Text>
          <Text className="text-sm font-medium text-[#8b949e]">{TIMEFRAME_LABELS[pred.timeframe]}</Text>
        </View>
      </View>

      {pred.reason ? (
        <Text className="text-xs text-[#8b949e] leading-5" numberOfLines={2}>{pred.reason}</Text>
      ) : null}

      <Text className="text-xs text-[#656d76]">
        {new Date(pred.createdAt).toLocaleDateString('ar-EG')}
      </Text>
    </View>
  );
}

export default function PredictionsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'my' | 'feed'>('my');
  const [myPreds, setMyPreds] = useState<Prediction[]>([]);
  const [feedPreds, setFeedPreds] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [ticker, setTicker] = useState('');
  const [tickerOpen, setTickerOpen] = useState(false);
  const [direction, setDirection] = useState<Direction>('UP');
  const [timeframe, setTimeframe] = useState<Timeframe>('MONTH');
  const [targetPrice, setTargetPrice] = useState('');
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const tickerSuggestions = ticker.trim().length > 0
    ? EGX_STOCKS.filter((s) =>
        s.ticker.includes(ticker.trim().toUpperCase()) ||
        s.nameAr.includes(ticker.trim()) ||
        s.nameEn.toUpperCase().includes(ticker.trim().toUpperCase())
      ).slice(0, 5)
    : [];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [myRes, feedRes] = await Promise.all([
        apiClient.get('/api/predictions/my?limit=20'),
        apiClient.get('/api/predictions/feed?limit=20'),
      ]);
      const myData = myRes.data as { items?: Prediction[] };
      const feedData = feedRes.data as { items?: Prediction[] };
      setMyPreds(myData.items ?? []);
      setFeedPreds(feedData.items ?? []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    const t = ticker.trim().toUpperCase();
    const price = parseFloat(targetPrice.replace(/,/g, ''));
    if (!t) { setCreateError('أدخل رمز السهم'); return; }
    if (!reason.trim()) { setCreateError('أدخل سبب توقعك'); return; }
    if (isNaN(price) || price <= 0) { setCreateError('أدخل السعر المستهدف'); return; }

    setCreating(true);
    setCreateError(null);
    try {
      const res = await apiClient.post('/api/predictions', {
        ticker: t,
        direction,
        timeframe,
        targetPrice: price,
        reason: reason.trim(),
        isPublic: true,
      });
      const newPred = res.data as Prediction;
      setMyPreds((prev) => [newPred, ...prev]);
      setShowCreate(false);
      setTicker(''); setDirection('UP'); setTimeframe('MONTH');
      setTargetPrice(''); setReason('');
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (code === 'PREDICTION_LIMIT_REACHED') setCreateError('وصلت الحد اليومي من التوقعات');
      else if (code === 'DUPLICATE_PREDICTION') setCreateError('لديك توقع نشط على هذا السهم');
      else setCreateError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setCreating(false);
    }
  };

  const activeList = tab === 'my' ? myPreds : feedPreds;

  return (
    <ScreenWrapper padded={false}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-5 pb-4 border-b border-[#30363d]">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white/[0.04] border border-[#30363d] items-center justify-center"
          >
            {I18nManager.isRTL ? <ArrowRight size={16} color="#8b949e" /> : <ArrowLeft size={16} color="#8b949e" />}
          </Pressable>
          <View className="w-8 h-8 rounded-xl bg-blue-500/15 items-center justify-center">
            <TrendingUp size={16} color="#3b82f6" />
          </View>
          <Text className="text-base font-bold text-[#e6edf3]">التوقعات</Text>
        </View>
        <Pressable
          onPress={() => { setShowCreate(true); setCreateError(null); }}
          className="w-9 h-9 rounded-xl bg-brand/15 items-center justify-center"
        >
          <Plus size={18} color="#8b5cf6" />
        </Pressable>
      </View>

      {/* Tabs */}
      <View className="flex-row px-4 pt-3 gap-2">
        {(['my', 'feed'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            className="flex-1 py-2 rounded-xl items-center"
            style={{ backgroundColor: tab === t ? '#8b5cf615' : '#161b22', borderWidth: 1, borderColor: tab === t ? '#8b5cf640' : '#30363d' }}
          >
            <Text className="text-sm font-medium" style={{ color: tab === t ? '#8b5cf6' : '#8b949e' }}>
              {t === 'my' ? 'توقعاتي' : 'السوق'}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center mt-10">
          <ActivityIndicator color="#8b5cf6" />
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-4 pt-4 pb-10 gap-3" showsVerticalScrollIndicator={false}>
          {activeList.length === 0 ? (
            <View className="items-center gap-3 py-12">
              <View className="w-16 h-16 rounded-2xl bg-blue-500/10 items-center justify-center">
                <TrendingUp size={28} color="#3b82f6" />
              </View>
              <Text className="text-base font-bold text-[#e6edf3]">
                {tab === 'my' ? 'لا توجد توقعات بعد' : 'لا توجد توقعات في الفيد'}
              </Text>
              {tab === 'my' && (
                <Pressable
                  onPress={() => setShowCreate(true)}
                  className="bg-brand rounded-xl px-5 py-2.5 mt-2"
                >
                  <Text className="text-sm font-bold text-white">أضف توقعك الأول</Text>
                </Pressable>
              )}
            </View>
          ) : (
            activeList.map((p) => <PredictionCard key={p.id} pred={p} />)
          )}
        </ScrollView>
      )}

      {/* Create Prediction Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <Pressable className="flex-1 bg-black/60" onPress={() => setShowCreate(false)} />
        <ScrollView
          className="bg-[#161b22] border-t border-[#30363d] rounded-t-3xl"
          contentContainerClassName="px-4 pt-5 pb-12 gap-4"
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-base font-bold text-[#e6edf3]">توقع جديد</Text>
            <Pressable onPress={() => setShowCreate(false)} className="p-1">
              <Text className="text-[#8b949e]">✕</Text>
            </Pressable>
          </View>

          {createError && (
            <View className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <Text className="text-xs text-red-400">{createError}</Text>
            </View>
          )}

          {/* Ticker */}
          <View className="gap-1">
            <Text className="text-xs text-[#8b949e]">رمز السهم</Text>
            <View className="flex-row items-center bg-[#0d1117] border border-[#30363d] rounded-xl px-3 gap-2">
              <Search size={14} color="#656d76" />
              <TextInput
                value={ticker}
                onChangeText={(v) => { setTicker(v); setTickerOpen(true); }}
                onFocus={() => setTickerOpen(true)}
                placeholder="مثال: COMI"
                placeholderTextColor="#656d76"
                autoCapitalize="characters"
                className="flex-1 py-3 text-sm text-[#e6edf3]"
              />
            </View>
            {tickerOpen && tickerSuggestions.length > 0 && (
              <View className="bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden">
                {tickerSuggestions.map((s) => (
                  <Pressable
                    key={s.ticker}
                    onPress={() => { setTicker(s.ticker); setTickerOpen(false); }}
                    className="flex-row items-center justify-between px-4 py-2.5 border-b border-[#21262d] active:bg-[#1c2128]"
                  >
                    <Text className="text-sm font-bold text-[#e6edf3]">{s.ticker}</Text>
                    <Text className="text-xs text-[#8b949e]">{s.nameAr}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Direction */}
          <View className="gap-1">
            <Text className="text-xs text-[#8b949e]">الاتجاه</Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setDirection('UP')}
                className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border"
                style={{ backgroundColor: direction === 'UP' ? '#4ade8018' : '#0d1117', borderColor: direction === 'UP' ? '#4ade80' : '#30363d' }}
              >
                <TrendingUp size={16} color="#4ade80" />
                <Text className="text-sm font-bold" style={{ color: direction === 'UP' ? '#4ade80' : '#8b949e' }}>صعود</Text>
              </Pressable>
              <Pressable
                onPress={() => setDirection('DOWN')}
                className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border"
                style={{ backgroundColor: direction === 'DOWN' ? '#f8717118' : '#0d1117', borderColor: direction === 'DOWN' ? '#f87171' : '#30363d' }}
              >
                <TrendingDown size={16} color="#f87171" />
                <Text className="text-sm font-bold" style={{ color: direction === 'DOWN' ? '#f87171' : '#8b949e' }}>هبوط</Text>
              </Pressable>
            </View>
          </View>

          {/* Timeframe */}
          <View className="gap-1">
            <Text className="text-xs text-[#8b949e]">المدة</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="flex-row gap-2">
              {(Object.entries(TIMEFRAME_LABELS) as [Timeframe, string][]).map(([key, label]) => (
                <Pressable
                  key={key}
                  onPress={() => setTimeframe(key)}
                  className="px-3 py-2 rounded-xl border"
                  style={{ backgroundColor: timeframe === key ? '#8b5cf615' : '#0d1117', borderColor: timeframe === key ? '#8b5cf6' : '#30363d' }}
                >
                  <Text className="text-xs font-medium" style={{ color: timeframe === key ? '#8b5cf6' : '#8b949e' }}>{label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Target Price */}
          <View className="gap-1">
            <Text className="text-xs text-[#8b949e]">السعر المستهدف (EGP)</Text>
            <TextInput
              value={targetPrice}
              onChangeText={setTargetPrice}
              placeholder="0.00"
              placeholderTextColor="#656d76"
              keyboardType="numeric"
              className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 text-sm text-[#e6edf3]"
            />
          </View>

          {/* Reason */}
          <View className="gap-1">
            <Text className="text-xs text-[#8b949e]">سبب التوقع</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="اشرح لماذا تتوقع هذا الاتجاه..."
              placeholderTextColor="#656d76"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 text-sm text-[#e6edf3]"
              style={{ minHeight: 80 }}
            />
          </View>

          <Pressable
            onPress={handleCreate}
            disabled={creating}
            className="bg-brand rounded-xl py-3.5 items-center"
            style={{ opacity: creating ? 0.6 : 1 }}
          >
            {creating
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-sm font-bold text-white">نشر التوقع</Text>}
          </Pressable>
        </ScrollView>
      </Modal>
    </ScreenWrapper>
  );
}
