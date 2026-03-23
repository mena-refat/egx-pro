import { Response, NextFunction } from 'express';
import { MarketService } from '../services/market.service.ts';
import { isPro } from '../lib/plan.ts';
import type { AuthRequest } from '../routes/types.ts';
import { logger } from '../lib/logger.ts';
import { sendSuccess, sendSuccessCached, sendError } from '../lib/apiResponse.ts';
import { HTTP_CACHE_SECONDS } from '../lib/constants.ts';

function run(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const MarketController = {
  getStatus: (_req: AuthRequest, res: Response) => {
    try {
      const data = MarketService.getStatus();
      sendSuccessCached(res, data, {
        maxAgeSec: HTTP_CACHE_SECONDS.marketStatus,
        scope: 'public',
      });
    } catch {
      sendError(res, 'INTERNAL_ERROR', 500);
    }
  },

  getOverview: run(async (req, res) => {
    try {
      const user = req.user;
      let delayed = false;
      if (user?.id) {
        const { UserRepository } = await import('../repositories/user.repository.ts');
        const u = await UserRepository.getPlanUser(user.id);
        delayed = u ? !isPro(u) : false;
      }
      const payload = await MarketService.getOverview(delayed);
      sendSuccessCached(res, payload, {
        maxAgeSec: HTTP_CACHE_SECONDS.marketOverviewPrivate,
        scope: 'private',
        vary: 'Authorization, Cookie',
      });
    } catch (error) {
      logger.error('Stocks /market/overview error', { error });
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
      sendSuccess(res, fallback);
    }
  }),
};
