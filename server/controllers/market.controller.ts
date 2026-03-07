import { Response } from 'express';
import { MarketService } from '../services/market.service.ts';
import { isPro } from '../lib/plan.ts';
import type { AuthRequest } from '../routes/types.ts';

export const MarketController = {
  getStatus: (_req: AuthRequest, res: Response) => {
    try {
      const data = MarketService.getStatus();
      res.json(data);
    } catch {
      res.status(500).json({ error: 'Failed to get market status' });
    }
  },

  getOverview: async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      let delayed = false;
      if (user?.id) {
        const { prisma } = await import('../lib/prisma.ts');
        const u = await prisma.user.findUnique({
          where: { id: user.id },
          select: { plan: true, planExpiresAt: true, referralProExpiresAt: true },
        });
        delayed = u ? !isPro(u) : false;
      }
      const payload = await MarketService.getOverview(delayed);
      res.json(payload);
    } catch (error) {
      console.error('Stocks /market/overview error:', error);
      const { getMarketStatus, getGoldMarketStatus } = await import('../lib/marketHours.ts');
      const fallback = {
        usdEgp: { value: 0, change: 0, changePercent: 0 },
        egx30: { value: 0, change: 0, changePercent: 0 },
        egx30Capped: { value: 0, change: 0, changePercent: 0 },
        egx70: { value: 0, change: 0, changePercent: 0 },
        egx100: { value: 0, change: 0, changePercent: 0 },
        egx33: { value: 0, change: 0, changePercent: 0 },
        egx35: { value: 0, change: 0, changePercent: 0 },
        gold: { value: 0, change: 0, changePercent: 0, valueEgxPerGram: 0, buyEgxPerGram: 0, sellEgxPerGram: 0 },
        silver: { value: 0, change: 0, changePercent: 0, valueEgxPerGram: 0, buyEgxPerGram: 0, sellEgxPerGram: 0 },
        lastUpdated: Date.now(),
        egxStatus: getMarketStatus(),
        goldMarketStatus: getGoldMarketStatus(),
      };
      res.json(fallback);
    }
  },
};
