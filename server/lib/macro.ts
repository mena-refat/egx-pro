import YahooFinance from 'yahoo-finance2';
import { getCache, setCache } from './redis.ts';
import { logger } from './logger.ts';

const yahooFinance = new YahooFinance();

export async function getMarketOverview() {
  const cacheKey = 'market:overview';
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  try {
    // Fetch USD/EGP rate
    let usdEgp = { value: 0, change: 0, changePercent: 0 };
    try {
      const apiKey = process.env.EXCHANGERATE_API_KEY;
      const url = apiKey 
        ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`
        : 'https://api.exchangerate-api.com/v4/latest/USD';
      
      const exchangeResponse = await fetch(url);
      if (exchangeResponse.ok) {
        const exchangeData = await exchangeResponse.json();
        const rate = apiKey ? exchangeData.conversion_rates.EGP : exchangeData.rates.EGP;
        usdEgp = {
          value: rate,
          change: 0, // Mock change for now as the API doesn't provide historical data directly
          changePercent: 0,
        };
      }
    } catch (error) {
      logger.error('Error fetching exchange rate', { error });
    }

    // Fetch EGX Indices — EGX 30, 30 Capped, 70 EWI, 100 EWI, 33 Shariah, 35 LV
    const indexTickers = ['^EGX30', '^EGX70', '^EGX100', '^EGX33', '^EGX35'];
    const indicesData = await Promise.allSettled(
      indexTickers.map(ticker => yahooFinance.quote(ticker))
    );

    const formatIndex = (result: PromiseSettledResult<unknown>) => {
      if (result.status === 'fulfilled' && result.value) {
        const val = result.value as { regularMarketPrice: number; regularMarketChange: number; regularMarketChangePercent: number };
        return {
          value: val.regularMarketPrice,
          change: val.regularMarketChange,
          changePercent: val.regularMarketChangePercent,
        };
      }
      return { value: 0, change: 0, changePercent: 0 };
    };

    const egx30 = formatIndex(indicesData[0]);
    const egx70 = formatIndex(indicesData[1]);
    const egx100 = formatIndex(indicesData[2]);
    const egx33 = formatIndex(indicesData[3]);
    const egx35 = formatIndex(indicesData[4]);

    // Gold (GC=F) and Silver (SI=F) in USD per troy oz
    const commodities = ['GC=F', 'SI=F'];
    const commoditiesData = await Promise.allSettled(
      commodities.map((ticker) => yahooFinance.quote(ticker))
    );
    const formatCommodity = (result: PromiseSettledResult<unknown>) => {
      if (result.status === 'fulfilled' && result.value) {
        const val = result.value as { regularMarketPrice: number; regularMarketChange: number; regularMarketChangePercent: number };
        return {
          value: val.regularMarketPrice,
          change: val.regularMarketChange,
          changePercent: val.regularMarketChangePercent,
        };
      }
      return { value: 0, change: 0, changePercent: 0 };
    };
    const goldUsd = formatCommodity(commoditiesData[0]);
    const silverUsd = formatCommodity(commoditiesData[1]);
    const ozToGram = 1 / 31.1035;
    const usdRate = usdEgp.value || 1;
    const spread = 0.02; // ~2% فرق شراء/بيع
    const goldMid = goldUsd.value * ozToGram * usdRate;
    const gold = {
      value: goldUsd.value,
      change: goldUsd.change,
      changePercent: goldUsd.changePercent,
      valueEgxPerGram: goldMid,
      buyEgxPerGram: goldMid * (1 + spread),
      sellEgxPerGram: goldMid * (1 - spread),
    };
    const silverMid = silverUsd.value * ozToGram * usdRate;
    const silver = {
      value: silverUsd.value,
      change: silverUsd.change,
      changePercent: silverUsd.changePercent,
      valueEgxPerGram: silverMid,
      buyEgxPerGram: silverMid * (1 + spread),
      sellEgxPerGram: silverMid * (1 - spread),
    };

    const data = {
      usdEgp,
      egx30,
      egx30Capped: egx30, // نفس بيانات EGX 30 حتى يتوفر مصدر منفصل لـ Capped
      egx70,
      egx100,
      egx33,
      egx35,
      gold,
      silver,
      lastUpdated: Date.now(),
    };

    await setCache(cacheKey, data, 300); // Cache for 5 minutes
    return data;
  } catch (error) {
    logger.error('Error fetching market overview', { error });
    return null;
  }
}

export type MarketOverview = Awaited<ReturnType<typeof getMarketOverview>>;
