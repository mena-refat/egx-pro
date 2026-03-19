import { Response, NextFunction } from 'express';
import { UserRepository } from '../repositories/user.repository.ts';
import { generateUniqueReferralCode } from '../lib/referral.ts';
import { logger } from '../lib/logger.ts';
import { ReferralService } from '../services/referral.service.ts';
import type { AuthRequest } from '../routes/types.ts';
import { sendSuccess, sendError } from '../lib/apiResponse.ts';

function run(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const ReferralController = {
  get: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }

    try {
      let userData = await UserRepository.findUnique({
        where: { id: userId },
        select: { referralCode: true, referralProExpiresAt: true },
      });

      if (!userData?.referralCode) {
        const code = await generateUniqueReferralCode();
        const updated = await UserRepository.update({
          where: { id: userId },
          data: { referralCode: code },
          select: { referralCode: true, referralProExpiresAt: true },
        });
        userData = updated;
      }

      const data = await ReferralService.getReferralData(userId);
      sendSuccess(res, data);
    } catch (err: unknown) {
      logger.error('Failed to fetch referrals', {
        userId,
        error: (err as Error).message,
      });
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  }),
};
