import { prisma } from '../lib/prisma.ts';
import { getBulkPrices, getBulkPricesDelayed } from '../lib/yahoo.ts';
import { addHoldingSchema } from '../../src/lib/validations.ts';
import { getCompletedAchievementIds, addNewlyUnlockedAchievements } from '../lib/achievementCheck.ts';
import { isPro, FREE_LIMITS } from '../lib/plan.ts';
import type { AuthUser } from '../routes/types.ts';

export const PortfolioService = {
  async getPortfolio(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, planExpiresAt: true, referralProExpiresAt: true },
    });
    const delayed = user ? !isPro(user) : false;
    const holdings = await prisma.portfolio.findMany({ where: { userId } });

    const tickers = holdings.map((h) => h.ticker);
    const priceMap = new Map<string, { price: number; isDelayed?: boolean; priceTime?: string }>();
    const prices = delayed ? await getBulkPricesDelayed(tickers) : await getBulkPrices(tickers);
    if (Array.isArray(prices)) {
      prices.forEach((p: { ticker: string; price: number; isDelayed?: boolean; priceTime?: string }) =>
        priceMap.set(p.ticker, { price: p.price, ...(p.isDelayed != null && { isDelayed: p.isDelayed }), ...(p.priceTime && { priceTime: p.priceTime }) })
      );
    }

    let totalValue = 0;
    let totalCost = 0;
    const enrichedHoldings = holdings.map((holding) => {
      const currentPriceData = priceMap.get(holding.ticker);
      const currentPrice = currentPriceData?.price ?? holding.avgPrice;
      const currentValue = currentPrice * holding.shares;
      const costBasis = holding.avgPrice * holding.shares;
      const gainLoss = currentValue - costBasis;
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
      totalValue += currentValue;
      totalCost += costBasis;
      return {
        ...holding,
        currentPrice,
        currentValue,
        gainLoss,
        gainLossPercent,
        ...(currentPriceData?.isDelayed != null && { isDelayed: currentPriceData.isDelayed }),
        ...(currentPriceData?.priceTime && { priceTime: currentPriceData.priceTime }),
      };
    });

    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    return {
      holdings: enrichedHoldings,
      summary: { totalValue, totalCost, totalGainLoss, totalGainLossPercent },
    };
  },

  async addHolding(user: AuthUser, body: unknown): Promise<{ holding: Awaited<ReturnType<typeof prisma.portfolio.create>>; newUnseenAchievements: string[] }> {
    if (!user?.id) throw new Error('Unauthorized');
    const parsed = addHoldingSchema.safeParse(body);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid input');

    const planUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true, planExpiresAt: true, referralProExpiresAt: true },
    });
    if (!planUser) throw new Error('Unauthorized');
    if (!isPro(planUser)) {
      const count = await prisma.portfolio.count({ where: { userId: user.id } });
      if (count >= FREE_LIMITS.portfolioStocks) {
        const err = new Error('pro_required') as Error & { code?: string; limit?: number };
        err.code = 'PORTFOLIO_LIMIT';
        err.limit = FREE_LIMITS.portfolioStocks;
        throw err;
      }
    }

    const { ticker, shares, purchasePrice, purchaseDate } = parsed.data;
    const completedBefore = await getCompletedAchievementIds(user.id);
    const holding = await prisma.portfolio.create({
      data: {
        userId: user.id,
        ticker,
        shares,
        avgPrice: purchasePrice,
        buyDate: new Date(purchaseDate),
      },
    });
    const newUnseenAchievements = await addNewlyUnlockedAchievements(user.id, completedBefore);
    return { holding, newUnseenAchievements };
  },

  async updateHolding(userId: string, id: string, body: { shares?: number; purchasePrice?: number; purchaseDate?: string }) {
    const { shares, purchasePrice, purchaseDate } = body;
    const result = await prisma.portfolio.updateMany({
      where: { id, userId: userId },
      data: {
        ...(shares != null && { shares: parseFloat(String(shares)) }),
        ...(purchasePrice != null && { avgPrice: parseFloat(String(purchasePrice)) }),
        ...(purchaseDate != null && { buyDate: new Date(purchaseDate) }),
      },
    });
    return result.count > 0;
  },

  async deleteHolding(userId: string, id: string): Promise<boolean> {
    const result = await prisma.portfolio.deleteMany({ where: { id, userId } });
    return result.count > 0;
  },
};
