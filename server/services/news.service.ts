import axios from 'axios';
import { getCache, setCache } from '../lib/redis.ts';

const NEWS_API_KEY = process.env.NEWS_API_KEY;

const COMPANY_NAMES: Record<string, string> = {
  COMI: 'البنك التجاري الدولي',
  FWRY: 'فوري',
  TMGH: 'مجموعة طلعت مصطفى',
  ETEL: 'المصرية للاتصالات',
  CLHO: 'كليوباترا',
  ABUK: 'أبو قير للأسمدة',
  EFID: 'إيديتا',
  ORAS: 'أوراسكوم كونستراكشون',
  ORWE: 'النساجون الشرقيون',
  SKPC: 'سيدي كرير',
  EGAS: 'غاز مصر',
  ARCC: 'العربية للأسمنت',
};

export type NewsArticle = {
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  url: string;
};

function mapArticle(article: {
  title: string;
  description: string;
  content: string;
  source: { name: string };
  publishedAt: string;
  url: string;
}): NewsArticle {
  const text = (article.title + ' ' + (article.description || '')).toLowerCase();
  let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  const positiveWords = ['أرباح', 'نمو', 'صعود', 'ارتفاع', 'إيجابي', 'توسع', 'profit', 'growth', 'rise'];
  const negativeWords = ['خسائر', 'هبوط', 'تراجع', 'سلبي', 'انخفاض', 'loss', 'fall', 'decline'];
  if (positiveWords.some((word) => text.includes(word))) sentiment = 'positive';
  else if (negativeWords.some((word) => text.includes(word))) sentiment = 'negative';
  return {
    title: article.title,
    summary: article.description || article.content,
    source: article.source.name,
    publishedAt: article.publishedAt,
    sentiment,
    url: article.url,
  };
}

export const NewsService = {
  async getMarket(): Promise<NewsArticle[]> {
    const cacheKey = 'news_market';
    const cached = await getCache<NewsArticle[]>(cacheKey);
    if (cached) return cached;
    if (!NEWS_API_KEY) throw new Error('NEWS_API_MISSING');
    const query = encodeURIComponent('البورصة المصرية EGX سوق الأسهم مصر');
    const response = await axios.get(
      `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&pageSize=15&apiKey=${NEWS_API_KEY}`
    );
    const news = (response.data.articles || []).map((a: Parameters<typeof mapArticle>[0]) => mapArticle(a));
    await setCache(cacheKey, news, 1800);
    return news;
  },

  async getByTicker(ticker: string): Promise<NewsArticle[]> {
    const companyName = COMPANY_NAMES[ticker] ?? ticker;
    const cacheKey = `news_${ticker}`;
    const cached = await getCache<NewsArticle[]>(cacheKey);
    if (cached) return cached;
    if (!NEWS_API_KEY) throw new Error('NEWS_API_MISSING');
    const query = encodeURIComponent(`${companyName} البورصة المصرية`);
    const response = await axios.get(
      `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&pageSize=10&apiKey=${NEWS_API_KEY}`
    );
    const news = (response.data.articles || []).map((a: Parameters<typeof mapArticle>[0]) => mapArticle(a));
    await setCache(cacheKey, news, 1800);
    return news;
  },
};
