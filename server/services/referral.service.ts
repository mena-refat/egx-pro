import { UserRepository } from '../repositories/user.repository.ts';
import { ReferralRepository } from '../repositories/referral.repository.ts';
import { AppError } from '../lib/errors.ts';

export interface ReferralData {
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;
  nextRewardAt: number;
  totalMonthsEarned: number;
  referralProExpiresAt: string | null;
  recentReferrals: Array<{
    id: string;
    isActive: boolean;
    createdAt: Date;
  }>;
}

export const ReferralService = {
  async getReferralData(userId: string): Promise<ReferralData> {
    if (!userId) throw new AppError('UNAUTHORIZED', 401);

    const [referrals, user] = await Promise.all([
      ReferralRepository.findByReferrer(userId, {
        select: {
          id: true,
          isActive: true,
          rewardedAt: true,
          createdAt: true,
          referred: { select: { createdAt: true } },
        },
        orderBy: { createdAt: 'desc' },
      } as { select: object; orderBy: object }),
      UserRepository.findUnique({
        where: { id: userId },
        select: { referralProExpiresAt: true, referralCode: true },
      }),
    ]);

    const referralCode = user?.referralCode ?? '';
    const totalReferrals = referrals.length;
    const activeReferrals = referrals.filter((r) => r.isActive).length;
    const unrewarded = referrals.filter((r) => r.isActive && !r.rewardedAt).length;
    const nextRewardAt =
      unrewarded % 5 === 0 && unrewarded > 0 ? 5 : 5 - (unrewarded % 5);
    const rewardedCount = referrals.filter((r) => r.rewardedAt != null).length;
    const totalMonthsEarned = Math.floor(rewardedCount / 5);

    return {
      referralCode,
      totalReferrals,
      activeReferrals,
      nextRewardAt,
      totalMonthsEarned,
      referralProExpiresAt: user?.referralProExpiresAt?.toISOString() ?? null,
      recentReferrals: referrals.slice(0, 10).map((r) => ({
        id: r.id,
        isActive: r.isActive,
        createdAt: r.createdAt,
      })),
    };
  },
};
