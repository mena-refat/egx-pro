import { prisma } from '../lib/prisma.ts';
import { logger } from '../lib/logger.ts';
import { setCache } from '../lib/redis.ts';
import { EGX_TICKERS } from '../lib/egxTickers.ts';
import { createNotification } from '../lib/createNotification.ts';
import { marketDataService } from '../services/market-data/market-data.service.ts';

export const DELAYED_PRICES_INTERVAL_MS = 10 * 60 * 1000;

export async function runDelayedPricesJob(): Promise<void> {
  try {
    const now = Date.now();
    const quotes = await marketDataService.getQuotes(EGX_TICKERS);
    await Promise.all(
      Array.from(quotes.entries()).map(([ticker, data]) =>
        setCache(`stock:price:delayed:${ticker}`, {
          ticker: data.symbol,
          price: data.price,
          change: data.change,
          changePercent: data.changePercent,
          volume: data.volume,
          high: data.high,
          low: data.low,
          open: data.open,
          previousClose: data.previousClose,
          name: data.symbol,
          delayedAt: now,
        }, 15 * 60)
      )
    );
    const watchlistAlerts = await prisma.watchlist.findMany({
      where: { targetPrice: { not: null } },
      include: { user: { select: { id: true, notifySignals: true } } },
    });
    const alertTickers = [...new Set(watchlistAlerts.map((a) => a.ticker))];
    const alertQuotes = alertTickers.length > 0 ? await marketDataService.getQuotes(alertTickers) : new Map();
    for (const item of watchlistAlerts) {
      const priceData = alertQuotes.get(item.ticker);
      if (!priceData || item.targetPrice == null) continue;
      const hit = priceData.price >= item.targetPrice;
      const alreadyNotified = item.targetReachedNotifiedAt != null;
      if (hit && !alreadyNotified && item.user.notifySignals) {
        await createNotification(
          item.user.id,
          'stock_target',
          `${item.ticker} وصل للسعر المستهدف`,
          `السعر الحالي ${priceData.price} ج.م — وصل للهدف ${item.targetPrice} ج.م`,
          { route: `/stocks/${item.ticker}` }
        );
        await prisma.watchlist.update({
          where: { id: item.id },
          data: { targetReachedNotifiedAt: new Date() },
        });
      }
      if (!hit && alreadyNotified) {
        await prisma.watchlist.update({
          where: { id: item.id },
          data: { targetReachedNotifiedAt: null },
        });
      }
    }
  } catch (err) {
    logger.error('Delayed prices refresh error', { error: err });
  }
}
