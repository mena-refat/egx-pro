import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, ArrowRight, Gift, Users, Crown,
  Copy, Share2, Trophy, Sparkles, Check,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import apiClient from '../../lib/api/client';

interface ReferralData {
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;
  nextRewardAt: number;  // referrals needed to unlock next free month
  referralsRequired: number;
  totalMonthsEarned: number;
  referralProExpiresAt: string | null;
  recentReferrals: {
    id: string;
    isActive: boolean;
    createdAt: string;
  }[];
}

export default function ReferralPage() {
  const router = useRouter();
  const { colors, isRTL } = useTheme();
  const { t } = useTranslation();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const mountedRef = useRef(true);
  const ArrowIcon = isRTL ? ArrowRight : ArrowLeft;

  const timeAgo = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (diff < 60) return t('referral.timeNow');
    if (diff < 3600) return t('referral.timeMinutes', { m: Math.floor(diff / 60) });
    if (diff < 86400) return t('referral.timeHours', { h: Math.floor(diff / 3600) });
    if (diff < 604800) return t('referral.timeDays', { d: Math.floor(diff / 86400) });
    return new Date(d).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
  };

  useEffect(() => () => { mountedRef.current = false; }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await apiClient.get('/api/referral', { signal });
      const raw = res.data as ReferralData | { data?: ReferralData };
      const d = 'referralCode' in (raw as object) ? (raw as ReferralData) : (raw as { data?: ReferralData }).data;
      if (!signal?.aborted && mountedRef.current && d) setData(d);
    } catch {
      // silent
    } finally {
      if (!signal?.aborted && mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const copyCode = async () => {
    if (!data?.referralCode) return;
    await Clipboard.setStringAsync(data.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCode = async () => {
    if (!data?.referralCode) return;
    await Share.share({
      message: t('referral.shareMessage', { code: data.referralCode }),
      title: t('referral.shareTitle'),
    });
  };

  const required = data?.referralsRequired ?? 15;
  const active = data?.activeReferrals ?? 0;
  const mod = required > 0 ? active % required : 0;
  const completedCycle = mod === 0 && active > 0;
  const progress = required > 0 ? (completedCycle ? 1 : mod / required) : 0;
  const remaining = completedCycle ? 0 : required - mod;
  const achievedInCycle = completedCycle ? required : mod;
  const progressPct = Math.round(progress * 100);

  return (
    <ScreenWrapper padded={false}>
      {/* Header */}
      <View
        style={{ borderBottomColor: colors.border, borderBottomWidth: 0.5, flexDirection: isRTL ? 'row-reverse' : 'row' }}
        className="items-center gap-3 px-4 pt-5 pb-4"
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ backgroundColor: colors.hover, borderColor: colors.border }}
          className="w-9 h-9 rounded-xl border items-center justify-center"
        >
          <ArrowIcon size={16} color={colors.textSub} />
        </Pressable>
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-xl items-center justify-center" style={{ backgroundColor: '#f59e0b18' }}>
            <Gift size={15} color="#f59e0b" />
          </View>
          <Text style={{ color: colors.text }} className="text-base font-bold">{t('referral.title')}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 36 }}>
        {loading ? (
          <View style={{ gap: 16 }}>
            <Skeleton.Box height={120} radius={24} />
            <Skeleton.Box height={80} radius={24} />
            <Skeleton.Box height={160} radius={24} />
          </View>
        ) : !data ? (
          <View className="items-center py-24 gap-3">
            <Gift size={32} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted }} className="text-sm">{t('referral.loadError')}</Text>
          </View>
        ) : (
          <>
            {/* Hero card */}
            <View className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 items-center gap-3">
              <View className="w-14 h-14 rounded-full bg-amber-500/20 items-center justify-center">
                <Gift size={26} color="#f59e0b" />
              </View>
              <Text style={{ color: colors.text }} className="text-base font-bold text-center">
                {t('referral.heroTitle')}
              </Text>
              <Text style={{ color: colors.textSub }} className="text-xs text-center leading-5">
                {remaining === 0
                  ? t('referral.readyForReward')
                  : t('referral.inviteN', { count: remaining })}
              </Text>

              {/* Referral code */}
              <View
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                className="w-full border rounded-xl flex-row items-center px-4 py-3 mt-1"
              >
                <View className="flex-1">
                  <Text style={{ color: colors.textMuted }} className="text-xs mb-0.5">{t('referral.code')}</Text>
                  <Text style={{ color: colors.text }} className="text-base font-bold tracking-widest">
                    {data.referralCode}
                  </Text>
                </View>
                <Pressable
                  onPress={copyCode}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ backgroundColor: copied ? '#4ade8018' : '#8b5cf618' }}
                  className="w-9 h-9 rounded-xl items-center justify-center"
                >
                  {copied
                    ? <Check size={16} color="#4ade80" />
                    : <Copy size={16} color="#8b5cf6" />}
                </Pressable>
              </View>

              {/* Share button */}
              <Pressable
                onPress={shareCode}
                className="w-full bg-amber-500 rounded-xl py-3 flex-row items-center justify-center gap-2"
              >
                <Share2 size={15} color="#fff" />
                <Text className="text-sm font-bold text-white">{t('referral.share')}</Text>
              </Pressable>
            </View>

            {/* Progress */}
            <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl p-4 gap-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Crown size={14} color="#8b5cf6" />
                  <Text style={{ color: colors.text }} className="text-sm font-semibold">{t('referral.progress')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.textMuted }} className="text-xs">
                    {achievedInCycle}/{required}
                  </Text>
                  <Text style={{ color: colors.textSub }} className="text-[10px]">
                    {t('referral.progressPct', { pct: progressPct })}
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={{ backgroundColor: colors.hover }} className="h-2 rounded-full overflow-hidden">
                <View
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${progress * 100}%` }}
                />
              </View>

              <Text style={{ color: colors.textMuted }} className="text-xs">
                {remaining === 0
                  ? t('referral.rewardAchieved')
                  : remaining === required
                    ? t('referral.inviteToGet', { count: required })
                    : t('referral.remainingInvites', { count: remaining })}
              </Text>

              {/* Expiry if active */}
              {data.referralProExpiresAt && (
                <View className="flex-row items-center gap-2 bg-brand/10 rounded-xl px-3 py-2">
                  <Sparkles size={12} color="#8b5cf6" />
                  <Text className="text-xs text-brand font-medium">
                    {t('referral.proUntil', { date: new Date(data.referralProExpiresAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { month: 'long', day: 'numeric' }) })}
                  </Text>
                </View>
              )}
            </View>

            {/* Stats */}
            <View className="flex-row gap-3">
              {[
                { label: t('referral.totalReferrals'), value: data.totalReferrals, icon: Users, color: '#3b82f6' },
                { label: t('referral.activeReferrals'), value: data.activeReferrals, icon: Check, color: '#4ade80' },
                { label: t('referral.freeMonths'), value: data.totalMonthsEarned, icon: Trophy, color: '#f59e0b' },
              ].map((s) => (
                <View
                  key={s.label}
                  style={{ backgroundColor: colors.card, borderColor: colors.border }}
                  className="flex-1 border rounded-2xl p-3 items-center gap-1.5"
                >
                  <View className="w-8 h-8 rounded-xl items-center justify-center" style={{ backgroundColor: `${s.color}18` }}>
                    <s.icon size={14} color={s.color} />
                  </View>
                  <Text style={{ color: colors.text }} className="text-xl font-bold">{s.value}</Text>
                  <Text style={{ color: colors.textMuted }} className="text-[10px] text-center leading-4">{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Recent referrals */}
            {data.recentReferrals.length > 0 && (
              <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl overflow-hidden">
                <View style={{ borderBottomColor: colors.border, borderBottomWidth: 0.5 }} className="px-4 py-3">
                  <Text style={{ color: colors.textSub }} className="text-xs font-semibold">{t('referral.recentTitle')}</Text>
                </View>
                {data.recentReferrals.map((r, i) => (
                  <View
                    key={r.id}
                    style={[
                      { borderBottomColor: colors.border2 },
                      i < data.recentReferrals.length - 1 && { borderBottomWidth: 1 },
                    ]}
                    className="flex-row items-center justify-between px-4 py-3"
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className="w-8 h-8 rounded-full items-center justify-center"
                        style={{ backgroundColor: r.isActive ? '#4ade8018' : colors.hover }}
                      >
                        <Users size={14} color={r.isActive ? '#4ade80' : colors.textMuted} />
                      </View>
                      <View>
                        <Text style={{ color: colors.text }} className="text-sm font-medium">
                          {t('referral.newUser')}
                        </Text>
                        <Text style={{ color: colors.textMuted }} className="text-xs">{timeAgo(r.createdAt)}</Text>
                      </View>
                    </View>
                    <View
                      className="px-2 py-0.5 rounded-lg"
                      style={{ backgroundColor: r.isActive ? '#4ade8015' : colors.hover }}
                    >
                      <Text className="text-[11px] font-bold" style={{ color: r.isActive ? '#4ade80' : colors.textMuted }}>
                        {r.isActive ? t('referral.active') : t('referral.inactive')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* How it works */}
            <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl p-4 gap-3">
              <Text style={{ color: colors.textSub }} className="text-xs font-semibold">{t('referral.howItWorks')}</Text>
              {[
                { step: t('referral.stepNum1'), text: t('referral.step1') },
                { step: t('referral.stepNum2'), text: t('referral.step2', { count: required }) },
                { step: t('referral.stepNum3'), text: t('referral.step3') },
                { step: t('referral.stepNum4'), text: t('referral.step4', { count: required }) },
              ].map((item) => (
                <View key={item.step} className="flex-row items-start gap-3">
                  <View className="w-6 h-6 rounded-full bg-brand/20 items-center justify-center shrink-0">
                    <Text className="text-xs font-bold text-brand">{item.step}</Text>
                  </View>
                  <Text style={{ color: colors.textSub }} className="text-sm leading-5 flex-1">{item.text}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
