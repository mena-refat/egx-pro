import { prisma } from '../lib/prisma.ts';

export const MobileRepository = {
  async savePushToken(userId: string, token: string, platform: 'ios' | 'android'): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        pushToken: token,
        pushPlatform: platform,
      },
    });
  },
};

