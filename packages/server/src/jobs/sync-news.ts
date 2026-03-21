import { logger } from '../lib/logger.ts';
import { NewsService } from '../services/news.service.ts';

/**
 * Fetches new articles from all sources (NewsAPI, Google RSS, EGX disclosures)
 * and persists them to the database.
 *
 * Runs every 30 minutes, 24/7 — source fetching has no time restriction.
 * AI analysis is handled separately by the prewarm-news-analysis job (every 2h,
 * active hours 06:00–23:00 Cairo only).
 */
export async function runNewsSyncJob(): Promise<void> {
  logger.info('News sync job started');
  const synced  = await NewsService.syncMarketSources();
  const deleted = await NewsService.cleanupOldNews();
  logger.info('News sync job finished', { synced, deleted });
}
