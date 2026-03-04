import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.ts';
import { getStockPrice } from '../lib/yahoo.ts';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = ('user' in req && (req as { user?: { id?: string } }).user?.id);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const holdings = await prisma.portfolio.findMany({
      where: { userId }
    });

    let totalValue = 0;
    let totalCost = 0;

    const enrichedHoldings = await Promise.all(holdings.map(async (holding) => {
      const currentPriceData = await getStockPrice(holding.ticker) as { price: number } | null;
      const currentPrice = currentPriceData?.price ?? holding.avgPrice;
      const currentValue = currentPrice * holding.shares;
      const costBasis = holding.avgPrice * holding.shares;
      const gainLoss = currentValue - costBasis;
      const gainLossPercent = (gainLoss / costBasis) * 100;

      totalValue += currentValue;
      totalCost += costBasis;

      return {
        ...holding,
        currentPrice,
        currentValue,
        gainLoss,
        gainLossPercent
      };
    }));

    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    res.json({
      holdings: enrichedHoldings,
      summary: {
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercent
      }
    });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

router.post('/add', async (req: Request, res: Response) => {
  try {
    const userId = ('user' in req && (req as { user?: { id?: string } }).user?.id);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { ticker, shares, purchasePrice, purchaseDate } = req.body;

    const holding = await prisma.portfolio.create({
      data: {
        userId,
        ticker,
        shares: parseFloat(shares),
        avgPrice: parseFloat(purchasePrice),
        buyDate: new Date(purchaseDate)
      }
    });

    res.status(201).json(holding);
  } catch (error) {
    console.error('Error adding holding:', error);
    res.status(500).json({ error: 'Failed to add holding' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = ('user' in req && (req as { user?: { id?: string } }).user?.id);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { shares, purchasePrice, purchaseDate } = req.body;

    const holding = await prisma.portfolio.updateMany({
      where: { id, userId },
      data: {
        shares: parseFloat(shares),
        avgPrice: parseFloat(purchasePrice),
        buyDate: new Date(purchaseDate)
      }
    });

    if (holding.count === 0) {
      return res.status(404).json({ error: 'Holding not found or unauthorized' });
    }

    res.json({ message: 'Holding updated successfully' });
  } catch (error) {
    console.error('Error updating holding:', error);
    res.status(500).json({ error: 'Failed to update holding' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = ('user' in req && (req as { user?: { id?: string } }).user?.id);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;

    const holding = await prisma.portfolio.deleteMany({
      where: { id, userId }
    });

    if (holding.count === 0) {
      return res.status(404).json({ error: 'Holding not found or unauthorized' });
    }

    res.json({ message: 'Holding deleted successfully' });
  } catch (error) {
    console.error('Error deleting holding:', error);
    res.status(500).json({ error: 'Failed to delete holding' });
  }
});

router.get('/performance', async (req: Request, res: Response) => {
  // Simplified performance calculation for now
  res.json({ message: 'Performance calculation not yet fully implemented' });
});

export default router;
