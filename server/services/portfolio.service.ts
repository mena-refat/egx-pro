import { prisma } from '../lib/prisma.ts';
import { getBulkPrices, getBulkPricesDelayed } from '../lib/yahoo.ts';
import { addHoldingSchema } from '../../src/lib/validations.ts';
import { getCompletedAchievementIds, addNewlyUnlockedAchievements } from '../lib/achievementCheck.ts';
import { isPro, FREE_LIMITS } from '../lib/plan.ts';
import { AppError } from '../lib/errors.ts';
import type { AuthUser } from '../routes/types.ts';

export const PortfolioService = {
  async getPortfolio(userId: string, page?: number, limit?: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, planExpiresAt: true, referralProExpiresAt: true },
    });
    const delayed = user ? !isPro(user) : false;
    const where = { userId };
    const pageNum = page != null ? Math.max(1, page) : 1;
    const limitNum = limit != null ? Math.min(50, Math.max(1, limit)) : 1000;
    const skip = (pageNum - 1) * limitNum;
    const usePagination = page != null && limit != null;
    const [holdings, total] = usePagination
      ? await Promise.all([
          prisma.portfolio.findMany({ where, skip, take: limitNum, orderBy: { buyDate: 'desc' } }),
          prisma.portfolio.count({ where }),
        ])
      : [await prisma.portfolio.findMany({ where }), 0];

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

    const result: { holdings: typeof enrichedHoldings; summary: { totalValue: number; totalCost: number; totalGainLoss: number; totalGainLossPercent: number }; pagination?: { page: number; limit: number; total: number; totalPages: number } } = {
      holdings: enrichedHoldings,
      summary: { totalValue, totalCost, totalGainLoss, totalGainLossPercent },
    };
    if (usePagination) {
      result.pagination = { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) };
    }
    return result;
  },

  async addHolding(user: AuthUser, body: unknown): Promise<{ holding: Awaited<ReturnType<typeof prisma.portfolio.create>>; newUnseenAchievements: string[] }> {
    if (!user?.id) throw new AppError('UNAUTHORIZED', 401);
    const parsed = addHoldingSchema.safeParse(body);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400);

    const planUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true, planExpiresAt: true, referralProExpiresAt: true },
    });
    if (!planUser) throw new AppError('UNAUTHORIZED', 401);
    if (!isPro(planUser)) {
      const count = await prisma.portfolio.count({ where: { userId: user.id } });
      if (count >= FREE_LIMITS.portfolioStocks) throw new AppError('PORTFOLIO_LIMIT_REACHED', 403);
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

  async updateHolding(userId: string, id: string, body: { shares?: number; purchasePrice?: number; purchaseDate?: string }): Promise<void> {
    const { shares, purchasePrice, purchaseDate } = body;
    const result = await prisma.portfolio.updateMany({
      where: { id, userId },
      data: {
        ...(shares != null && { shares: parseFloat(String(shares)) }),
        ...(purchasePrice != null && { avgPrice: parseFloat(String(purchasePrice)) }),
        ...(purchaseDate != null && { buyDate: new Date(purchaseDate) }),
      },
    });
    if (result.count === 0) throw new AppError('NOT_FOUND', 404);
  },

  async deleteHolding(userId: string, id: string): Promise<void> {
    const result = await prisma.portfolio.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new AppError('NOT_FOUND', 404);
  },
};
