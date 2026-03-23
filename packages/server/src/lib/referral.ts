import { prisma } from './prisma.ts';
import { UserRepository } from '../repositories/user.repository.ts';
import { createNotification } from './createNotification.ts';
import { REFERRAL_REQUIRED } from './constants/plans.ts';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Generates a unique referral code: EGX-XXXXXXXX
 * 8 random chars (digits + uppercase letters), excluding ambiguous O,0,I,1
 */
export async function generateUniqueReferralCode(): Promise<string> {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const CODE_LENGTH = 8;
  const MAX_ATTEMPTS = 10;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let code = 'BRS-';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CHARS[Math.floor(Math.random() * CHARS.length)];
    }

    const existing = await UserRepository.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });

    if (!existing) return code;
  }

  return `BRS-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * When a referred user activates (first login), check if referrer reached REFERRAL_REQUIRED
 * active referrals and grant 1 free Pro month per REFERRAL_REQUIRED (حالياً 15).
 */
export async function checkAndRewardReferrer(referrerId: number): Promise<void> {
  const activeCount = await prisma.referral.count({
    where: { referrerId },
  });

  const rewardsEarned = Math.floor(activeCount / REFERRAL_REQUIRED);
  if (rewardsEarned === 0) return;

  const now = new Date();

  const referrer = await UserRepository.findUnique({
    where: { id: referrerId },
    select: { referralProExpiresAt: true },
  });

  const currentExpiry = referrer?.referralProExpiresAt;
  const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const newExpiry = new Date(baseDate.getTime() + rewardsEarned * THIRTY_DAYS_MS);

  await UserRepository.update({
    where: { id: referrerId },
    data: { referralProExpiresAt: newExpiry },
  });

  await createNotification(
    referrerId,
    'referral',
    '🎉 مكافأة إحالة!',
    `وصلت لـ ${rewardsEarned * REFERRAL_REQUIRED} دعوات ناجحة — حصلت على ${rewardsEarned} شهر Pro مجاناً!`,
    { route: '/profile?tab=referrals' }
  );
}
