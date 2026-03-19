import { createHash } from 'crypto';
import { z } from 'zod';
import { EGX_STOCKS } from '../lib/egxStocks.ts';
import { getCache, setCache } from '../lib/redis.ts';
import { analysisEngine } from './ai/index.ts';
import { NEWS_EXTRACTION_SYSTEM, NEWS_IMPACT_SYSTEM, NEWS_SUMMARY_SYSTEM } from '../lib/newsAnalysisPrompts.ts';

const summarySchema = z.object({
  summary: z.string().min(1).max(600),
});

const extractionSchema = z.object({
  affected_sectors: z.array(z.string().min(1).max(80)).max(12).default([]),
  mentioned_companies: z.array(z.string().min(1).max(120)).max(12).default([]),
  candidate_symbols: z.array(z.string().min(1).max(20)).max(12).default([]),
});

const impactCompanySchema = z.object({
  symbol: z.string().min(1).max(20),
  impact: z.enum(['positive', 'negative', 'neutral']),
  reason: z.string().min(1).max(300),
});

const impactSchema = z.object({
  summary: z.string().min(1).max(600),
  sentiment: z.enum(['bullish', 'bearish', 'neutral']),
  affected_sectors: z.array(z.string().min(1).max(80)).max(12).default([]),
  affected_companies: z.array(impactCompanySchema).max(12).default([]),
  reasoning: z.string().min(1).max(800),
});

export type NewsImpactAnalysis = z.infer<typeof impactSchema>;

function truncate(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

function articleHash(title: string, description: string): string {
  return createHash('sha256')
    .update(`${title.trim()}|${description.trim()}`)
    .digest('hex');
}

function cacheKey(newsHash: string, analysisType: string): string {
  return `ai:news:${analysisType}:${newsHash}`;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('INVALID_JSON_RESPONSE');
  }
}

async function runCachedTask<T>(
  taskType: 'news_summarization' | 'news_extraction' | 'news_market_impact',
  analysisType: string,
  newsHash: string,
  systemPrompt: string,
  userMessage: string,
  schema: z.ZodSchema<T>,
  maxTokens: number
): Promise<T> {
  const key = cacheKey(newsHash, analysisType);
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
  await setCache(key, parsed, 24 * 60 * 60);
  return parsed;
}

function normalizeCompanySymbol(rawSymbol: string, mentionedCompanies: string[]): string | null {
  const upper = rawSymbol.trim().toUpperCase();
  const direct = EGX_STOCKS.find((stock) => stock.ticker.toUpperCase() === upper);
  if (direct) return direct.ticker;

  const byMention = EGX_STOCKS.find((stock) =>
    mentionedCompanies.some((company) => {
      const normalizedCompany = company.trim().toLowerCase();
      return (
        stock.nameAr.toLowerCase() === normalizedCompany ||
        stock.nameEn.toLowerCase() === normalizedCompany
      );
    })
  );
  return byMention?.ticker ?? null;
}

export const NewsAnalysisService = {
  async analyzeArticle(input: { title: string; description?: string | null }): Promise<NewsImpactAnalysis> {
    const title = truncate(input.title, 400);
    const description = truncate(input.description ?? '', 1600);
    const newsHash = articleHash(title, description);
    const cachedFinal = await getCache<NewsImpactAnalysis>(cacheKey(newsHash, 'final'));
    if (cachedFinal) return cachedFinal;
    const articleBlock = `Title: ${title}\nDescription: ${description || 'N/A'}`;

    const summary = await runCachedTask(
      'news_summarization',
      'summary',
      newsHash,
      NEWS_SUMMARY_SYSTEM,
      articleBlock,
      summarySchema,
      220
    );

    const extraction = await runCachedTask(
      'news_extraction',
      'extraction',
      newsHash,
      NEWS_EXTRACTION_SYSTEM,
      articleBlock,
      extractionSchema,
      320
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

    const impact = await runCachedTask(
      'news_market_impact',
      'impact',
      newsHash,
      NEWS_IMPACT_SYSTEM,
      impactPrompt,
      impactSchema,
      900
    );

    const normalizedCompanies = impact.affected_companies
      .map((company) => {
        const symbol = normalizeCompanySymbol(company.symbol, extraction.mentioned_companies);
        if (!symbol) return null;
        return { ...company, symbol };
      })
      .filter((company): company is NewsImpactAnalysis['affected_companies'][number] => company !== null);

    const finalResult: NewsImpactAnalysis = {
      summary: impact.summary || summary.summary,
      sentiment: impact.sentiment,
      affected_sectors: Array.from(new Set([...extraction.affected_sectors, ...impact.affected_sectors])).slice(0, 12),
      affected_companies: normalizedCompanies,
      reasoning: impact.reasoning,
    };

    await setCache(cacheKey(newsHash, 'final'), finalResult, 24 * 60 * 60);
    return finalResult;
  },
};
