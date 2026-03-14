import { memo, useEffect, useState, useCallback, useRef, Fragment } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Gift,
  Check,
  Users,
  Trophy,
  Crown,
  Share2,
  Link,
  Sparkles,
  Clock,
  AlertCircle,
} from 'lucide-react';
import api from '../../../lib/api';
import { Button } from '../../ui/Button';
import EmptyState from '../../shared/EmptyState';
import { Skeleton } from '../../ui/Skeleton';
import { TIMEOUTS } from '../../../lib/constants';

interface ReferralData {
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;
  nextRewardAt: number;
  totalMonthsEarned: number;
  referralProExpiresAt: string | null;
  recentReferrals: {
    id: string;
    isActive: boolean;
    createdAt: string;
  }[];
}

function ReferralTabInner() {
  const { t, i18n } = useTranslation('common');
  const isRTL = i18n.language.startsWith('ar');
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shared, setShared] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
  }, []);

  const fetchReferrals = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ReferralData | { data: ReferralData }>('/referral', { signal });
      const raw = res.data && typeof res.data === 'object' && 'referralCode' in res.data
        ? (res.data as ReferralData)
        : (res.data as { data?: ReferralData })?.data;
      if (!raw || typeof raw !== 'object') {
        setData(null);
        setError(t('error.loadFailed'));
        return;
      }
      setData({
        ...raw,
        recentReferrals: Array.isArray(raw.recentReferrals) ? raw.recentReferrals : [],
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'ERR_CANCELED') return;
      setData(null);
      setError(t('error.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const controller = new AbortController();
    fetchReferrals(controller.signal);
    return () => controller.abort();
  }, [fetchReferrals]);

  const handleCopyLink = useCallback(async () => {
    if (!data?.referralCode) return;
    const link = `${window.location.origin}/register?ref=${data.referralCode}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopiedLink(false), TIMEOUTS.copiedFeedback);
  }, [data?.referralCode]);

  const handleShare = useCallback(async () => {
    if (!data?.referralCode) return;

    const shareUrl = `${window.location.origin}/register?ref=${data.referralCode}`;
    const shareText = t('referral.shareText', { code: data.referralCode });

    if (navigator.share) {
      try {
        await navigator.share({
          title: t('common.appName'),
          text: shareText,
          url: shareUrl,
        });
      } catch (err: unknown) {
        if ((err as { name?: string }).name === 'AbortError') return;
      }
      return;
    }

    await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    setShared(true);
    if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
    shareTimeoutRef.current = setTimeout(() => setShared(false), TIMEOUTS.copiedFeedback);
  }, [data?.referralCode, t]);

  if (loading) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex flex-col items-center pb-2">
          <Skeleton className="h-14 w-14 rounded-2xl mx-auto mb-3" />
          <Skeleton className="h-6 w-48 rounded-lg mx-auto mb-2" />
          <Skeleton className="h-4 w-64 rounded mx-auto" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Fragment key={i}>
              <Skeleton height={112} className="w-full rounded-2xl" />
            </Fragment>
          ))}
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 gap-4"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="w-12 h-12 rounded-2xl bg-[var(--danger-bg)] flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-[var(--danger)]" />
        </div>
        <p className="text-[var(--text-secondary)] text-sm">{error}</p>
        <Button
          variant="secondary"
          onClick={() => {
            setError(null);
            fetchReferrals();
          }}
        >
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  const recentList = data?.recentReferrals ?? [];
  const hasRecentReferrals = recentList.length > 0;

  if (!data) return null;

  const progressPercent = ((5 - data.nextRewardAt) / 5) * 100;

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pb-2"
      >
        <div className="w-14 h-14 rounded-2xl bg-[var(--brand-subtle)] flex items-center justify-center mx-auto mb-3">
          <Gift className="w-7 h-7 text-[var(--brand)]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          {t('referral.title')}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
          {t('referral.subtitle')}
        </p>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          {
            icon: Users,
            value: data.totalReferrals,
            label: t('referral.totalReferrals'),
            color: 'text-[var(--brand)]',
            bg: 'bg-[var(--brand-subtle)]',
          },
          {
            icon: Check,
            value: data.activeReferrals,
            label: t('referral.activeReferrals'),
            color: 'text-[var(--success)]',
            bg: 'bg-[var(--success-bg)]',
          },
          {
            icon: Crown,
            value: data.totalMonthsEarned,
            label: t('referral.monthsEarned'),
            color: 'text-[var(--warning)]',
            bg: 'bg-[var(--warning-bg)]',
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 text-center"
          >
            <div
              className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-2`}
            >
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className={`text-2xl font-black tabular-nums ${stat.color}`}>
              {stat.value}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-tight">
              {stat.label}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Progress to Next Reward */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[var(--warning)]" />
            <span className="font-semibold text-[var(--text-primary)] text-sm">
              {t('referral.nextReward')}
            </span>
          </div>
          <span className="text-sm font-bold text-[var(--brand)]">
            {5 - data.nextRewardAt} / 5
          </span>
        </div>

        <div className="w-full h-3 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
            className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--brand-hover)]"
          />
        </div>

        <p className="text-xs text-[var(--text-secondary)] mt-2">
          {data.nextRewardAt === 5
            ? t('referral.startInviting')
            : t('referral.progressNote', { count: data.nextRewardAt })}
        </p>

        {data.referralProExpiresAt && (
          <div className="mt-3 flex items-center gap-2 bg-[var(--success-bg)] rounded-xl px-3 py-2">
            <Sparkles className="w-4 h-4 text-[var(--success)] flex-shrink-0" />
            <p className="text-xs text-[var(--success)] font-medium">
              {t('referral.proActive', {
                date: new Date(data.referralProExpiresAt).toLocaleDateString(
                  i18n.language === 'ar' ? 'ar-EG' : 'en-US'
                ),
              })}
            </p>
          </div>
        )}
      </motion.div>

      {/* Referral Code Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-[var(--bg-card)] border-2 border-[var(--brand)] rounded-2xl p-5"
        style={{ boxShadow: '0 0 24px rgba(124,58,237,0.1)' }}
      >
        <p className="text-xs text-[var(--text-muted)] mb-2 font-medium">
          {t('referral.yourCode')}
        </p>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3 font-mono text-lg font-black text-[var(--brand)] tracking-widest text-center select-all mb-3">
          {data.referralCode}
        </div>

        {/* زراران جنب بعض: نسخ الرابط + مشاركة */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={handleCopyLink}
            icon={copiedLink ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
            iconPosition={isRTL ? 'right' : 'left'}
          >
            {copiedLink ? t('referral.linkCopied') : t('referral.copyLink')}
          </Button>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            onClick={handleShare}
            icon={shared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            iconPosition={isRTL ? 'right' : 'left'}
          >
            {shared ? t('success.copied') : t('referral.share')}
          </Button>
        </div>

        <p className="text-xs text-[var(--text-muted)] text-center">
          {t('referral.codeNote')}
        </p>
      </motion.div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5"
      >
        <h3 className="font-semibold text-[var(--text-primary)] mb-4 text-sm">
          {t('referral.howItWorks')}
        </h3>
        <div className="space-y-3">
          {[
            { step: '1', text: t('referral.step1') },
            { step: '2', text: t('referral.step2') },
            { step: '3', text: t('referral.step3') },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[var(--brand-subtle)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-black text-[var(--brand)]">{step}</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Referrals — دايماً نعرض القسم: إما القائمة أو EmptyState */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5"
      >
        <h3 className="font-semibold text-[var(--text-primary)] mb-4 text-sm">
          {t('referral.recentReferrals')}
        </h3>
        {hasRecentReferrals ? (
          <div className="space-y-2">
            {recentList.map((r, i) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${r.isActive ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'}`}
                  />
                  <span className="text-sm text-[var(--text-secondary)]">
                    {t('referral.user')} #{i + 1}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.isActive
                        ? 'bg-[var(--success-bg)] text-[var(--success)]'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                    }`}
                  >
                    {r.isActive ? t('referral.active') : t('referral.pending')}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    <Clock className="w-3 h-3 inline me-1" />
                    {new Date(r.createdAt).toLocaleDateString(
                      i18n.language === 'ar' ? 'ar-EG' : 'en-US'
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title={t('referral.emptyTitle')}
            description={t('referral.emptyDescription')}
            actionLabel={t('referral.copyLink')}
            onAction={handleCopyLink}
          />
        )}
      </motion.div>
    </div>
  );
}

export const ReferralTab = memo(ReferralTabInner);
