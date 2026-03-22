import { getStockPrice } from '../lib/stockData.ts';
import { createNotification } from '../lib/createNotification.ts';
import { PredictionRepository } from '../repositories/prediction.repository.ts';
import { PredictionsService } from '../services/predictions.service.ts';
import { logger } from '../lib/logger.ts';

// If a price is unavailable for this many days past expiry, mark the prediction MISSED
// rather than leaving it stuck in ACTIVE forever (e.g. delisted stocks)
const FORCE_RESOLVE_AFTER_DAYS = 3;

/** Resolve all ACTIVE predictions that have expired. Call at market close (e.g. 15:00 Cairo). */
export async function runResolvePredictions(): Promise<void> {
  const expired = await PredictionRepository.findExpiredActive();
  if (expired.length === 0) return;

  logger.info(`Resolving ${expired.length} expired predictions`);

  const now = Date.now();

  for (const p of expired) {
    try {
      const priceData = await getStockPrice(p.ticker);

      if (!priceData || typeof priceData.price !== 'number') {
        const daysOverdue = (now - new Date(p.expiresAt).getTime()) / 86_400_000;
        if (daysOverdue >= FORCE_RESOLVE_AFTER_DAYS) {
          // Price unavailable for too long — force-resolve as MISSED to unblock the user
          await PredictionRepository.updateResolution(p.id, {
            status: 'MISSED',
            resolvedPrice: 0,
            resolvedAt: new Date(),
            pointsEarned: 0,
            accuracyPct: 0,
          });
          logger.warn(`Force-resolved prediction ${p.id} (${p.ticker}) as MISSED: price unavailable for ${daysOverdue.toFixed(1)} days`);
          await createNotification(
            p.userId,
            'prediction_missed',
            'توقعك لم يتحقق',
            `توقعك على ${p.ticker} انتهت مدته ولم يتم التحقق منه.`,
            { route: '/predictions', pushToken: p.user.pushToken ?? undefined }
          );
        } else {
          logger.warn(`Skipping prediction ${p.id}: no price for ${p.ticker} (${daysOverdue.toFixed(1)} days overdue)`);
        }
        continue;
      }

      const result = await PredictionsService.resolveAndScore(p.id, priceData.price);
      if (!result) continue;

      const { status, pointsEarned, userId } = result;
      if (status === 'HIT') {
        await createNotification(
          userId,
          'prediction_hit',
          'تحقق توقعك!',
          `🎯 ${p.ticker} وصل لـ ${priceData.price} جنيه. ربحت ${pointsEarned} نقطة`,
          { route: '/predictions', pushToken: p.user.pushToken ?? undefined }
        );
      } else {
        await createNotification(
          userId,
          'prediction_missed',
          'توقعك لم يتحقق',
          `توقعك على ${p.ticker} لم يتحقق. انتهت المدة.`,
          { route: '/predictions', pushToken: p.user.pushToken ?? undefined }
        );
      }
    } catch (err) {
      logger.error('Resolve prediction error', { predictionId: p.id, error: err });
    }
  }
}

/** Returns true if right now is 15:00–15:59 Cairo (market close). */
export function isCairoMarketCloseHour(): boolean {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    hour12: false,
  });
  const hour = parseInt(formatter.format(new Date()), 10);
  return hour === 15;
}
