import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.ts';
import { generateUniqueReferralCode } from '../lib/referral.ts';
import { logger } from '../lib/logger.ts';
import { ReferralService } from '../services/referral.service.ts';
import type { AuthRequest } from '../routes/types.ts';

function run(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const ReferralController = {
  get: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    try {
      let userData = await prisma.user.findUnique({
        where: { id: userId },
        select: { referralCode: true, referralProExpiresAt: true },
      });

      if (!userData?.referralCode) {
        const code = await generateUniqueReferralCode();
        const updated = await prisma.user.update({
          where: { id: userId },
          data: { referralCode: code },
          select: { referralCode: true, referralProExpiresAt: true },
        });
        userData = updated;
      }

      const data = await ReferralService.getReferralData(userId);
      res.json({ data });
    } catch (err: unknown) {
      logger.error('Failed to fetch referrals', {
        userId,
        error: (err as Error).message,
      });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  }),
};
