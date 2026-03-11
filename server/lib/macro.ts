import { getCache, setCache } from './redis.ts';
import { logger } from './logger.ts';

const stubIndex = () => ({ value: 0, change: 0, changePercent: 0 });
const stubCommodity = () => ({ value: 0, change: 0, changePercent: 0 });

export async function getMarketOverview() {
  const cacheKey = 'market:overview';
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  try {
    let usdEgp = { value: 0, change: 0, changePercent: 0 };
    try {
      const apiKey = process.env.EXCHANGERATE_API_KEY;
      const url = apiKey
        ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`
        : 'https://api.exchangerate-api.com/v4/latest/USD';

      const exchangeResponse = await fetch(url);
      if (exchangeResponse.ok) {
        const exchangeData = await exchangeResponse.json() as { conversion_rates?: { EGP?: number }; rates?: { EGP?: number } };
        const rate = apiKey ? exchangeData.conversion_rates?.EGP : exchangeData.rates?.EGP;
        if (rate != null) {
          usdEgp = { value: rate, change: 0, changePercent: 0 };
        }
      }
    } catch (error) {
      logger.error('Error fetching exchange rate', { error });
    }

    // EGX indices and commodities — stubbed; plug in Twelve Data or another source later
    const egx30 = stubIndex();
    const egx70 = stubIndex();
    const egx100 = stubIndex();
    const egx33 = stubIndex();
    const egx35 = stubIndex();
    const goldUsd = stubCommodity();
    const silverUsd = stubCommodity();
    const ozToGram = 1 / 31.1035;
    const usdRate = usdEgp.value || 1;
    const spread = 0.02;
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
      egx30Capped: egx30,
      egx70,
      egx100,
      egx33,
      egx35,
      gold,
      silver,
      lastUpdated: Date.now(),
    };

    await setCache(cacheKey, data, 300);
    return data;
  } catch (error) {
    logger.error('Error fetching market overview', { error });
    return null;
  }
}

export type MarketOverview = Awaited<ReturnType<typeof getMarketOverview>>;
