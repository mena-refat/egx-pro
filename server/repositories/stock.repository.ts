import { prisma } from '../lib/prisma.ts';
import type { GicsSector } from '@prisma/client';

export const StockRepository = {
  findTickersBySector(sector: GicsSector) {
    return prisma.stock.findMany({
      where: { sector },
      select: { ticker: true },
    });
  },

  findAllWithSector() {
    return prisma.stock.findMany({
      select: { ticker: true, sector: true },
    });
  },
};
