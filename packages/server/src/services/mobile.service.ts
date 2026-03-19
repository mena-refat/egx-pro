import { MobileRepository } from '../repositories/mobile.repository.ts';
import { AppError } from '../lib/errors.ts';

export const MobileService = {
  async registerPushToken(userId: number, token: string, platform: 'ios' | 'android'): Promise<void> {
    if (!token.trim()) {
      throw new AppError('VALIDATION_ERROR', 400);
    }

    await MobileRepository.savePushToken(userId, token.trim(), platform);
  },
};

