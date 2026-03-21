/**
 * News Analysis Pipeline — Smart 4-Stage Architecture
 *
 * ═══════════════════════════════════════════════════════════════════════
 *  LOOKUP ORDER (fastest → slowest)
 * ═══════════════════════════════════════════════════════════════════════
 *  L1  Redis        microseconds   hot cache, 1h TTL
 *  L2  PostgreSQL   milliseconds   persistent, never expires
 *  L3  AI Pipeline  seconds        only runs once per unique article
 *
 *  WRITE ORDER after AI run:
 *    result → DB first (source of truth) → Redis (hot cache)
 *
 * ═══════════════════════════════════════════════════════════════════════
 *  AI PIPELINE STAGES
 * ═══════════════════════════════════════════════════════════════════════
 *  Stage 1+2  Gemini Flash + DB lookup     PARALLEL    ~220 tokens
 *  Stage 3    OpenAI mini                  always      ~400-500 tokens
 *  Stage 4*   Claude                       high/crit   ~1200 tokens
 *   * Stage 4 only for impact_level = "high" | "critical"
 *
 *  Token cost:
 *    low/medium  → stages 1+3 only  ≈  620 tokens  (vs old ~1440, -57%)
 *    high/crit.  → all 4 stages     ≈ 1820 tokens  (much richer output)
 *
 * ═══════════════════════════════════════════════════════════════════════
 *  EGX_DISCLOSURE override:
 *    Official EGX filings are forced to minimum "high" impact — they are
 *    regulatory events that materially affect listed companies.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { createHash } from 'crypto';
import { z } from 'zod';
import { EGX_STOCKS } from '../lib/egxStocks.ts';
import { getCache, setCache } from '../lib/redis.ts';
import { prisma } from '../lib/prisma.ts';
import { analysisEngine } from './ai/index.ts';
import { logger } from '../lib/logger.ts';
import type { NewsImpactLevel } from './ai/types.ts';
import {
  NEWS_QUICK_ANALYSIS_SYSTEM,
  NEWS_STRUCTURE_SYSTEM,
  NEWS_DEEP_REPORT_SYSTEM,
  NEWS_EXTRACTION_SYSTEM,
  NEWS_IMPACT_SYSTEM,
  NEWS_SUMMARY_SYSTEM,
} from '../lib/newsAnalysisPrompts.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Zod schemas
// ─────────────────────────────────────────────────────────────────────────────

const quickAnalysisSchema = z.object({
  summary: z.string().min(1).max(600),
  impact_level: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  quick_sentiment: z.enum(['bullish', 'bearish', 'neutral']).default('neutral'),
});

const structureSchema = z.object({
  summary: z.string().min(1).max(600),
  sentiment: z.enum(['bullish', 'bearish', 'neutral']),
  impact_level: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  affected_sectors: z.array(z.string().min(1).max(80)).max(12).default([]),
  affected_companies: z
    .array(
      z.object({
        symbol: z.string().min(1).max(60),
        impact: z.enum(['positive', 'negative', 'neutral']),
        reason: z.string().min(1).max(200),
      })
    )
    .max(8)
    .default([]),
  key_facts: z.array(z.string().min(1).max(200)).max(4).default([]),
  market_implications: z.string().min(1).max(400).optional(),
  reasoning: z.string().min(1).max(400),
});

const deepReportCompanySchema = z.object({
  symbol: z.string().min(1).max(60),
  analysis: z.string().min(1).max(400),
  recommendation: z.enum(['watch', 'opportunity', 'avoid', 'neutral']),
});

const deepReportSchema = z.object({
  report_title: z.string().min(1).max(200),
  executive_summary: z.string().min(1).max(800),
  market_impact: z.string().min(1).max(600),
  affected_companies_analysis: z.array(deepReportCompanySchema).max(8).default([]),
  risks: z.array(z.string().min(1).max(200)).max(3).default([]),
  opportunities: z.array(z.string().min(1).max(200)).max(3).default([]),
  time_horizon: z.enum(['short_term', 'medium_term', 'long_term']).default('medium_term'),
  confidence: z.enum(['low', 'medium', 'high']).default('medium'),
  conclusion: z.string().min(1).max(400),
});

// Legacy schemas
const summarySchema    = z.object({ summary: z.string().min(1).max(600) });
const extractionSchema = z.object({
  affected_sectors:   z.array(z.string().min(1).max(80)).max(12).default([]),
  mentioned_companies: z.array(z.string().min(1).max(120)).max(12).default([]),
  candidate_symbols:  z.array(z.string().min(1).max(20)).max(12).default([]),
});
const impactCompanySchema = z.object({
  symbol: z.string().min(1).max(20),
  impact: z.enum(['positive', 'negative', 'neutral']),
  reason: z.string().min(1).max(300),
});
const impactSchema = z.object({
  summary:            z.string().min(1).max(600),
  sentiment:          z.enum(['bullish', 'bearish', 'neutral']),
  affected_sectors:   z.array(z.string().min(1).max(80)).max(12).default([]),
  affected_companies: z.array(impactCompanySchema).max(12).default([]),
  reasoning:          z.string().min(1).max(800),
});

export type NewsImpactAnalysis = z.infer<typeof impactSchema> & {
  /** Populated only for high/critical news (Stage 4 — Claude) */
  deepReport?: z.infer<typeof deepReportSchema>;
  /** Impact level determined by Stage 1 (or forced by source type) */
  impactLevel?: NewsImpactLevel;
};

// ─────────────────────────────────────────────────────────────────────────────
// Cache key helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Redis TTL for hot cache — 1h because DB is the source of truth */
const REDIS_HOT_TTL_S = 60 * 60;

function redisKey(contentHash: string, stage: string): string {
  return `ai:news:${stage}:${contentHash}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// L2 — PostgreSQL helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getFromDb(contentHash: string): Promise<NewsImpactAnalysis | null> {
  try {
    const record = await prisma.newsItemAnalysis.findUnique({
      where: { contentHash },
      select: { result: true },
    });
    return record ? (record.result as NewsImpactAnalysis) : null;
  } catch (err) {
    // Non-fatal: if DB lookup fails, fall through to AI
    logger.warn('News analysis DB lookup failed (non-fatal)', {
      hash: contentHash.slice(0, 8),
      error: err instanceof Error ? err.message : 'UNKNOWN',
    });
    return null;
  }
}

async function saveToDb(
  contentHash: string,
  result: NewsImpactAnalysis,
  impactLevel: string
): Promise<void> {
  try {
    await prisma.newsItemAnalysis.upsert({
      where: { contentHash },
      create: { contentHash, result: result as object, impactLevel },
      update: { result: result as object, impactLevel },
    });
  } catch (err) {
    // Non-fatal: analysis is still returned; next call will retry
    logger.warn('News analysis DB save failed (non-fatal)', {
      hash: contentHash.slice(0, 8),
      error: err instanceof Error ? err.message : 'UNKNOWN',
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function truncate(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

function articleHash(title: string, description: string): string {
  return createHash('sha256')
    .update(`${title.trim()}|${description.trim()}`)
    .digest('hex');
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const first = cleaned.indexOf('{');
    const last  = cleaned.lastIndexOf('}');
    if (first !== -1 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1));
    }
    throw new Error('INVALID_JSON_RESPONSE');
  }
}

function normalizeCompanySymbol(rawSymbol: string, mentionedCompanies: string[]): string | null {
  const upper = rawSymbol.trim().toUpperCase();
  const direct = EGX_STOCKS.find((s) => s.ticker.toUpperCase() === upper);
  if (direct) return direct.ticker;
  const byMention = EGX_STOCKS.find((s) =>
    mentionedCompanies.some((c) => {
      const norm = c.trim().toLowerCase();
      return s.nameAr.toLowerCase() === norm || s.nameEn.toLowerCase() === norm;
    })
  );
  return byMention?.ticker ?? null;
}

/** Extract candidate EGX tickers from article text for Stage 2 DB enrichment */
function extractCandidateTickers(text: string): string[] {
  const lower = text.toLowerCase();
  return EGX_STOCKS
    .filter(
      (s) =>
        lower.includes(s.nameAr.toLowerCase()) ||
        lower.includes(s.nameEn.toLowerCase()) ||
        lower.includes(s.ticker.toLowerCase())
    )
    .map((s) => s.ticker)
    .slice(0, 5);
}

/**
 * Stage 2 — DB enrichment (0 AI tokens, runs in parallel with Stage 1)
 * Fetches up to 4 related articles from the already-synced NewsItem table.
 */
async function fetchRelatedContext(
  candidateTickers: string[],
  newsHash: string
): Promise<string> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const where =
      candidateTickers.length > 0
        ? { publishedAt: { gte: sevenDaysAgo }, tickers: { some: { ticker: { in: candidateTickers } } } }
        : { publishedAt: { gte: sevenDaysAgo }, isMarketWide: true };

    const related = await prisma.newsItem.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: 4,
      select: { title: true, summary: true },
    });

    if (related.length === 0) return '';

    const lines = related
      .map((r) => `- ${r.title}${r.summary ? ': ' + r.summary.slice(0, 120) : ''}`)
      .join('\n');

    logger.info('News pipeline stage 2: enriched', {
      count: related.length,
      hash: newsHash.slice(0, 8),
    });

    return `\n\nRelated recent news for context:\n${lines}`;
  } catch (err) {
    logger.warn('News pipeline stage 2: enrichment failed (non-fatal)', {
      error: err instanceof Error ? err.message : 'UNKNOWN',
    });
    return '';
  }
}

/**
 * Cached AI stage runner — uses Redis as intermediate stage cache only.
 * The final assembled result is what gets persisted to PostgreSQL.
 */
async function runCachedStage<T>(
  taskType: Parameters<typeof analysisEngine.generate>[0]['taskType'],
  stageKey: string,
  newsHash: string,
  systemPrompt: string,
  userMessage: string,
  schema: z.ZodSchema<T>,
  maxTokens: number
): Promise<T> {
  const key = redisKey(newsHash, stageKey);
  const cached = await getCache<T>(key);
  if (cached) return cached;

  const result = await analysisEngine.generate({
    taskType,
    systemPrompt,
    userMessage,
    maxTokens,
    responseType: 'json',
    temperature: 0.1,
  });

  const parsed = schema.parse(parseJson(result.text));
  // Intermediate stage results: 2h TTL (only needed during pipeline run)
  await setCache(key, parsed, 2 * 60 * 60);
  return parsed;
}

/**
 * EGX_DISCLOSURE override — official EGX filings are always at minimum "high".
 */
function enforceSourceOverride(
  impactLevel: NewsImpactLevel,
  sourceType?: string
): NewsImpactLevel {
  if (
    sourceType === 'EGX_DISCLOSURE' &&
    (impactLevel === 'low' || impactLevel === 'medium')
  ) {
    return 'high';
  }
  return impactLevel;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export const NewsAnalysisService = {
  /**
   * Smart 4-stage pipeline with 3-layer result lookup.
   *
   * Lookup: Redis L1 → PostgreSQL L2 → AI Pipeline L3
   * Write:  AI result → PostgreSQL (source of truth) → Redis (hot cache)
   *
   * @param input.sourceType  Pass 'EGX_DISCLOSURE' for official EGX filings
   *                          to force impact level floor at "high".
   */
  async analyzeSmart(input: {
    title: string;
    description?: string | null;
    sourceType?: string;
  }): Promise<NewsImpactAnalysis> {
    const title       = truncate(input.title, 400);
    const description = truncate(input.description ?? '', 1600);
    const contentHash = articleHash(title, description);
    const articleBlock = `Title: ${title}\nDescription: ${description || 'N/A'}`;
    const hotKey = redisKey(contentHash, 'final');

    // ── L1: Redis hot cache ──────────────────────────────────────────────
    const redisHit = await getCache<NewsImpactAnalysis>(hotKey);
    if (redisHit) {
      logger.info('News analysis: L1 Redis hit', { hash: contentHash.slice(0, 8) });
      return redisHit;
    }

    // ── L2: PostgreSQL persistent store ─────────────────────────────────
    const dbHit = await getFromDb(contentHash);
    if (dbHit) {
      logger.info('News analysis: L2 DB hit', { hash: contentHash.slice(0, 8) });
      // Warm Redis so next hit is instant
      void setCache(hotKey, dbHit, REDIS_HOT_TTL_S);
      return dbHit;
    }

    // ── L3: AI Pipeline ─────────────────────────────────────────────────
    logger.info('News analysis: L3 AI pipeline start', { hash: contentHash.slice(0, 8) });

    const candidateTickers = extractCandidateTickers(`${title} ${description}`);

    // Stage 1 + Stage 2 — PARALLEL (saves ~200-400ms on high-impact articles)
    const [quickAnalysis, enrichmentContextRaw] = await Promise.all([
      runCachedStage(
        'news_quick_analysis', 'quick', contentHash,
        NEWS_QUICK_ANALYSIS_SYSTEM, articleBlock,
        quickAnalysisSchema, 220
      ),
      fetchRelatedContext(candidateTickers, contentHash),
    ]);

    // Apply EGX_DISCLOSURE floor after Stage 1
    const impactLevel: NewsImpactLevel = enforceSourceOverride(
      quickAnalysis.impact_level,
      input.sourceType
    );
    const isHighImpact = impactLevel === 'high' || impactLevel === 'critical';
    const enrichmentContext = isHighImpact ? enrichmentContextRaw : '';

    logger.info('News pipeline stage 1+2 done', {
      hash: contentHash.slice(0, 8),
      rawImpact: quickAnalysis.impact_level,
      effectiveImpact: impactLevel,
      enriched: enrichmentContext.length > 0,
    });

    // Stage 3 — OpenAI: comprehensive JSON
    // FIX: ':enriched' suffix prevents returning a stale non-enriched cache
    // when the same article is later re-analyzed with enrichment available.
    const stage3Key = enrichmentContext ? 'structure_enriched' : 'structure';
    const structureUserMsg =
      `Article:\n${articleBlock}\n\n` +
      `AI Summary: ${quickAnalysis.summary}\n` +
      `Impact Level: ${impactLevel}\n` +
      `Sentiment: ${quickAnalysis.quick_sentiment}` +
      enrichmentContext;

    const structured = await runCachedStage(
      'news_structure', stage3Key, contentHash,
      NEWS_STRUCTURE_SYSTEM, structureUserMsg,
      structureSchema, isHighImpact ? 500 : 400
    );

    logger.info('News pipeline stage 3 done', {
      hash: contentHash.slice(0, 8),
      companies: structured.affected_companies.length,
    });

    // Normalize company symbols
    const mentionedNames = structured.affected_companies.map((c) => c.symbol);
    const normalizedCompanies = structured.affected_companies
      .map((c) => {
        const symbol = normalizeCompanySymbol(c.symbol, mentionedNames);
        return symbol ? { ...c, symbol } : null;
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    const result: NewsImpactAnalysis = {
      summary:            structured.summary,
      sentiment:          structured.sentiment,
      affected_sectors:   structured.affected_sectors,
      affected_companies: normalizedCompanies,
      reasoning:          structured.reasoning,
      impactLevel,
    };

    // Stage 4 — Claude: deep investment report (high/critical only)
    if (isHighImpact) {
      try {
        const reportPayload = {
          summary:             structured.summary,
          sentiment:           structured.sentiment,
          impact_level:        impactLevel,
          affected_sectors:    structured.affected_sectors,
          affected_companies:  normalizedCompanies,
          key_facts:           structured.key_facts,
          market_implications: structured.market_implications,
          reasoning:           structured.reasoning,
        };

        const deepReport = await runCachedStage(
          'news_deep_report', 'deep_report', contentHash,
          NEWS_DEEP_REPORT_SYSTEM,
          `Structured news analysis:\n${JSON.stringify(reportPayload, null, 2)}`,
          deepReportSchema, 1200
        );

        result.deepReport = deepReport;
        logger.info('News pipeline stage 4 done', {
          hash: contentHash.slice(0, 8),
          confidence: deepReport.confidence,
        });
      } catch (err) {
        // Stage 4 failure is non-fatal — stages 1-3 result is still saved
        logger.warn('News pipeline stage 4 failed (non-fatal, saving without deepReport)', {
          hash: contentHash.slice(0, 8),
          error: err instanceof Error ? err.message : 'UNKNOWN',
        });
      }
    }

    // ── Persist result: DB first (source of truth), then Redis (hot cache) ──
    await saveToDb(contentHash, result, impactLevel);
    void setCache(hotKey, result, REDIS_HOT_TTL_S);

    logger.info('News analysis: saved to DB + Redis', {
      hash: contentHash.slice(0, 8),
      impactLevel,
      hasDeepReport: !!result.deepReport,
    });

    return result;
  },

  /**
   * Legacy 3-stage pipeline (backward compat only).
   * Prefer `analyzeSmart` for all new code.
   */
  async analyzeArticle(input: {
    title: string;
    description?: string | null;
  }): Promise<NewsImpactAnalysis> {
    const title       = truncate(input.title, 400);
    const description = truncate(input.description ?? '', 1600);
    const contentHash = articleHash(title, description);
    const articleBlock = `Title: ${title}\nDescription: ${description || 'N/A'}`;

    // Legacy still checks Redis + DB for consistency
    const redisHit = await getCache<NewsImpactAnalysis>(redisKey(contentHash, 'final_legacy'));
    if (redisHit) return redisHit;

    const dbHit = await getFromDb(contentHash);
    if (dbHit) {
      void setCache(redisKey(contentHash, 'final_legacy'), dbHit, REDIS_HOT_TTL_S);
      return dbHit;
    }

    const summary = await runCachedStage(
      'news_summarization', 'summary', contentHash,
      NEWS_SUMMARY_SYSTEM, articleBlock, summarySchema, 220
    );
    const extraction = await runCachedStage(
      'news_extraction', 'extraction', contentHash,
      NEWS_EXTRACTION_SYSTEM, articleBlock, extractionSchema, 320
    );
    const impactPrompt = `
Article:
${articleBlock}

Summary:
${summary.summary}

Affected sectors candidates:
${extraction.affected_sectors.join(', ') || 'None'}

Mentioned companies:
${extraction.mentioned_companies.join(', ') || 'None'}

Candidate EGX symbols:
${extraction.candidate_symbols.join(', ') || 'None'}
`.trim();

    const impact = await runCachedStage(
      'news_market_impact', 'impact', contentHash,
      NEWS_IMPACT_SYSTEM, impactPrompt, impactSchema, 900
    );

    const normalizedCompanies = impact.affected_companies
      .map((c) => {
        const symbol = normalizeCompanySymbol(c.symbol, extraction.mentioned_companies);
        return symbol ? { ...c, symbol } : null;
      })
      .filter((c): c is NewsImpactAnalysis['affected_companies'][number] => c !== null);

    const finalResult: NewsImpactAnalysis = {
      summary:            impact.summary || summary.summary,
      sentiment:          impact.sentiment,
      affected_sectors:   Array.from(new Set([
        ...extraction.affected_sectors,
        ...impact.affected_sectors,
      ])).slice(0, 12),
      affected_companies: normalizedCompanies,
      reasoning:          impact.reasoning,
    };

    await saveToDb(contentHash, finalResult, 'unknown');
    void setCache(redisKey(contentHash, 'final_legacy'), finalResult, REDIS_HOT_TTL_S);
    return finalResult;
  },
};
