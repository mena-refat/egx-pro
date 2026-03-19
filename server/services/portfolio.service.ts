import { marketDataService } from './market-data/market-data.service.ts';
import { addHoldingSchema } from '../../src/lib/validations.ts';
import { getCompletedAchievementIds, addNewlyUnlockedAchievements } from '../lib/achievementCheck.ts';
import { getLimit } from '../lib/plan.ts';
import { AppError } from '../lib/errors.ts';
import { PortfolioRepository } from '../repositories/portfolio.repository.ts';
import { UserRepository } from '../repositories/user.repository.ts';
import type { AuthUser } from '../routes/types.ts';

export const PortfolioService = {
  async getPortfolio(userId: number, page?: number, limit?: number) {
    const user = await UserRepository.getPlanUser(userId);
    void user;
    const pageNum = page != null ? Math.max(1, page) : 1;
    const limitNum = limit != null ? Math.min(50, Math.max(1, limit)) : 1000;
    const usePagination = page != null && limit != null;
    const skip = usePagination ? (pageNum - 1) * limitNum : undefined;
    const take = usePagination ? limitNum : undefined;
    const [holdings, total] = await PortfolioRepository.findByUser(userId, skip, take);

    const tickers = holdings.map((h) => h.ticker);
    const priceMap = new Map<string, { price: number; isDelayed?: boolean; priceTime?: string }>();
    const quotes = await marketDataService.getQuotes(tickers);
    quotes.forEach((q, symbol) => {
      priceMap.set(symbol, { price: q.price, isDelayed: false, priceTime: new Date().toISOString().slice(11, 19) });
    });

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

  async addHolding(user: AuthUser, body: unknown): Promise<{ holding: Awaited<ReturnType<typeof PortfolioRepository.create>>; newUnseenAchievements: string[] }> {
    if (!user?.id) throw new AppError('UNAUTHORIZED', 401);
    const parsed = addHoldingSchema.safeParse(body);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400);

    const planUser = await UserRepository.getPlanUser(user.id);
    if (!planUser) throw new AppError('UNAUTHORIZED', 401);
    const portfolioLimit = getLimit(planUser, 'portfolioStocks');
    const count = await PortfolioRepository.countByUser(user.id);
    if (count >= (typeof portfolioLimit === 'number' ? portfolioLimit : 0))
      throw new AppError('PORTFOLIO_LIMIT_REACHED', 403);

    const { ticker, shares, purchasePrice, purchaseDate } = parsed.data;
    const completedBefore = await getCompletedAchievementIds(user.id);
    const holding = await PortfolioRepository.create({
      userId: user.id,
      ticker,
      shares,
      avgPrice: purchasePrice,
      buyDate: new Date(purchaseDate),
    });
    const newUnseenAchievements = await addNewlyUnlockedAchievements(user.id, completedBefore);
    return { holding, newUnseenAchievements };
  },

  async updateHolding(userId: number, id: string, body: { shares?: number; purchasePrice?: number; purchaseDate?: string }): Promise<void> {
    const { shares, purchasePrice, purchaseDate } = body;
    const result = await PortfolioRepository.updateMany(userId, id, {
      ...(shares != null && { shares: parseFloat(String(shares)) }),
      ...(purchasePrice != null && { avgPrice: parseFloat(String(purchasePrice)) }),
      ...(purchaseDate != null && { buyDate: new Date(purchaseDate) }),
    });
    if (result.count === 0) throw new AppError('NOT_FOUND', 404);
  },

  async deleteHolding(userId: number, id: string): Promise<void> {
    const result = await PortfolioRepository.deleteMany(userId, id);
    if (result.count === 0) throw new AppError('NOT_FOUND', 404);
  },
};
