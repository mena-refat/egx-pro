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
      ReferralRepository.findByReferrer(userId, { orderBy: { createdAt: 'desc' } as object }),
      UserRepository.findUnique({
        where: { id: userId },
        select: { referralProExpiresAt: true, referralCode: true },
      }),
    ]);

    const referralCode = user?.referralCode ?? '';
    const totalReferrals = referrals.length;
    const activeReferrals = referrals.filter((r) => (r as { status?: string }).status === 'completed').length;
    const unrewarded = totalReferrals;
    const nextRewardAt = unrewarded % 5 === 0 && unrewarded > 0 ? 5 : 5 - (unrewarded % 5);
    const totalMonthsEarned = Math.floor(totalReferrals / 5);

    return {
      referralCode,
      totalReferrals,
      activeReferrals,
      nextRewardAt,
      totalMonthsEarned,
      referralProExpiresAt: user?.referralProExpiresAt?.toISOString() ?? null,
      recentReferrals: referrals.slice(0, 10).map((r) => ({
        id: r.id,
        isActive: (r as { status?: string }).status === 'completed',
        createdAt: r.createdAt,
      })),
    };
  },
};
