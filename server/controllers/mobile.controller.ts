import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../routes/types.ts';
import { MobileService } from '../services/mobile.service.ts';
import { sendSuccess, sendError } from '../lib/apiResponse.ts';

export const MobileController = {
  registerPushToken: async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) return sendError(res, 'UNAUTHORIZED', 401);

    try {
      const { token, platform } = (req.body || {}) as {
        token?: string;
        platform?: 'ios' | 'android';
      };

      if (!token?.trim()) return sendError(res, 'VALIDATION_ERROR', 400);

      await MobileService.registerPushToken(userId, token.trim(), platform ?? 'android');
      sendSuccess(res, { ok: true });
    } catch (err) {
      next(err);
    }
  },
};

