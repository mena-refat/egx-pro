import { Response } from 'express';
import { ProfileService } from '../services/profile.service.ts';
import type { AuthRequest } from '../routes/types.ts';
import { sendSuccess, sendError } from '../lib/apiResponse.ts';
import { logger } from '../lib/logger.ts';

export const ProfileController = {
  async completion(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id ?? req.userId;
      if (!userId) {
        sendError(res, 'UNAUTHORIZED', 401);
        return;
      }
      const result = await ProfileService.getCompletion(userId);
      if (!result) {
        sendError(res, 'NOT_FOUND', 404);
        return;
      }
      sendSuccess(res, result);
    } catch (err) {
      logger.error('Profile completion error', { err });
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },
};
