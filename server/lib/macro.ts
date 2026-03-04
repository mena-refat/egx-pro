import YahooFinance from 'yahoo-finance2';
import { getCache, setCache } from './redis.ts';

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
      console.error('Error fetching exchange rate:', error);
    }

    // Fetch EGX Indices
    const indices = ['^EGX30', '^EGX70', '^EGX100'];
    const indicesData = await Promise.allSettled(
      indices.map(ticker => yahooFinance.quote(ticker))
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

    const data = {
      usdEgp,
      egx30: formatIndex(indicesData[0]),
      egx70: formatIndex(indicesData[1]),
      egx100: formatIndex(indicesData[2]),
      egx33: { value: 0, change: 0, changePercent: 0 }, // Mock
      egx35: { value: 0, change: 0, changePercent: 0 }, // Mock
      gold: { value: 0, change: 0, changePercent: 0 },  // Mock
      lastUpdated: Date.now(),
    };

    await setCache(cacheKey, data, 300); // Cache for 5 minutes
    return data;
  } catch (error) {
    console.error('Error fetching market overview:', error);
    return null;
  }
}
