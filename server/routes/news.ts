import { Router } from 'express';
import axios from 'axios';
import { getCache, setCache } from '../lib/redis.ts';
import { logger } from '../lib/logger.ts';

const router = Router();
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
  ARCC: 'العربية للأسمنت'
};

function mapArticle(article: { title: string; description: string; content: string; source: { name: string }; publishedAt: string; url: string }) {
  const text = (article.title + ' ' + (article.description || '')).toLowerCase();
  let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  const positiveWords = ['أرباح', 'نمو', 'صعود', 'ارتفاع', 'إيجابي', 'توسع', 'profit', 'growth', 'rise'];
  const negativeWords = ['خسائر', 'هبوط', 'تراجع', 'سلبي', 'انخفاض', 'loss', 'fall', 'decline'];
  if (positiveWords.some(word => text.includes(word))) sentiment = 'positive';
  else if (negativeWords.some(word => text.includes(word))) sentiment = 'negative';
  return {
    title: article.title,
    summary: article.description || article.content,
    source: article.source.name,
    publishedAt: article.publishedAt,
    sentiment,
    url: article.url
  };
}

router.get('/market', async (req, res) => {
  const cacheKey = 'news_market';
  try {
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);
    if (!NEWS_API_KEY) {
      return res.status(500).json({ error: 'News API key missing' });
    }
    const query = encodeURIComponent('البورصة المصرية EGX سوق الأسهم مصر');
    const response = await axios.get(
      `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&pageSize=15&apiKey=${NEWS_API_KEY}`
    );
    const news = (response.data.articles || []).map((a: { title: string; description: string; content: string; source: { name: string }; publishedAt: string; url: string }) => mapArticle(a));
    await setCache(cacheKey, news, 1800);
    res.json(news);
  } catch (err) {
    logger.error('News API market error', { message: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch market news' });
  }
});

router.get('/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const companyName = COMPANY_NAMES[ticker] || ticker;
  const cacheKey = `news_${ticker}`;

  try {
    const cachedNews = await getCache(cacheKey);
    if (cachedNews) {
      logger.info('Serving cached news', { ticker });
      return res.json(cachedNews);
    }

    if (!NEWS_API_KEY) {
      return res.status(500).json({ error: 'News API key missing' });
    }

    logger.info('Fetching fresh news', { ticker, companyName });
    const query = encodeURIComponent(`${companyName} البورصة المصرية`);
    const response = await axios.get(
      `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&pageSize=10&apiKey=${NEWS_API_KEY}`
    );

    const news = response.data.articles.map((article: { title: string; description: string; content: string; source: { name: string }; publishedAt: string; url: string }) => mapArticle(article));

    await setCache(cacheKey, news, 1800); // 30 minutes
    res.json(news);
  } catch (err) {
    logger.error('News API Error', { ticker, message: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

export default router;
