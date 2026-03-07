import { getCache, setCache } from './redis.ts';
import { logger } from './logger.ts';

export async function getStockNews(companyName: string) {
  const cacheKey = `news:${companyName}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  try {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
      logger.warn('NEWS_API_KEY is not set. Returning mock news.');
      return [];
    }

    const query = encodeURIComponent(`${companyName} البورصة المصرية`);
    const url = `https://newsapi.org/v2/everything?q=${query}&language=ar&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.statusText}`);
    }

    const data = await response.json();
    const articles = data.articles.map((article: { title: string; description: string; source: { name: string }; publishedAt: string; url: string }) => ({
      title: article.title,
      summary: article.description,
      source: article.source.name,
      publishedAt: article.publishedAt,
      url: article.url,
    }));

    await setCache(cacheKey, articles, 1800); // Cache for 30 minutes
    return articles;
  } catch (error) {
    logger.error('Error fetching news', { companyName, error });
    return [];
  }
}
