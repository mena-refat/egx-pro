import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput,
  ActivityIndicator, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
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

type TFunc = ReturnType<typeof useTranslation>['t'];

function getTimeframeLabel(key: Timeframe, t: TFunc): string {
  const map: Record<Timeframe, string> = {
    WEEK:         t('predictions.timeWeek'),
    MONTH:        t('predictions.timeMonth'),
    THREE_MONTHS: t('predictions.time3Months'),
    SIX_MONTHS:   t('predictions.time6Months'),
    NINE_MONTHS:  t('predictions.time9Months'),
    YEAR:         t('predictions.timeYear'),
  };
  return map[key] ?? key;
}

const STATUS_CONFIG: Record<PredStatus, { color: string; icon: typeof Clock }> = {
  PENDING:  { color: '#f59e0b', icon: Clock },
  CORRECT:  { color: '#4ade80', icon: CheckCircle },
  WRONG:    { color: '#f87171', icon: XCircle },
  EXPIRED:  { color: '#9ca3af', icon: Clock },
};

function PredictionCard({ pred }: { pred: Prediction }) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const isUp = pred.direction === 'UP';
  const st = STATUS_CONFIG[pred.status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = st.icon;
  const dateLocale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';

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
              {isUp ? t('predictions.up') : t('predictions.down')}
            </Text>
          </View>
        </View>
        <View style={tw('flex-row items-center gap-1.5')}>
          <StatusIcon size={12} color={st.color} />
          <Text style={[{ color: st.color }, tw('text-xs font-medium')]}>
            {t(`predictions.status.${pred.status.toLowerCase()}`)}
          </Text>
        </View>
      </View>

      <View style={tw('flex-row gap-4')}>
        <View style={tw('gap-0.5')}>
          <Text style={[{ color: colors.textMuted }, tw('text-xs')]}>{t('predictions.targetPrice')}</Text>
          <Text style={[{ color: colors.text }, tw('text-sm font-bold')]}>{pred.targetPrice?.toFixed(2)} EGP</Text>
        </View>
        {pred.priceAtCreation != null && (
          <View style={tw('gap-0.5')}>
            <Text style={[{ color: colors.textMuted }, tw('text-xs')]}>{t('predictions.atCreation')}</Text>
            <Text style={[{ color: colors.textSub }, tw('text-sm font-medium')]}>{pred.priceAtCreation?.toFixed(2)} EGP</Text>
          </View>
        )}
        <View style={tw('gap-0.5')}>
          <Text style={[{ color: colors.textMuted }, tw('text-xs')]}>{t('predictions.timeframe')}</Text>
          <Text style={[{ color: colors.textSub }, tw('text-sm font-medium')]}>{getTimeframeLabel(pred.timeframe, t)}</Text>
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
        {new Date(pred.createdAt).toLocaleDateString(dateLocale)}
      </Text>
    </View>
  );
}

export default function PredictionsPage() {
  const router = useRouter();
  const { t } = useTranslation();
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
    const tk = ticker.trim().toUpperCase();
    const price = parseFloat(targetPrice.replace(/,/g, ''));
    if (!tk) { setCreateError(t('predictions.errorNoTicker')); return; }
    if (!reason.trim()) { setCreateError(t('predictions.errorNoReason')); return; }
    if (isNaN(price) || price <= 0) { setCreateError(t('predictions.errorNoPrice')); return; }

    setCreating(true);
    setCreateError(null);
    try {
      const res = await apiClient.post('/api/predictions', {
        ticker: tk, direction, timeframe, mode: 'EXACT',
        targetPrice: price, reason: reason.trim(), isPublic: true,
      });
      const newPred = res.data as Prediction;
      setMyPreds((prev) => [newPred, ...prev]);
      setShowCreate(false);
      setTicker(''); setDirection('UP'); setTimeframe('MONTH');
      setTargetPrice(''); setReason('');
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (code === 'PREDICTION_LIMIT_REACHED') setCreateError(t('predictions.errorLimitReached'));
      else if (code === 'DUPLICATE_PREDICTION') setCreateError(t('predictions.errorDuplicate'));
      else setCreateError(t('common.error'));
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
          <Text style={[{ color: colors.text }, tw('text-base font-bold')]}>{t('predictions.title')}</Text>
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
        {(['my', 'feed'] as const).map((tabKey) => (
          <Pressable
            key={tabKey}
            onPress={() => setTab(tabKey)}
            style={[
              tw('flex-1 py-2 rounded-xl items-center'),
              {
                backgroundColor: tab === tabKey ? '#8b5cf615' : colors.card,
                borderWidth: 1,
                borderColor: tab === tabKey ? '#8b5cf640' : colors.border,
              },
            ]}
          >
            <Text
              style={[
                { color: tab === tabKey ? '#8b5cf6' : colors.textSub },
                tw('text-sm font-medium'),
              ]}
            >
              {tabKey === 'my' ? t('predictions.myPredictions') : t('predictions.feed')}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Feed sub-filter pills (only when feed tab is active) */}
      {tab === 'feed' && (
        <View style={tw('flex-row px-4 pt-2 gap-2')}>
          {([
            { key: 'all' as FeedFilter, label: t('market.all') },
            { key: 'following' as FeedFilter, label: t('predictions.following') },
          ]).map(({ key, label }) => (
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
                  ? t('predictions.noMyPreds')
                  : feedFilter === 'following'
                    ? t('predictions.noFollowingPreds')
                    : t('predictions.noFeedPreds')}
              </Text>
              {tab === 'my' && (
                <Pressable
                  onPress={() => setShowCreate(true)}
                  style={tw('bg-brand rounded-xl px-5 py-2.5 mt-2')}
                >
                  <Text style={tw('text-sm font-bold text-white')}>{t('predictions.addFirst')}</Text>
                </Pressable>
              )}
              {tab === 'feed' && feedFilter === 'following' && (
                <Text style={[{ color: colors.textMuted }, tw('text-xs text-center px-8')]}>
                  {t('predictions.followToSee')}
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
            <Text style={[{ color: colors.text }, tw('text-base font-bold')]}>{t('predictions.newTitle')}</Text>
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
            <Text style={[{ color: colors.textSub }, tw('text-xs')]}>{t('predictions.ticker')}</Text>
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
                placeholder={t('predictions.tickerPlaceholder')}
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
            <Text style={[{ color: colors.textSub }, tw('text-xs')]}>{t('predictions.direction')}</Text>
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
                  {t('predictions.up')}
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
                  {t('predictions.down')}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Timeframe */}
          <View style={tw('gap-1')}>
            <Text style={[{ color: colors.textSub }, tw('text-xs')]}>{t('predictions.timeframe')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw('flex-row gap-2')}
            >
              {(['WEEK', 'MONTH', 'THREE_MONTHS', 'SIX_MONTHS', 'NINE_MONTHS', 'YEAR'] as Timeframe[]).map((key) => (
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
                    {getTimeframeLabel(key, t)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Target Price */}
          <View style={tw('gap-1')}>
            <Text style={[{ color: colors.textSub }, tw('text-xs')]}>{t('predictions.targetPriceEgp')}</Text>
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
            <Text style={[{ color: colors.textSub }, tw('text-xs')]}>{t('predictions.reason')}</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={t('predictions.reasonPlaceholder')}
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
              : <Text style={tw('text-sm font-bold text-white')}>{t('predictions.publish')}</Text>}
          </Pressable>
        </ScrollView>
      </Modal>
    </ScreenWrapper>
  );
}
