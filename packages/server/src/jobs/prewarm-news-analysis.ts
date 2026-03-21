/**
 * Batched News Analysis Prewarm Job
 *
 * Runs every 2 hours during active Cairo hours (06:00 – 23:00).
 * From 23:00 to 06:00 it stops completely.
 * When it resumes at 06:00, it catches up on everything that was published
 * during the night (looks back to the moment it last ran, typically ~10 PM).
 *
 * Lookback window logic:
 *   - Reads `lastRunAt` from Redis
 *   - lookbackFrom = max(lastRunAt, now - MAX_LOOKBACK_H)
 *   - First run ever → 2 hours back
 *   - Morning catchup → from last run before 11 PM (up to MAX_LOOKBACK_H)
 */

import { logger } from '../lib/logger.ts';
import { prisma } from '../lib/prisma.ts';
import { getCache, setCache } from '../lib/redis.ts';
import { NewsAnalysisService } from '../services/news-analysis.service.ts';

const LAST_RUN_KEY   = 'news:prewarm:lastRunAt';
const ACTIVE_FROM_H  = 6;   // 06:00 Cairo — start
const ACTIVE_UNTIL_H = 23;  // 23:00 Cairo — stop (11 PM)
const MAX_LOOKBACK_H = 12;  // never look back more than 12 h (covers full night)
const BATCH_SIZE     = 20;  // max articles per run

/** Current hour (0-23) in Africa/Cairo */
function getCairoHour(): number {
  return parseInt(
    new Intl.DateTimeFormat('en', {
      timeZone: 'Africa/Cairo',
      hour:     'numeric',
      hour12:   false,
    }).format(new Date()),
    10
  );
}

/**
 * Determine how far back to look for articles.
 *
 * - If there's a stored lastRunAt: use it (covers night catchup automatically)
 * - Clamp to MAX_LOOKBACK_H so we never process very stale articles
 * - If no stored value: default to 2 h back
 */
async function getLookbackFrom(now: Date): Promise<Date> {
  const stored = await getCache<string>(LAST_RUN_KEY);

  if (stored) {
    const lastRun  = new Date(stored);
    const maxBack  = new Date(now.getTime() - MAX_LOOKBACK_H * 60 * 60 * 1000);
    // Use whichever is more recent: lastRun or the max-lookback ceiling
    return lastRun > maxBack ? lastRun : maxBack;
  }

  // No stored timestamp → first ever run, look back 2 h
  return new Date(now.getTime() - 2 * 60 * 60 * 1000);
}

export async function runPrewarmNewsAnalysisJob(): Promise<void> {
  const cairoHour = getCairoHour();

  // ── Active-hours gate ────────────────────────────────────────────────────
  if (cairoHour < ACTIVE_FROM_H || cairoHour >= ACTIVE_UNTIL_H) {
    logger.info('News prewarm: outside active hours, skipping', {
      cairoHour,
      activeWindow: `${ACTIVE_FROM_H}:00–${ACTIVE_UNTIL_H}:00`,
    });
    return;
  }

  const now          = new Date();
  const lookbackFrom = await getLookbackFrom(now);
  const isCatchup    = now.getTime() - lookbackFrom.getTime() > 2.5 * 60 * 60 * 1000;

  logger.info('News prewarm: starting', {
    cairoHour,
    lookbackFrom: lookbackFrom.toISOString(),
    windowHours: ((now.getTime() - lookbackFrom.getTime()) / 3_600_000).toFixed(1),
    mode: isCatchup ? 'CATCHUP (morning after night)' : 'NORMAL (2h window)',
  });

  // ── Fetch articles in the lookback window ────────────────────────────────
  let articles: Array<{ title: string; summary: string | null; sourceType: string }>;
  try {
    articles = await prisma.newsItem.findMany({
      where: { publishedAt: { gte: lookbackFrom, lte: now } },
      orderBy: { publishedAt: 'desc' },
      take: BATCH_SIZE,
      select: { title: true, summary: true, sourceType: true },
    });
  } catch (err) {
    logger.error('News prewarm: DB fetch failed', {
      error: err instanceof Error ? err.message : 'UNKNOWN',
    });
    return;
  }

  if (articles.length === 0) {
    logger.info('News prewarm: no new articles in window');
    // Still update lastRunAt so next run has a correct baseline
    await setCache(LAST_RUN_KEY, now.toISOString(), MAX_LOOKBACK_H * 60 * 60);
    return;
  }

  logger.info('News prewarm: processing articles', { count: articles.length });

  let analyzed = 0;
  let cached   = 0;
  let failed   = 0;

  for (const article of articles) {
    try {
      const result = await NewsAnalysisService.analyzeSmart({
        title:       article.title,
        description: article.summary,
        sourceType:  article.sourceType,
      });

      // analyzeSmart logs L1/L2/L3 internally; we track outcomes here
      if (result.impactLevel) {
        // Came back from L1 or L2 → was already cached
        // We can't distinguish here since analyzeSmart handles it internally,
        // so just count all successful calls
        analyzed++;
      } else {
        cached++;
      }
    } catch (err) {
      failed++;
      logger.warn('News prewarm: article failed (non-fatal)', {
        title: article.title.slice(0, 60),
        error: err instanceof Error ? err.message : 'UNKNOWN',
      });
    }
  }

  // ── Save lastRunAt for next run's lookback calculation ───────────────────
  await setCache(LAST_RUN_KEY, now.toISOString(), MAX_LOOKBACK_H * 60 * 60);

  logger.info('News prewarm: done', {
    total: articles.length,
    analyzed: analyzed + cached,
    failed,
    nextWindowFrom: now.toISOString(),
  });
}
