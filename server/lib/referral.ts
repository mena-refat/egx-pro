import { prisma } from './prisma.ts';
import { UserRepository } from '../repositories/user.repository.ts';
import { createNotification } from './createNotification.ts';

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
    let code = 'EGX-';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CHARS[Math.floor(Math.random() * CHARS.length)];
    }

    const existing = await UserRepository.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });

    if (!existing) return code;
  }

  return `EGX-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * When a referred user activates (first login), check if referrer reached 5 active
 * unrewarded referrals and grant 1 free Pro month per 5.
 */
export async function checkAndRewardReferrer(referrerId: string): Promise<void> {
  const unrewardedActive = await prisma.referral.count({
    where: {
      referrerId,
      isActive: true,
      rewardedAt: null,
    },
  });

  const rewardsEarned = Math.floor(unrewardedActive / 5);
  if (rewardsEarned === 0) return;

  const referralsToReward = await prisma.referral.findMany({
    where: {
      referrerId,
      isActive: true,
      rewardedAt: null,
    },
    take: rewardsEarned * 5,
    orderBy: { createdAt: 'asc' },
  });

  const now = new Date();

  const referrer = await UserRepository.findUnique({
    where: { id: referrerId },
    select: { referralProExpiresAt: true },
  });

  const currentExpiry = referrer?.referralProExpiresAt;
  const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const newExpiry = new Date(baseDate.getTime() + rewardsEarned * THIRTY_DAYS_MS);

  await prisma.$transaction([
    UserRepository.update({
      where: { id: referrerId },
      data: { referralProExpiresAt: newExpiry },
    }),
    ...referralsToReward.map((r) =>
      prisma.referral.update({
        where: { id: r.id },
        data: { rewardedAt: now },
      })
    ),
  ]);

  await createNotification(
    referrerId,
    'referral',
    '🎉 مكافأة إحالة!',
    `وصلت لـ ${rewardsEarned * 5} دعوات ناجحة — حصلت على ${rewardsEarned} شهر Pro مجاناً!`,
    { route: '/profile?tab=referrals' }
  );
}
