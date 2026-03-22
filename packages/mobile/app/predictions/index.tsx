import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput,
  ActivityIndicator, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, ArrowRight, TrendingUp, TrendingDown,
  Plus, Clock, CheckCircle, XCircle, Search,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../hooks/useTheme';
import apiClient from '../../lib/api/client';
import { EGX_STOCKS } from '../../lib/egxStocks';
import { tw } from '../../lib/tw';

type Direction = 'UP' | 'DOWN';
type Timeframe = 'WEEK' | 'MONTH' | 'THREE_MONTHS' | 'SIX_MONTHS' | 'NINE_MONTHS' | 'YEAR';
type PredStatus = 'PENDING' | 'CORRECT' | 'WRONG' | 'EXPIRED';
type FeedFilter = 'all' | 'following';

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
  PENDING:  { label: 'جارية',  color: '#f59e0b', icon: Clock },
  CORRECT:  { label: 'صحيحة',  color: '#4ade80', icon: CheckCircle },
  WRONG:    { label: 'خاطئة',  color: '#f87171', icon: XCircle },
  EXPIRED:  { label: 'منتهية', color: '#9ca3af', icon: Clock },
};

function PredictionCard({ pred }: { pred: Prediction }) {
  const { colors } = useTheme();
  const isUp = pred.direction === 'UP';
  const st = STATUS_CONFIG[pred.status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = st.icon;

  return (
    <View
      style={[{ backgroundColor: colors.card, borderColor: colors.border }, tw('border rounded-2xl p-4 gap-3')]}
    >
      <View style={tw('flex-row items-center justify-between')}>
        <View style={tw('flex-row items-center gap-2')}>
          <Text style={[{ color: colors.text }, tw('text-base font-bold')]}>{pred.ticker}</Text>
          <View
            style={[
              tw('flex-row items-center gap-1 px-2 py-0.5 rounded-lg'),
              { backgroundColor: isUp ? '#4ade8018' : '#f8717118' },
            ]}
          >
            {isUp
              ? <TrendingUp size={11} color="#4ade80" />
              : <TrendingDown size={11} color="#f87171" />}
            <Text style={[{ color: isUp ? '#4ade80' : '#f87171' }, tw('text-xs font-bold')]}>
              {isUp ? 'صعود' : 'هبوط'}
            </Text>
          </View>
        </View>
        <View style={tw('flex-row items-center gap-1.5')}>
          <StatusIcon size={12} color={st.color} />
          <Text style={[{ color: st.color }, tw('text-xs font-medium')]}>{st.label}</Text>
        </View>
      </View>

      <View style={tw('flex-row gap-4')}>
        <View style={tw('gap-0.5')}>
          <Text style={[{ color: colors.textMuted }, tw('text-xs')]}>السعر المستهدف</Text>
          <Text style={[{ color: colors.text }, tw('text-sm font-bold')]}>{pred.targetPrice} EGP</Text>
        </View>
        {pred.priceAtCreation != null && (
          <View style={tw('gap-0.5')}>
            <Text style={[{ color: colors.textMuted }, tw('text-xs')]}>عند الإنشاء</Text>
            <Text style={[{ color: colors.textSub }, tw('text-sm font-medium')]}>{pred.priceAtCreation} EGP</Text>
          </View>
        )}
        <View style={tw('gap-0.5')}>
          <Text style={[{ color: colors.textMuted }, tw('text-xs')]}>المدة</Text>
          <Text style={[{ color: colors.textSub }, tw('text-sm font-medium')]}>{TIMEFRAME_LABELS[pred.timeframe]}</Text>
        </View>
      </View>

      {pred.reason ? (
        <Text
          style={[{ color: colors.textSub }, tw('text-xs leading-5')]}
          numberOfLines={2}
        >
          {pred.reason}
        </Text>
      ) : null}

      <Text style={[{ color: colors.textMuted }, tw('text-xs')]}>
        {new Date(pred.createdAt).toLocaleDateString('ar-EG')}
      </Text>
    </View>
  );
}

export default function PredictionsPage() {
  const router = useRouter();
  const { colors, isRTL } = useTheme();

  // Main tabs: my / feed
  const [tab, setTab] = useState<'my' | 'feed'>('my');
  // Feed sub-filter: all / following
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');

  const [myPreds, setMyPreds] = useState<Prediction[]>([]);
  const [feedPreds, setFeedPreds] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

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

  const fetchMyPreds = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/predictions/my?limit=20');
      const data = res.data as { items?: Prediction[] };
      setMyPreds(data.items ?? []);
    } catch { /* ignore */ }
  }, []);

  const fetchFeed = useCallback(async (filter: FeedFilter) => {
    try {
      const res = await apiClient.get(`/api/predictions/feed?filter=${filter}&limit=20`);
      const data = res.data as { items?: Prediction[] };
      setFeedPreds(data.items ?? []);
    } catch { /* ignore */ }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMyPreds(), fetchFeed(feedFilter)]);
    setLoading(false);
  }, [fetchMyPreds, fetchFeed, feedFilter]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  // Re-fetch feed when filter changes
  const handleFeedFilter = useCallback(async (f: FeedFilter) => {
    setFeedFilter(f);
    setLoading(true);
    await fetchFeed(f);
    setLoading(false);
  }, [fetchFeed]);

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
        ticker: t, direction, timeframe,
        targetPrice: price, reason: reason.trim(), isPublic: true,
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
      <View
        style={[
          { borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: isRTL ? 'row-reverse' : 'row' },
          tw('items-center justify-between px-4 pt-5 pb-4'),
        ]}
      >
        <View style={tw('flex-row items-center gap-3')}>
          <Pressable
            onPress={() => router.back()}
            style={[
              { backgroundColor: colors.hover, borderColor: colors.border },
              tw('w-9 h-9 rounded-xl border items-center justify-center'),
            ]}
          >
            {isRTL ? <ArrowRight size={16} color={colors.textSub} /> : <ArrowLeft size={16} color={colors.textSub} />}
          </Pressable>
          <View style={tw('w-8 h-8 rounded-xl bg-blue-500/15 items-center justify-center')}>
            <TrendingUp size={16} color="#3b82f6" />
          </View>
          <Text style={[{ color: colors.text }, tw('text-base font-bold')]}>التوقعات</Text>
        </View>
        <Pressable
          onPress={() => { setShowCreate(true); setCreateError(null); }}
          style={tw('w-9 h-9 rounded-xl bg-brand/15 items-center justify-center')}
        >
          <Plus size={18} color="#8b5cf6" />
        </Pressable>
      </View>

      {/* Main Tabs */}
      <View style={tw('flex-row px-4 pt-3 gap-2')}>
        {(['my', 'feed'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[
              tw('flex-1 py-2 rounded-xl items-center'),
              {
                backgroundColor: tab === t ? '#8b5cf615' : colors.card,
                borderWidth: 1,
                borderColor: tab === t ? '#8b5cf640' : colors.border,
              },
            ]}
          >
            <Text
              style={[
                { color: tab === t ? '#8b5cf6' : colors.textSub },
                tw('text-sm font-medium'),
              ]}
            >
              {t === 'my' ? 'توقعاتي' : 'الخلاصة'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Feed sub-filter pills (only when feed tab is active) */}
      {tab === 'feed' && (
        <View style={tw('flex-row px-4 pt-2 gap-2')}>
          {([
            { key: 'all', label: 'الكل' },
            { key: 'following', label: 'المتابَعون' },
          ] as { key: FeedFilter; label: string }[]).map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => { void handleFeedFilter(key); }}
              style={[
                tw('px-4 py-1.5 rounded-full border'),
                {
                  backgroundColor: feedFilter === key ? '#3b82f615' : 'transparent',
                  borderColor: feedFilter === key ? '#3b82f6' : colors.border,
                },
              ]}
            >
              <Text style={[
                { color: feedFilter === key ? '#3b82f6' : colors.textSub },
                tw('text-xs font-medium'),
              ]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {loading ? (
        <View style={tw('flex-1 items-center justify-center mt-10')}>
          <ActivityIndicator color="#8b5cf6" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={tw('px-4 pt-4 pb-10 gap-3')}
          showsVerticalScrollIndicator={false}
        >
          {activeList.length === 0 ? (
            <View style={tw('items-center gap-3 py-12')}>
              <View style={tw('w-16 h-16 rounded-2xl bg-blue-500/10 items-center justify-center')}>
                <TrendingUp size={28} color="#3b82f6" />
              </View>
              <Text style={[{ color: colors.text }, tw('text-base font-bold')]}>
                {tab === 'my'
                  ? 'لا توجد توقعات بعد'
                  : feedFilter === 'following'
                    ? 'لا توجد توقعات من المتابَعين'
                    : 'لا توجد توقعات في الخلاصة'}
              </Text>
              {tab === 'my' && (
                <Pressable
                  onPress={() => setShowCreate(true)}
                  style={tw('bg-brand rounded-xl px-5 py-2.5 mt-2')}
                >
                  <Text style={tw('text-sm font-bold text-white')}>أضف توقعك الأول</Text>
                </Pressable>
              )}
              {tab === 'feed' && feedFilter === 'following' && (
                <Text style={[{ color: colors.textMuted }, tw('text-xs text-center px-8')]}>
                  تابع مستخدمين آخرين لترى توقعاتهم هنا
                </Text>
              )}
            </View>
          ) : (
            activeList.map((p) => <PredictionCard key={p.id} pred={p} />)
          )}
        </ScrollView>
      )}

      {/* Create Prediction Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <Pressable
          style={tw('flex-1 bg-black/60')}
          onPress={() => setShowCreate(false)}
        />
        <ScrollView
          style={[{ backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: 1 }, tw('rounded-t-3xl')]}
          contentContainerStyle={tw('px-4 pt-5 pb-12 gap-4')}
          keyboardShouldPersistTaps="handled"
        >
          <View style={tw('flex-row items-center justify-between mb-1')}>
            <Text style={[{ color: colors.text }, tw('text-base font-bold')]}>توقع جديد</Text>
            <Pressable onPress={() => setShowCreate(false)} style={tw('p-1')}>
              <Text style={{ color: colors.textSub }}>✕</Text>
            </Pressable>
          </View>

          {createError && (
            <View style={tw('bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2')}>
              <Text style={tw('text-xs text-red-400')}>{createError}</Text>
            </View>
          )}

          {/* Ticker */}
          <View style={tw('gap-1')}>
            <Text style={[{ color: colors.textSub }, tw('text-xs')]}>رمز السهم</Text>
            <View
              style={[
                { backgroundColor: colors.bg, borderColor: colors.border },
                tw('flex-row items-center border rounded-xl px-3 gap-2'),
              ]}
            >
              <Search size={14} color={colors.textMuted} />
              <TextInput
                value={ticker}
                onChangeText={(v) => { setTicker(v); setTickerOpen(true); }}
                onFocus={() => setTickerOpen(true)}
                placeholder="مثال: COMI"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                style={[{ color: colors.text }, tw('flex-1 py-3 text-sm')]}
              />
            </View>
            {tickerOpen && tickerSuggestions.length > 0 && (
              <View
                style={[
                  { backgroundColor: colors.bg, borderColor: colors.border },
                  tw('border rounded-xl overflow-hidden'),
                ]}
              >
                {tickerSuggestions.map((s) => (
                  <Pressable
                    key={s.ticker}
                    onPress={() => { setTicker(s.ticker); setTickerOpen(false); }}
                    style={({ pressed }) => [
                      {
                        borderBottomColor: colors.border,
                        borderBottomWidth: 1,
                        backgroundColor: pressed ? colors.hover : 'transparent',
                      },
                      tw('flex-row items-center justify-between px-4 py-2.5'),
                    ]}
                  >
                    <Text style={[{ color: colors.text }, tw('text-sm font-bold')]}>{s.ticker}</Text>
                    <Text style={[{ color: colors.textSub }, tw('text-xs')]}>{s.nameAr}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Direction */}
          <View style={tw('gap-1')}>
            <Text style={[{ color: colors.textSub }, tw('text-xs')]}>الاتجاه</Text>
            <View style={tw('flex-row gap-3')}>
              <Pressable
                onPress={() => setDirection('UP')}
                style={[
                  tw('flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border'),
                  {
                    backgroundColor: direction === 'UP' ? '#4ade8018' : colors.bg,
                    borderColor: direction === 'UP' ? '#4ade80' : colors.border,
                  },
                ]}
              >
                <TrendingUp size={16} color="#4ade80" />
                <Text style={[{ color: direction === 'UP' ? '#4ade80' : colors.textSub }, tw('text-sm font-bold')]}>
                  صعود
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setDirection('DOWN')}
                style={[
                  tw('flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border'),
                  {
                    backgroundColor: direction === 'DOWN' ? '#f8717118' : colors.bg,
                    borderColor: direction === 'DOWN' ? '#f87171' : colors.border,
                  },
                ]}
              >
                <TrendingDown size={16} color="#f87171" />
                <Text style={[{ color: direction === 'DOWN' ? '#f87171' : colors.textSub }, tw('text-sm font-bold')]}>
                  هبوط
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Timeframe */}
          <View style={tw('gap-1')}>
            <Text style={[{ color: colors.textSub }, tw('text-xs')]}>المدة</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw('flex-row gap-2')}
            >
              {(Object.entries(TIMEFRAME_LABELS) as [Timeframe, string][]).map(([key, label]) => (
                <Pressable
                  key={key}
                  onPress={() => setTimeframe(key)}
                  style={[
                    tw('px-3 py-2 rounded-xl border'),
                    {
                      backgroundColor: timeframe === key ? '#8b5cf615' : colors.bg,
                      borderColor: timeframe === key ? '#8b5cf6' : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      { color: timeframe === key ? '#8b5cf6' : colors.textSub },
                      tw('text-xs font-medium'),
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Target Price */}
          <View style={tw('gap-1')}>
            <Text style={[{ color: colors.textSub }, tw('text-xs')]}>السعر المستهدف (EGP)</Text>
            <TextInput
              value={targetPrice}
              onChangeText={setTargetPrice}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              style={[
                {
                  color: colors.text,
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                },
                tw('border rounded-xl px-4 py-3 text-sm'),
              ]}
            />
          </View>

          {/* Reason */}
          <View style={tw('gap-1')}>
            <Text style={[{ color: colors.textSub }, tw('text-xs')]}>سبب التوقع</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="اشرح لماذا تتوقع هذا الاتجاه..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={[
                {
                  color: colors.text,
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                  minHeight: 80,
                },
                tw('border rounded-xl px-4 py-3 text-sm'),
              ]}
            />
          </View>

          <Pressable
            onPress={handleCreate}
            disabled={creating}
            style={[tw('bg-brand rounded-xl py-3.5 items-center'), { opacity: creating ? 0.6 : 1 }]}
          >
            {creating
              ? <ActivityIndicator color="#fff" />
              : <Text style={tw('text-sm font-bold text-white')}>نشر التوقع</Text>}
          </Pressable>
        </ScrollView>
      </Modal>
    </ScreenWrapper>
  );
}
