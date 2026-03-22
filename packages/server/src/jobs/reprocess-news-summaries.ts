/**
 * One-time migration script — re-processes existing news articles in the DB
 * with the updated NEWS_INGEST_SUMMARY_SYSTEM prompt (ultra-short title + clear summary).
 *
 * Run once after updating the prompt:
 *   npx tsx packages/server/src/jobs/reprocess-news-summaries.ts
 *
 * Optional env vars:
 *   REPROCESS_DAYS=30    how many days back to re-process (default: 14)
 *   REPROCESS_BATCH=5    parallel AI calls per batch (default: 5)
 */

import '../lib/dotenv.ts';
import { NewsService } from '../services/news.service.ts';
import { prisma } from '../lib/prisma.ts';

const days      = parseInt(process.env.REPROCESS_DAYS  ?? '14',  10);
const batchSize = parseInt(process.env.REPROCESS_BATCH ?? '5',   10);

async function main() {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const total = await prisma.newsItem.count({ where: { publishedAt: { gte: since } } });

  console.log(`\n📰  Reprocessing news summaries`);
  console.log(`    Period  : last ${days} days (since ${since.toISOString().slice(0, 10)})`);
  console.log(`    Articles: ${total}`);
  console.log(`    Batch   : ${batchSize} parallel AI calls\n`);

  if (total === 0) {
    console.log('✅  Nothing to reprocess.');
    return;
  }

  const start = Date.now();
  const { processed, failed, skipped } = await NewsService.reprocessSummaries({ days, batchSize });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`\n✅  Done in ${elapsed}s`);
  console.log(`    Updated : ${processed}`);
  console.log(`    Skipped : ${skipped}  (stubs / parse errors)`);
  console.log(`    Failed  : ${failed}`);
}

main()
  .catch((err) => { console.error('❌  Fatal:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
