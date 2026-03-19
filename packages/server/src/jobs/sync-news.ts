import { logger } from '../lib/logger.ts';
import { NewsService } from '../services/news.service.ts';

export async function runNewsSyncJob(): Promise<void> {
  logger.info('News sync job started');
  const synced = await NewsService.syncMarketSources();
  const deleted = await NewsService.cleanupOldNews();
  logger.info('News sync job finished', { synced, deleted });
}
